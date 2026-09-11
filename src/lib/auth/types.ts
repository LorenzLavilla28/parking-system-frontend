export type Role =
  | 'PlatformAdministrator'
  | 'TenantAdministrator'
  | 'Supervisor'
  | 'Guard';

export type TenantStatus = 'Active' | 'Suspended' | 'Archived' | 'Platform';

export interface AuthContext {
  tenantId: string;
  tenantName: string;
  tenantStatus: TenantStatus;
  roles: Role[];
  assignedLocationIds: string[];
  isPlatform: boolean;
}

export interface AuthUser {
  id: string;
  tenantId: string;
  tenantName: string;
  email: string;
  fullName: string;
  roles: Role[];
  assignedLocationIds: string[];
  mustChangePassword: boolean;
  /** Returned by the API for lifecycle-aware session UX. */
  tenantStatus?: TenantStatus;
  /** All active scopes this account may enter; the token represents only one. */
  availableContexts?: AuthContext[];
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}
