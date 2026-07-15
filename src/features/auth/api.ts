import { api } from '@/lib/api/client';
import type { AuthSession } from '@/lib/auth/types';
import type { LoginInput } from './schema';

export function login(input: LoginInput): Promise<AuthSession> {
  return api.post<AuthSession>('/api/auth/login', input);
}

export function logout(refreshToken: string): Promise<void> {
  return api.post<void>('/api/auth/logout', { refreshToken });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/api/auth/reset-password', { token, newPassword });
}

export function changePassword(currentPassword: string, newPassword: string): Promise<AuthSession> {
  return api.post<AuthSession>('/api/account/change-password', { currentPassword, newPassword });
}
