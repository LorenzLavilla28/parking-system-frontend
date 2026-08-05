import { describe, expect, it } from 'vitest';
import {
  getAuthorizedWorkspaces,
  getNavigationGroups,
  getWorkspaceForPath,
  isActiveNavigationItem,
} from './workspaces';

describe('workspace navigation model', () => {
  it('derives authorized workspaces from backend roles', () => {
    expect(getAuthorizedWorkspaces(['TenantAdministrator']).map((workspace) => workspace.id)).toEqual([
      'administration',
      'gate-operations',
    ]);
    expect(getAuthorizedWorkspaces(['Guard']).map((workspace) => workspace.id)).toEqual(['gate-operations']);
    expect(getAuthorizedWorkspaces(['PlatformAdministrator']).map((workspace) => workspace.id)).toEqual(['platform']);
  });

  it('resolves the active workspace from the route', () => {
    expect(getWorkspaceForPath('/admin/rate-plans/new')?.id).toBe('administration');
    expect(getWorkspaceForPath('/guard/exit')?.id).toBe('gate-operations');
    expect(getWorkspaceForPath('/platform/health')?.id).toBe('platform');
  });

  it('uses grouped workspace-specific navigation', () => {
    const admin = getWorkspaceForPath('/admin')!;
    const guard = getWorkspaceForPath('/guard')!;

    expect(getNavigationGroups(admin, ['TenantAdministrator']).flatMap((group) => group.items.map((item) => item.label))).toEqual([
      'Dashboard',
      'Locations',
      'Parking sessions',
      'Revenue & payments',
      'Users',
      'Rate plans',
      'Payment settings',
      'Branding',
      'Operations overview',
    ]);
    expect(getNavigationGroups(guard, ['Guard']).flatMap((group) => group.items.map((item) => item.label))).toEqual([
      'Vehicle entry',
      'Active sessions',
      'Exit validation',
    ]);
  });

  it('keeps nested routes highlighted under their parent navigation item', () => {
    const ratePlans = getNavigationGroups(getWorkspaceForPath('/admin')!, ['TenantAdministrator'])
      .flatMap((group) => group.items)
      .find((item) => item.label === 'Rate plans')!;

    expect(isActiveNavigationItem('/admin/rate-plans/new', ratePlans)).toBe(true);
  });
});
