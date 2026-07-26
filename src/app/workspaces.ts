import type { ComponentType } from 'react';
import {
  BarChart3,
  Building2,
  CarFront,
  ClipboardCheck,
  CircleDollarSign,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  ReceiptText,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import type { Role } from '@/lib/auth/types';

export type WorkspaceId = 'administration' | 'gate-operations' | 'platform';

export interface NavigationItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
  end?: boolean;
  requiredRoles?: Role[];
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export interface WorkspaceDefinition {
  id: WorkspaceId;
  legacyKey: 'Admin' | 'Guard' | 'Platform';
  label: string;
  contextLabel: string;
  defaultPath: string;
  pathPrefix: string;
  requiredRoles: Role[];
  icon: ComponentType<{ className?: string }>;
  navigationGroups: NavigationGroup[];
}

export const workspaces: WorkspaceDefinition[] = [
  {
    id: 'platform',
    legacyKey: 'Platform',
    label: 'Platform Console',
    contextLabel: 'Platform Console',
    defaultPath: '/platform',
    pathPrefix: '/platform',
    requiredRoles: ['PlatformAdministrator'],
    icon: Gauge,
    navigationGroups: [
      {
        label: 'Navigation',
        items: [
          { label: 'Tenants', to: '/platform', icon: Building2, end: true },
          { label: 'Health', to: '/platform/health', icon: HeartPulse },
        ],
      },
    ],
  },
  {
    id: 'administration',
    legacyKey: 'Admin',
    label: 'Administration',
    contextLabel: 'Tenant operations',
    defaultPath: '/admin',
    pathPrefix: '/admin',
    requiredRoles: ['TenantAdministrator'],
    icon: ShieldCheck,
    navigationGroups: [
      {
        label: 'Overview',
        items: [{ label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true }],
      },
      {
        label: 'Operations',
        items: [
          { label: 'Locations', to: '/admin/locations', icon: MapPin },
          { label: 'Parking sessions', to: '/admin/sessions', icon: CarFront },
          { label: 'Payments', to: '/admin/payments', icon: CircleDollarSign },
        ],
      },
      {
        label: 'Management',
        items: [
          { label: 'Users', to: '/admin/users', icon: Users },
          { label: 'Rate plans', to: '/admin/rate-plans', icon: ReceiptText },
        ],
      },
      {
        label: 'Analytics',
        items: [{ label: 'Reports', to: '/admin/reports', icon: BarChart3 }],
      },
    ],
  },
  {
    id: 'gate-operations',
    legacyKey: 'Guard',
    label: 'Gate Operations',
    contextLabel: 'Gate workflow',
    defaultPath: '/guard',
    pathPrefix: '/guard',
    requiredRoles: ['Guard', 'Supervisor', 'TenantAdministrator'],
    icon: CarFront,
    navigationGroups: [
      {
        label: 'Gate workflow',
        items: [
          { label: 'Vehicle entry', to: '/guard', icon: Ticket, end: true },
          { label: 'Active sessions', to: '/guard/sessions', icon: CarFront },
          { label: 'Exit validation', to: '/guard/exit', icon: ClipboardCheck },
        ],
      },
    ],
  },
];

export function hasWorkspaceAccess(roles: Role[] | undefined, workspace: WorkspaceDefinition) {
  if (!roles) return false;
  return roles.some((role) => workspace.requiredRoles.includes(role));
}

export function getAuthorizedWorkspaces(roles: Role[] | undefined) {
  return workspaces.filter((workspace) => hasWorkspaceAccess(roles, workspace));
}

export function getWorkspaceById(id: WorkspaceId) {
  return workspaces.find((workspace) => workspace.id === id) ?? workspaces[1];
}

export function getWorkspaceForPath(pathname: string) {
  return workspaces.find((workspace) => pathname === workspace.pathPrefix || pathname.startsWith(`${workspace.pathPrefix}/`));
}

export function getNavigationGroups(workspace: WorkspaceDefinition, roles: Role[] | undefined) {
  return workspace.navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.requiredRoles || item.requiredRoles.some((role) => roles?.includes(role))),
    }))
    .filter((group) => group.items.length > 0);
}

export function isActiveNavigationItem(pathname: string, item: NavigationItem) {
  if (item.end) return pathname === item.to;
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
