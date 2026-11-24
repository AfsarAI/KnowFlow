import { apiRequest } from './apiClient';
import { User } from '../types';

export const authService = {
  async getMe(token: string): Promise<User> {
    return apiRequest<User>('/api/auth/me', { token });
  },

  async getAuthStatus(): Promise<{ supabase_configured: boolean; auth_mode: string }> {
    return apiRequest<{ supabase_configured: boolean; auth_mode: string }>('/api/auth/status');
  },
};
