import { describe, it, expect } from 'vitest';
import { homeRouteForRoles, accessibleAreas } from './hooks';

describe('homeRouteForRoles', () => {
  it('routes platform admins to /platform', () => {
    expect(homeRouteForRoles(['PlatformAdministrator'])).toBe('/platform');
  });
  it('routes tenant admins to /admin', () => {
    expect(homeRouteForRoles(['TenantAdministrator'])).toBe('/admin');
  });
  it('routes guards and supervisors to /guard', () => {
    expect(homeRouteForRoles(['Guard'])).toBe('/guard');
    expect(homeRouteForRoles(['Supervisor'])).toBe('/guard');
  });
  it('prefers the highest-privilege role', () => {
    expect(homeRouteForRoles(['Guard', 'TenantAdministrator'])).toBe('/admin');
  });
  it('falls back to login when empty', () => {
    expect(homeRouteForRoles([])).toBe('/login');
    expect(homeRouteForRoles(undefined)).toBe('/login');
  });
});

describe('accessibleAreas', () => {
  it('gives a tenant admin both Admin and Guard', () => {
    const keys = accessibleAreas(['TenantAdministrator']).map((a) => a.key);
    expect(keys).toEqual(['Admin', 'Guard']);
  });
  it('gives a guard only Guard', () => {
    expect(accessibleAreas(['Guard']).map((a) => a.key)).toEqual(['Guard']);
  });
  it('gives a platform admin only Platform', () => {
    expect(accessibleAreas(['PlatformAdministrator']).map((a) => a.key)).toEqual(['Platform']);
  });
  it('is empty without roles', () => {
    expect(accessibleAreas(undefined)).toEqual([]);
  });
});
