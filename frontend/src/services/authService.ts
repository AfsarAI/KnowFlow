import { apiRequest } from './apiClient';
import { User, AuthResponse } from '../types';

export const authService = {
  async register(email: string, password: string, fullName?: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        password,
        full_name: fullName?.trim() || null,
      }),
    });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.trim(),
        password,
      }),
    });
  },

  async getMe(token: string): Promise<User> {
    return apiRequest<User>('/api/auth/me', { token });
  },

  async getAuthStatus(): Promise<{ supabase_configured: boolean; auth_mode: string }> {
    return apiRequest<{ supabase_configured: boolean; auth_mode: string }>('/api/auth/status');
  },
};
