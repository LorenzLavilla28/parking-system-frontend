import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { PlatformTenantsPage } from './PlatformTenantsPage';
import { platformApi, type Tenant } from './api';
import type { PagedResult } from '@/lib/api/types';

vi.mock('./api', () => ({
  SUBSCRIPTION_PLANS: ['Free', 'Starter', 'Growth', 'Enterprise'],
  TENANT_STATUSES: ['Active', 'Suspended', 'Archived'],
  platformApi: {
    listTenants: vi.fn(),
    createTenant: vi.fn(),
    changeStatus: vi.fn(),
  },
}));

const listTenants = vi.mocked(platformApi.listTenants);
const createTenant = vi.mocked(platformApi.createTenant);

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <PlatformTenantsPage />
    </QueryClientProvider>,
  );
}

function page<T>(items: T[]): PagedResult<T> {
  return {
    items,
    page: 1,
    pageSize: items.length,
    totalCount: items.length,
    totalPages: 1,
  };
}

function tenant(): Tenant {
  return {
    id: 'tenant-1',
    name: 'Acme Parking',
    slug: 'acme-parking',
    status: 'Active',
    subscriptionPlan: 'Growth',
    defaultCurrency: 'PHP',
    defaultTimezone: 'Asia/Manila',
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
  };
}

async function openWizard() {
  const user = userEvent.setup();
  renderPage();
  await user.click(await screen.findByRole('button', { name: 'New tenant' }));
  expect(screen.getByRole('dialog', { name: 'Tenant onboarding' })).toBeInTheDocument();
  return user;
}

describe('PlatformTenantsPage onboarding', () => {
  beforeEach(() => {
    listTenants.mockResolvedValue(page([]));
    createTenant.mockResolvedValue(tenant());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows field-level validation before continuing from company setup', async () => {
    const user = await openWizard();

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Enter the tenant name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a tenant slug.')).toBeInTheDocument();
    expect(createTenant).not.toHaveBeenCalled();
  });

  it('creates a tenant with first administrator and selected membership tier', async () => {
    const user = await openWizard();

    await user.type(screen.getByLabelText('Tenant name'), 'Acme Parking');
    expect(screen.getByLabelText('Slug')).toHaveValue('acme-parking');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.type(screen.getByLabelText('First name'), 'Ada');
    await user.type(screen.getByLabelText('Last name'), 'Lovelace');
    await user.type(screen.getByLabelText('Admin email'), 'Ada@Acme.test');
    await user.type(screen.getByLabelText('Temporary password'), 'StrongPass!2026');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Create tenant' }));

    await waitFor(() => {
      expect(createTenant).toHaveBeenCalledWith({
        name: 'Acme Parking',
        slug: 'acme-parking',
        subscriptionPlan: 'Growth',
        defaultCurrency: 'PHP',
        defaultTimezone: 'Asia/Manila',
        adminFirstName: 'Ada',
        adminLastName: 'Lovelace',
        adminEmail: 'ada@acme.test',
        adminPassword: 'StrongPass!2026',
      });
    });

    expect(await screen.findByRole('dialog', { name: 'Tenant created' })).toBeInTheDocument();
    expect(screen.getByText('Tenant onboarding started')).toBeInTheDocument();
    expect(screen.getByText('ada@acme.test')).toBeInTheDocument();
    expect(screen.queryByText('StrongPass!2026')).not.toBeInTheDocument();
  });
});
