import { useMutation } from '@tanstack/react-query';
import { useAuthStore, hasAnyRole } from '@/lib/auth/store';
import type { Role } from '@/lib/auth/types';
import { queryClient } from '@/lib/query/queryClient';
import { getAuthorizedWorkspaces } from '@/app/workspaces';
import * as authApi from './api';
import type { LoginInput } from './schema';

/** Reactive auth state for components. */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  return {
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session,
    hasRole: (allowed: Role[]) => hasAnyRole(session?.user.roles, allowed),
  };
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (session) => setSession(session),
  });
}

export function useLogout() {
  const session = useAuthStore((s) => s.session);
  const clear = useAuthStore((s) => s.clear);
  return useMutation({
    mutationFn: async () => {
      if (session?.refreshToken) {
        // Best-effort server-side revocation; clear locally regardless.
        await authApi.logout(session.refreshToken).catch(() => undefined);
      }
    },
    onSettled: () => {
      clear();
      queryClient.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => authApi.forgotPassword(email) });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authApi.resetPassword(token, newPassword),
  });
}

export function useChangePassword() {
  const setSession = useAuthStore((s) => s.setSession);
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authApi.changePassword(currentPassword, newPassword),
    onSuccess: (session) => setSession(session),
  });
}

/** The default landing route for a user based on their highest-privilege role. */
export function homeRouteForRoles(roles: Role[] | undefined): string {
  if (!roles || roles.length === 0) return '/login';
  if (roles.includes('PlatformAdministrator')) return '/platform';
  if (roles.includes('TenantAdministrator')) return '/admin';
  if (roles.includes('Supervisor') || roles.includes('Guard')) return '/guard';
  return '/login';
}

export interface AreaLink {
  /** Matches the `area` label passed to AppShell. */
  key: string;
  label: string;
  path: string;
}

/**
 * Staff areas the given roles may enter. A tenant admin can use both the Admin
 * and Guard areas, so the shell shows a switcher between them.
 */
export function accessibleAreas(roles: Role[] | undefined): AreaLink[] {
  return getAuthorizedWorkspaces(roles).map((workspace) => ({
    key: workspace.legacyKey,
    label: workspace.label,
    path: workspace.defaultPath,
  }));
}
