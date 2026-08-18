import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth, homeRouteForRoles } from '@/features/auth/hooks';
import type { Role } from '@/lib/auth/types';

/**
 * Gate for authenticated areas. Redirects unauthenticated users to login
 * (preserving the attempted path) and users lacking the required role to their
 * own home. Authorization is also enforced server-side — this is UX, not security.
 */
export function ProtectedRoute({ allow, children }: { allow: Role[]; children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if ((user.tenantStatus === 'Suspended' || user.tenantStatus === 'Archived') && location.pathname !== '/tenant-suspended') {
    return <Navigate to="/tenant-suspended" replace />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ from: location.pathname }} />;
  }

  const permitted = user.roles.some((r) => allow.includes(r));
  if (!permitted) {
    return <Navigate to={homeRouteForRoles(user.roles)} replace />;
  }

  return <>{children}</>;
}
