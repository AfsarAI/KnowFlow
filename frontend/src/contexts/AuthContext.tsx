import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { authService } from '../services/authService';
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
  devSignIn: (email: string, fullName: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
    try {
      const backendProfile = await authService.getMe(authToken);
      setUser(backendProfile);
    } catch (err: unknown) {
      console.warn('Backend user sync warning:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // 1. Check local development session first (if Supabase is not configured)
    const localDevSessionStr = localStorage.getItem('knowflow_dev_session');
    if (!isSupabaseConfigured && localDevSessionStr) {
      try {
        const parsed = JSON.parse(localDevSessionStr);
        if (mounted) {
          setUser(parsed.user);
          setToken(parsed.token);
          setLoading(false);
        }
        return;
      } catch {
        localStorage.removeItem('knowflow_dev_session');
      }
    }

    if (!isSupabaseConfigured) {
      if (mounted) setLoading(false);
      return;
    }

    // 2. Read initial session from Supabase client
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setSession(session);
        setSupabaseUser(session.user);
        setToken(session.access_token);
        syncBackendUser(session.access_token).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // 3. Listen to auth state transitions (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);
          setSupabaseUser(currentSession.user);
          setToken(currentSession.access_token);
          await syncBackendUser(currentSession.access_token);
        } else {
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
          setToken(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncBackendUser]);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      // Local dev helper if keys aren't added to .env yet
      await devSignIn(email, email.split('@')[0]);
      return;
    }

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authErr) {
      setLoading(false);
      setError(authErr.message);
      throw authErr;
    }

    if (data.session) {
      setSession(data.session);
      setSupabaseUser(data.user);
      setToken(data.session.access_token);
      await syncBackendUser(data.session.access_token);
    }
    setLoading(false);
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      await devSignIn(email, fullName);
      return;
    }

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

    if (data.session) {
      setSession(data.session);
      setSupabaseUser(data.user);
      setToken(data.session.access_token);
      await syncBackendUser(data.session.access_token);
    }
    setLoading(false);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are required for Google OAuth.');
      setLoading(false);
      return;
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
    localStorage.removeItem('knowflow_dev_session');

    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }

    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setToken(null);
    setLoading(false);
  };

  // Local development fallback login for testing before configuring Supabase keys
  const devSignIn = async (email: string, fullName: string) => {
    const devUserId = 'a0000000-0000-0000-0000-000000000001';
    const devUser: User = {
      id: devUserId,
      email,
      full_name: fullName || 'KnowFlow User',
      auth_provider: 'email',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    // Minimal dev token
    const devToken = 'dev-local-token';

    localStorage.setItem(
      'knowflow_dev_session',
      JSON.stringify({ user: devUser, token: devToken })
    );

    setUser(devUser);
    setToken(devToken);
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
        devSignIn,
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
