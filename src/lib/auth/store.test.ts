import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, authToken, hasAnyRole } from './store';
import type { AuthSession } from './types';

function session(roles: AuthSession['user']['roles']): AuthSession {
  return {
    accessToken: 'access-1',
    accessTokenExpiresAt: '2026-06-23T10:15:00Z',
    refreshToken: 'refresh-1',
    refreshTokenExpiresAt: '2026-07-07T10:00:00Z',
    user: {
      id: 'u1',
      tenantId: 't1',
      tenantName: 'Demo Parking Group',
      email: 'a@demo.local',
      fullName: 'A B',
      roles,
      assignedLocationIds: [],
      mustChangePassword: false,
    },
  };
}

describe('auth store', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('stores and clears a session', () => {
    useAuthStore.getState().setSession(session(['TenantAdministrator']));
    expect(authToken()).toBe('access-1');
    expect(useAuthStore.getState().session?.user.email).toBe('a@demo.local');

    useAuthStore.getState().clear();
    expect(authToken()).toBeNull();
  });

  it('updates tokens while keeping the user', () => {
    useAuthStore.getState().setSession(session(['Guard']));
    useAuthStore.getState().updateTokens({
      accessToken: 'access-2',
      accessTokenExpiresAt: 'x',
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: 'y',
    });
    expect(authToken()).toBe('access-2');
    expect(useAuthStore.getState().session?.user.roles).toContain('Guard');
  });

  it('updateTokens is a no-op without a session', () => {
    useAuthStore.getState().updateTokens({
      accessToken: 'x',
      accessTokenExpiresAt: 'x',
      refreshToken: 'x',
      refreshTokenExpiresAt: 'x',
    });
    expect(useAuthStore.getState().session).toBeNull();
  });
});

describe('hasAnyRole', () => {
  it('matches when a role overlaps', () => {
    expect(hasAnyRole(['Guard'], ['Supervisor', 'Guard'])).toBe(true);
  });
  it('is false otherwise', () => {
    expect(hasAnyRole(['Guard'], ['TenantAdministrator'])).toBe(false);
    expect(hasAnyRole(undefined, ['Guard'])).toBe(false);
  });
});
