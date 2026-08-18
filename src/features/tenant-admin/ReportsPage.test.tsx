import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { adminApi, type DashboardReport, type OperationsSummary } from './api';
import { ReportsPage } from './ReportsPage';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getDashboardReport: vi.fn(),
      getOperationsSummary: vi.fn(),
      sendOperationsSummaryEmail: vi.fn(),
      getOperationsSummarySettings: vi.fn(),
      updateOperationsSummarySettings: vi.fn(),
      listLocations: vi.fn(),
      listSessions: vi.fn(),
    },
  };
});

const getDashboardReport = vi.mocked(adminApi.getDashboardReport);
const getOperationsSummary = vi.mocked(adminApi.getOperationsSummary);
const getOperationsSummarySettings = vi.mocked(adminApi.getOperationsSummarySettings);
const updateOperationsSummarySettings = vi.mocked(adminApi.updateOperationsSummarySettings);
const listLocations = vi.mocked(adminApi.listLocations);
const listSessions = vi.mocked(adminApi.listSessions);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ReportsPage /></MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ReportsPage operations overview', () => {
  beforeEach(() => {
    getDashboardReport.mockResolvedValue(report());
    getOperationsSummary.mockResolvedValue(operations());
    getOperationsSummarySettings.mockResolvedValue({ enabled: true, intervalHours: 3 });
    updateOperationsSummarySettings.mockImplementation(async (settings) => settings);
    listLocations.mockResolvedValue({
      items: [{
        id: 'location-1', tenantId: 'tenant-1', name: 'Downtown Garage', slug: 'downtown', address: null,
        timezone: 'Asia/Manila', status: 'Active', allowCashPayment: true, slotCapacity: 50, publicQrCodeUrl: null,
        createdAt: '2026-08-01T00:00:00Z', updatedAt: '2026-08-01T00:00:00Z',
      }],
      page: 1, pageSize: 200, totalCount: 1, totalPages: 1,
    });
    listSessions.mockResolvedValue({
      items: [{
        id: 'session-1', parkingLocationId: 'location-1', locationName: 'Downtown Garage', plateNumberRaw: 'NCR 1234',
        vehicleType: 'Car', notes: null, entryTime: '2026-08-05T09:00:00Z', status: 'OverstayDue',
        pricingAvailable: true, currency: 'PHP', currentFee: 180, outstanding: 180, finalFee: null,
        totalPaid: 0, paidExitDeadline: '2026-08-05T12:00:00Z',
      }],
      page: 1, pageSize: 8, totalCount: 1, totalPages: 1,
    });
  });

  it('prioritizes attention, live activity, and business performance', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Parking Operations' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Live operations' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Performance period' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Needs attention' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Review' }).some((link) => link.getAttribute('href') === '/admin/sessions?attention=over-grace')).toBe(true);
    expect(screen.getByRole('heading', { name: 'Active parking sessions' })).toBeInTheDocument();
    expect(screen.getAllByText('NCR 1234')).toHaveLength(3);
    expect(screen.getByText('Outstanding overstay balance')).toBeInTheDocument();
    expect(screen.getAllByText('Payment success rate').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('20 / 50 occupied · 40%')).toBeInTheDocument();
    expect(screen.getByText(/360\.00/)).toBeInTheDocument();
    expect(screen.getAllByText('₱180.00')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: 'Business performance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Every 3 hours' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send digest/ })).toBeInTheDocument();
  });

  it('passes the selected location and period to the report and live-session APIs', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findAllByText('NCR 1234');

    await user.selectOptions(screen.getByLabelText('Location'), 'location-1');
    await user.selectOptions(screen.getByLabelText('Performance period'), '90');

    await waitFor(() => expect(getDashboardReport).toHaveBeenLastCalledWith(90, {
      locationId: 'location-1',
      from: undefined,
      to: undefined,
    }));
    await waitFor(() => expect(listSessions).toHaveBeenLastCalledWith({
      activeOnly: true,
      locationId: 'location-1',
      pageSize: 8,
    }));
  });

  it('saves a tenant-specific automatic digest schedule', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Every 3 hours' }));
    expect(screen.getByRole('dialog', { name: 'Automatic operations digest' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Digest interval in hours'), '6');
    await user.click(screen.getByRole('switch', { name: 'Automatic operations digest' }));
    expect(screen.queryByLabelText('Digest interval in hours')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(updateOperationsSummarySettings).toHaveBeenCalledWith({
      enabled: false,
      intervalHours: 6,
    }));
    expect(await screen.findByText('Automatic digest schedule updated.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Digest paused' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Automatic operations digest' })).not.toBeInTheDocument();
  });
});

function report(): DashboardReport {
  return {
    periodStart: '2026-08-05T00:00:00Z',
    periodEnd: '2026-08-06T00:00:00Z',
    summary: {
      activeSessions: 20,
      paidAwaitingExit: 3,
      unpaidSessions: 4,
      overGraceSessions: 2,
      overGraceAmount: 360,
      todayEntries: 42,
      todayExits: 31,
      todayRevenue: 12450,
      currency: 'PHP',
      periodEntries: 42,
      periodExits: 31,
      periodRevenue: 12450,
      averageDurationMinutes: 152,
      previousPeriodRevenue: 11000,
      supervisorOverrides: 2,
      overrideCashRevenue: 600,
      overrideCashPaymentCount: 1,
    },
    revenue: [
      { date: '2026-08-05T00:00:00Z', amount: 12450, paymentCount: 39 },
    ],
    paymentMix: [
      { key: 'paymongo', label: 'PayMongo', amount: 10000, count: 32 },
      { key: 'cash', label: 'Cash', amount: 2450, count: 7 },
      { key: 'complimentary', label: 'Complimentary', amount: 0, count: 1 },
      { key: 'failed', label: 'Failed', amount: 300, count: 1 },
      { key: 'pending', label: 'Pending', amount: 420, count: 3 },
    ],
  };
}

function operations(): OperationsSummary {
  return {
    tenantId: 'tenant-1', tenantName: 'Demo Parking', currency: 'PHP', timeZone: 'Asia/Manila',
    periodStart: '2026-08-04T12:00:00Z', periodEnd: '2026-08-05T12:00:00Z', generatedAt: '2026-08-05T12:00:00Z',
    sessionEntries: 42, sessionExits: 31, activeSessions: 20, revenue: 12450, overstays: 2,
    pendingPayments: 3, pendingAmount: 420, failedPayments: 1, failedAmount: 300, failedWebhooks: 1,
    paymentBreakdown: [], attention: [],
  };
}
