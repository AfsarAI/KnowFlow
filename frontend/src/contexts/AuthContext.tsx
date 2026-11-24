import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
import { isValidToken } from '../services/apiClient';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'knowflow_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Synchronize authenticated session with FastAPI backend (/api/auth/me)
  const syncBackendUser = useCallback(async (authToken: string) => {
    if (!isValidToken(authToken)) return;
    try {
      const backendProfile = await authService.getMe(authToken);
      setUser(backendProfile);
    } catch (err: unknown) {
      console.warn('Backend user profile fetch warning:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Purge any legacy dummy/mock development tokens permanently
    localStorage.removeItem('knowflow_dev_session');

    // 1. Check Supabase session first if Supabase is configured
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
        if (!mounted) return;
        if (sbSession && isValidToken(sbSession.access_token)) {
          setSession(sbSession);
          setSupabaseUser(sbSession.user);
          setToken(sbSession.access_token);
          syncBackendUser(sbSession.access_token).finally(() => {
            if (mounted) setLoading(false);
          });
          return;
        }

        // If no active Supabase session, check local authenticated session
        checkLocalAuthSession();
      }).catch(() => {
        if (mounted) checkLocalAuthSession();
      });

      // Listen to Supabase auth state transitions
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, currentSession) => {
          if (!mounted) return;

          if (currentSession && isValidToken(currentSession.access_token)) {
            setSession(currentSession);
            setSupabaseUser(currentSession.user);
            setToken(currentSession.access_token);
            await syncBackendUser(currentSession.access_token);
          } else if (!currentSession) {
            // Check if local auth session exists before wiping
            const localStr = localStorage.getItem(AUTH_STORAGE_KEY);
            if (!localStr) {
              setSession(null);
              setSupabaseUser(null);
              setUser(null);
              setToken(null);
            }
          }
          setLoading(false);
        }
      );

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      checkLocalAuthSession();
    }

    function checkLocalAuthSession() {
      const localStr = localStorage.getItem(AUTH_STORAGE_KEY);
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          if (parsed.token && isValidToken(parsed.token)) {
            setToken(parsed.token);
            setUser(parsed.user);

            // Verify with backend
            authService.getMe(parsed.token).then((profile) => {
              if (mounted) {
                setUser(profile);
                setLoading(false);
              }
            }).catch(() => {
              // Token expired or invalid on backend: purge session
              localStorage.removeItem(AUTH_STORAGE_KEY);
              if (mounted) {
                setUser(null);
                setToken(null);
                setLoading(false);
              }
            });
            return;
          }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }

      if (mounted) {
        setUser(null);
        setToken(null);
        setLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, [syncBackendUser]);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    // If Supabase is configured, try Supabase Authentication first
    if (isSupabaseConfigured) {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!authErr && data.session && isValidToken(data.session.access_token)) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setToken(data.session.access_token);
        await syncBackendUser(data.session.access_token);
        setLoading(false);
        return;
      }
    }

    // Authenticate with verified backend credentials
    try {
      const res = await authService.login(email, password);
      if (!isValidToken(res.access_token)) {
        throw new Error('Received invalid authentication token format from server.');
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: res.user, token: res.access_token })
      );

      setUser(res.user);
      setToken(res.access_token);
      setSession(null);
      setSupabaseUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }

    setLoading(false);
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    setError(null);

    // If Supabase is configured, register with Supabase Auth
    if (isSupabaseConfigured) {
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authErr) {
        setLoading(false);
        setError(authErr.message);
        throw authErr;
      }

      if (data.session && isValidToken(data.session.access_token)) {
        setSession(data.session);
        setSupabaseUser(data.user);
        setToken(data.session.access_token);
        await syncBackendUser(data.session.access_token);
        setLoading(false);
        return;
      }
    }

    // Register with verified backend PostgreSQL database
    try {
      const res = await authService.register(email, password, fullName);
      if (!isValidToken(res.access_token)) {
        throw new Error('Received invalid authentication token format from server.');
      }

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: res.user, token: res.access_token })
      );

      setUser(res.user);
      setToken(res.access_token);
      setSession(null);
      setSupabaseUser(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }

    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      const msg = 'Google OAuth requires Supabase authentication credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) to be configured in your environment.';
      setError(msg);
      setLoading(false);
      throw new Error(msg);
    }

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
      throw oauthError;
    }
  };

  const signOut = async () => {
    setLoading(true);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem('knowflow_dev_session');

    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }

    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setToken(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        token,
        loading,
        error,
        isConfigured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
