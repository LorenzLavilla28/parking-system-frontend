import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AppShell } from './layouts/AppShell';
import { ProtectedRoute } from './ProtectedRoute';
import { NotFoundPage } from './NotFoundPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/ChangePasswordPage';

// Lazily-loaded pages: each area ships as its own chunk, keeping the public
// customer bundle lean for slow mobile connections.
const LocationLookupPage = lazy(() => import('@/features/public/LocationLookupPage').then((m) => ({ default: m.LocationLookupPage })));
const SessionPage = lazy(() => import('@/features/public/SessionPage').then((m) => ({ default: m.SessionPage })));
const PaymentStatusPage = lazy(() => import('@/features/public/PaymentStatusPage').then((m) => ({ default: m.PaymentStatusPage })));

const DashboardPage = lazy(() => import('@/features/tenant-admin/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const LocationsPage = lazy(() => import('@/features/tenant-admin/LocationsPage').then((m) => ({ default: m.LocationsPage })));
const UsersPage = lazy(() => import('@/features/tenant-admin/UsersPage').then((m) => ({ default: m.UsersPage })));
const RatePlansPage = lazy(() => import('@/features/tenant-admin/RatePlansPage').then((m) => ({ default: m.RatePlansPage })));
const RatePlanBuilderPage = lazy(() => import('@/features/tenant-admin/RatePlanBuilderPage').then((m) => ({ default: m.RatePlanBuilderPage })));
const AdminSessionsPage = lazy(() => import('@/features/tenant-admin/AdminSessionsPage').then((m) => ({ default: m.AdminSessionsPage })));
const PaymentsPage = lazy(() => import('@/features/tenant-admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ReportsPage = lazy(() => import('@/features/tenant-admin/ReportsPage').then((m) => ({ default: m.ReportsPage })));

const GuardEntryPage = lazy(() => import('@/features/guard/GuardEntryPage').then((m) => ({ default: m.GuardEntryPage })));
const GuardSessionsPage = lazy(() => import('@/features/guard/GuardSessionsPage').then((m) => ({ default: m.GuardSessionsPage })));
const GuardExitPage = lazy(() => import('@/features/guard/GuardExitPage').then((m) => ({ default: m.GuardExitPage })));

const PlatformTenantsPage = lazy(() => import('@/features/platform-admin/PlatformTenantsPage').then((m) => ({ default: m.PlatformTenantsPage })));
const PlatformHealthPage = lazy(() => import('@/features/platform-admin/PlatformHealthPage').then((m) => ({ default: m.PlatformHealthPage })));

export const router = createBrowserRouter([
  { index: true, element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    path: '/change-password',
    element: (
      <ProtectedRoute allow={['PlatformAdministrator', 'TenantAdministrator', 'Supervisor', 'Guard']}>
        <ChangePasswordPage />
      </ProtectedRoute>
    ),
  },

  // Public customer pages.
  {
    element: <PublicLayout />,
    children: [
      { path: '/location/:slug', element: <LocationLookupPage /> },
      { path: '/p/:token', element: <SessionPage /> },
      { path: '/payment/:reference/status', element: <PaymentStatusPage /> },
    ],
  },

  // Tenant administration.
  {
    path: '/admin',
    element: (
      <ProtectedRoute allow={['TenantAdministrator']}>
        <AppShell workspaceId="administration" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'locations', element: <LocationsPage /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'rate-plans', element: <RatePlansPage /> },
      { path: 'rate-plans/new', element: <RatePlanBuilderPage /> },
      { path: 'rate-plans/:id/edit', element: <RatePlanBuilderPage /> },
      { path: 'sessions', element: <AdminSessionsPage /> },
      { path: 'payments', element: <PaymentsPage /> },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
    ],
  },

  // Guard interface.
  {
    path: '/guard',
    element: (
      <ProtectedRoute allow={['Guard', 'Supervisor', 'TenantAdministrator']}>
        <AppShell workspaceId="gate-operations" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <GuardEntryPage /> },
      { path: 'sessions', element: <GuardSessionsPage /> },
      { path: 'exit', element: <GuardExitPage /> },
    ],
  },

  // Platform administration.
  {
    path: '/platform',
    element: (
      <ProtectedRoute allow={['PlatformAdministrator']}>
        <AppShell workspaceId="platform" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <PlatformTenantsPage /> },
      { path: 'health', element: <PlatformHealthPage /> },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]);
