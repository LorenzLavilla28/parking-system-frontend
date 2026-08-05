import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi } from './api';
import { PaymentsPage } from './PaymentsPage';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      listPayments: vi.fn(),
      listPaymentOverrides: vi.fn(),
      getPayment: vi.fn(),
      exportPayments: vi.fn(),
    },
  };
});

const listPayments = vi.mocked(adminApi.listPayments);
const listPaymentOverrides = vi.mocked(adminApi.listPaymentOverrides);

describe('PaymentsPage financial activity', () => {
  beforeEach(() => {
    listPayments.mockResolvedValue({ items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 0 });
    listPaymentOverrides.mockResolvedValue([{
      id: 'override-1',
      parkingSessionId: 'session-1',
      parkingLocationId: 'location-1',
      locationName: 'Downtown Garage',
      plateNumberRaw: 'OVR 123',
      action: 'OutstandingWaived',
      label: 'Outstanding balance waived',
      reason: 'Customer service recovery',
      performedBy: 'Ada Admin',
      createdAt: '2026-08-05T12:00:00Z',
      feeOverride: 0,
      finalFee: null,
      totalPaid: 0,
    }]);
  });

  it('shows supervisor adjustments separately and explains the cancelled-attempt default', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><PaymentsPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Supervisor adjustment activity' })).toBeInTheDocument();
    expect(await screen.findByText('Outstanding balance waived')).toBeInTheDocument();
    expect(screen.getByText('Customer service recovery')).toBeInTheDocument();
    expect(screen.getByText(/Cancelled or abandoned PayMongo checkouts are hidden by default/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cancelled / abandoned' })).toHaveValue('Cancelled');
  });
});
