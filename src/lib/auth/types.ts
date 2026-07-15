export type Role =
  | 'PlatformAdministrator'
  | 'TenantAdministrator'
  | 'Supervisor'
  | 'Guard';

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  roles: Role[];
  assignedLocationIds: string[];
  mustChangePassword: boolean;
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: AuthUser;
}
