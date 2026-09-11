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

  it('derives both workspaces from scoped contexts for a dual-access account', () => {
    expect(getAuthorizedWorkspaces(undefined, [
      {
        tenantId: 'tenant-1',
        tenantName: 'Acme Parking',
        tenantStatus: 'Active',
        roles: ['TenantAdministrator'],
        assignedLocationIds: [],
        isPlatform: false,
      },
      {
        tenantId: '00000000-0000-0000-0000-000000000000',
        tenantName: 'Platform',
        tenantStatus: 'Platform',
        roles: ['PlatformAdministrator'],
        assignedLocationIds: [],
        isPlatform: true,
      },
    ]).map((workspace) => workspace.id)).toEqual(['platform', 'administration', 'gate-operations']);
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
      'Corporate benefits',
      'Payment settings',
      'Branding',
      'Operations overview',
    ]);
    expect(getNavigationGroups(guard, ['Guard']).flatMap((group) => group.items.map((item) => item.label))).toEqual([
      'Vehicle entry',
      'Active sessions',
      'Exit validation',
      'Printer setup',
    ]);

    const platform = getWorkspaceForPath('/platform')!;
    expect(getNavigationGroups(platform, ['PlatformAdministrator']).flatMap((group) => group.items.map((item) => item.label))).toEqual([
      'Tenants',
      'Platform admins',
      'Health',
    ]);
  });

  it('keeps nested routes highlighted under their parent navigation item', () => {
    const ratePlans = getNavigationGroups(getWorkspaceForPath('/admin')!, ['TenantAdministrator'])
      .flatMap((group) => group.items)
      .find((item) => item.label === 'Rate plans')!;

    expect(isActiveNavigationItem('/admin/rate-plans/new', ratePlans)).toBe(true);
  });
});
