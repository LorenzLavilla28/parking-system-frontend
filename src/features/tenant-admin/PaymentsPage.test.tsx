import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
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

  it('keeps supervisor adjustments out of the payment table and links to their history', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><PaymentsPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: '1 recent adjustments · View adjustment history' })).toHaveAttribute('href', '/admin/sessions/adjustments');
    expect(screen.queryByRole('heading', { name: 'Supervisor adjustment activity' })).not.toBeInTheDocument();
    expect(screen.queryByText('Outstanding balance waived')).not.toBeInTheDocument();
    expect(screen.queryByText('Customer service recovery')).not.toBeInTheDocument();
    expect(screen.getByTitle('Override cash qualifies when a cash payment is recorded while a supervisor-approved exit override is applied.')).toBeInTheDocument();
    expect(screen.getByText('Show override cash only')).toBeInTheDocument();
    expect(screen.getAllByText('Quick dates')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'All reconciliation states' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Provider mismatch' })).toHaveValue('provider-mismatch');
    expect(screen.getByRole('option', { name: 'Cancelled / abandoned' })).toHaveValue('Cancelled');
  });

  it('does not repeat a provider when it matches the payment method', async () => {
    listPayments.mockResolvedValue({
      items: [{
        id: 'payment-1',
        parkingSessionId: 'session-1',
        parkingLocationId: 'location-1',
        locationName: 'Downtown Garage',
        plateNumberRaw: 'ABC 1234',
        status: 'Paid',
        provider: 'Cash',
        paymentMethod: 'cash',
        amount: 50,
        currency: 'PHP',
        createdAt: '2026-08-05T12:00:00Z',
        paidAt: '2026-08-05T12:00:00Z',
        receiptNumber: 'RCPT-1',
        providerCheckoutSessionId: null,
        providerPaymentId: null,
        customerEmail: null,
        recordedByGuardId: 'guard-1',
        sessionStatus: 'OverstayDue',
        entryTime: '2026-08-05T10:00:00Z',
        exitTime: '2026-08-05T12:00:00Z',
        finalFee: 50,
        totalPaid: 50,
        paidExitDeadline: null,
        currentOutstanding: 20,
        isOverrideRelated: true,
        overrideLabel: 'Cash collected during override',
      }],
      page: 1,
      pageSize: 25,
      totalCount: 1,
      totalPages: 1,
    });
    listPaymentOverrides.mockResolvedValue([]);

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><PaymentsPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findAllByText('Override cash')).toHaveLength(2);
    const methodCells = screen.getAllByRole('cell', { name: /Cash Override cash/ });
    expect(methodCells).toHaveLength(2);
    expect(methodCells.every((cell) => !cell.textContent?.includes('CashCash'))).toBe(true);
    expect(screen.getByText('Balance due')).toBeInTheDocument();
    expect(screen.getByText('₱20.00')).toBeInTheDocument();
    expect(screen.getByText('Overstay')).toBeInTheDocument();
    expect(screen.getAllByText('Needs review').length).toBeGreaterThanOrEqual(2);
  });

  it('allows the date picker to close without selecting or clearing a range', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter><PaymentsPage /></MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click((await screen.findAllByRole('button', { name: 'Open date range picker' }))[0]);
    expect(screen.getAllByText('Select a start date')).toHaveLength(2);
    fireEvent.click(screen.getAllByTitle('Close date range picker')[0]);
    expect(screen.queryAllByText('Select a start date')).toHaveLength(0);
    expect(screen.getAllByText('dd/mm/yyyy – dd/mm/yyyy')).toHaveLength(2);
  });
});
