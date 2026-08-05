import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppProviders } from '@/app/providers';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { AppShell } from './AppShell';
import { useAuthStore } from '@/lib/auth/store';
import type { AuthSession, Role } from '@/lib/auth/types';

vi.mock('@/features/guard/api', () => ({
  guardApi: {
    locations: vi.fn(async () => [
      {
        id: 'location-1',
        name: 'Demo Mall Parking',
        slug: 'demo-mall',
        timezone: 'Asia/Manila',
        allowCashPayment: true,
      },
    ]),
  },
}));

vi.mock('@/features/tenant-branding/api', () => ({
  getCurrentTenantLogo: vi.fn(async () => null),
}));

function session(roles: Role[]): AuthSession {
  return {
    accessToken: 'access-token',
    accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
    refreshToken: 'refresh-token',
    refreshTokenExpiresAt: new Date(Date.now() + 120_000).toISOString(),
    user: {
      id: 'user-1',
      tenantId: 'tenant-1',
      tenantName: 'Demo Parking Group',
      email: 'demo@example.test',
      fullName: 'Demo User',
      roles,
      assignedLocationIds: [],
      mustChangePassword: false,
    },
  };
}

function renderShell(initialPath: string, roles: Role[]) {
  act(() => {
    useAuthStore.getState().setSession(session(roles));
  });

  const router = createMemoryRouter(
    [
      { path: '/login', element: <h1>Login</h1> },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allow={['TenantAdministrator']}>
            <AppShell workspaceId="administration" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <h1>Admin home</h1> },
          { path: 'rate-plans', element: <h1>Rate plans page</h1> },
          { path: 'rate-plans/new', element: <h1>New rate plan</h1> },
        ],
      },
      {
        path: '/guard',
        element: (
          <ProtectedRoute allow={['Guard', 'Supervisor', 'TenantAdministrator']}>
            <AppShell workspaceId="gate-operations" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <h1>Guard home</h1> },
          { path: 'exit', element: <h1>Exit validation page</h1> },
        ],
      },
      {
        path: '/platform',
        element: (
          <ProtectedRoute allow={['PlatformAdministrator']}>
            <AppShell workspaceId="platform" />
          </ProtectedRoute>
        ),
        children: [{ index: true, element: <h1>Platform home</h1> }],
      },
    ],
    { initialEntries: [initialPath] },
  );

  return render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  );
}

describe('AppShell workspace navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useAuthStore.getState().clear();
    });
  });

  afterEach(() => {
    act(() => {
      useAuthStore.getState().clear();
    });
    localStorage.clear();
  });

  it('shows an authorized tenant admin the workspace switcher and admin navigation', async () => {
    renderShell('/admin', ['TenantAdministrator']);

    expect(await screen.findByRole('heading', { name: 'Admin home' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Administration' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rate plans' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Operations overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demo Parking Group home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'PBP Parking home' })).not.toBeInTheDocument();
  });

  it('shows guard-only users the simple gate workflow without a workspace switcher', async () => {
    const user = userEvent.setup();
    renderShell('/guard', ['Guard']);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = await screen.findByRole('dialog', { name: 'Application navigation' });

    expect(within(drawer).getAllByText('Gate Operations').length).toBeGreaterThan(0);
    expect(within(drawer).queryByRole('button', { name: 'Gate Operations' })).not.toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Vehicle entry' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Active sessions' })).toBeInTheDocument();
    expect(within(drawer).getByRole('link', { name: 'Exit validation' })).toBeInTheDocument();
    expect(within(drawer).queryByText('Rate plans')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('Users')).not.toBeInTheDocument();
  });

  it('gives platform administrators a single console hierarchy with the account in the sidebar', async () => {
    renderShell('/platform', ['PlatformAdministrator']);

    expect(await screen.findByRole('heading', { name: 'Platform home' })).toBeInTheDocument();
    expect(screen.getAllByText('Platform Console').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Platform Console' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Demo User/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument();
  });

  it('lets authorized users switch workspaces from the mobile drawer and returns focus', async () => {
    const user = userEvent.setup();
    renderShell('/admin', ['TenantAdministrator']);

    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    await user.click(menuButton);
    let drawer = await screen.findByRole('dialog', { name: 'Application navigation' });

    await user.click(within(drawer).getByRole('button', { name: 'Administration' }));
    await user.click(within(drawer).getByRole('menuitemradio', { name: 'Gate Operations' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Application navigation' })).not.toBeInTheDocument());
    expect(await screen.findByRole('heading', { name: 'Guard home' })).toBeInTheDocument();
    await waitFor(() => expect(menuButton).toHaveFocus());

    await user.click(menuButton);
    drawer = await screen.findByRole('dialog', { name: 'Application navigation' });
    await user.click(within(drawer).getByRole('button', { name: 'Gate Operations' }));
    await user.click(within(drawer).getByRole('menuitemradio', { name: 'Administration' }));

    expect(await screen.findByRole('heading', { name: 'Admin home' })).toBeInTheDocument();
  });

  it('keeps route-derived workspace state synchronized on direct URLs', async () => {
    renderShell('/guard/exit', ['TenantAdministrator']);

    expect(await screen.findByRole('heading', { name: 'Exit validation page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gate Operations' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Exit validation' })).toHaveAttribute('aria-current', 'page');
  });

  it('redirects unauthorized workspace routes to the user home route', async () => {
    renderShell('/admin', ['Guard']);

    expect(await screen.findByRole('heading', { name: 'Guard home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Rate plans' })).not.toBeInTheDocument();
  });

  it('restores collapsed sidebar preference and keeps icon navigation accessible', async () => {
    localStorage.setItem('parkingsaas.shell.sidebarCollapsed.v1', 'true');
    renderShell('/admin/rate-plans/new', ['TenantAdministrator']);

    expect(await screen.findByRole('heading', { name: 'New rate plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Rate plans' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Rate plans' })).toHaveAttribute('title', 'Rate plans');
  });
});
