import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthSession, AuthUser, Role } from './types';

interface AuthState {
  session: AuthSession | null;
  setSession: (session: AuthSession) => void;
  /** Updates just the tokens after a refresh, keeping the current user. */
  updateTokens: (tokens: Pick<AuthSession, 'accessToken' | 'accessTokenExpiresAt' | 'refreshToken' | 'refreshTokenExpiresAt'>) => void;
  clear: () => void;
}

/**
 * Auth store. Tokens are persisted to localStorage so a reload keeps the user
 * signed in. Only auth tokens live here — never payment or provider secrets.
 * Used both inside React (hooks) and outside (the Axios interceptor).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      setSession: (session) => set({ session }),
      updateTokens: (tokens) => {
        const current = get().session;
        if (!current) return;
        set({ session: { ...current, ...tokens } });
      },
      clear: () => set({ session: null }),
    }),
    { name: 'parkingsaas.auth' },
  ),
);

// Non-React helpers for the Axios layer.
export const authToken = () => useAuthStore.getState().session?.accessToken ?? null;
export const refreshToken = () => useAuthStore.getState().session?.refreshToken ?? null;

export function currentUser(): AuthUser | null {
  return useAuthStore.getState().session?.user ?? null;
}

export function hasAnyRole(roles: Role[] | undefined, allowed: Role[]): boolean {
  if (!roles) return false;
  return roles.some((r) => allowed.includes(r));
}
