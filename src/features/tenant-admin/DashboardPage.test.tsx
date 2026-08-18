import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardPage } from './DashboardPage';
import { adminApi, type DashboardReport, type Location } from './api';
import { useAuthStore } from '@/lib/auth/store';
import type { PagedResult } from '@/lib/api/types';
import type { SessionSummary } from '@/features/guard/api';

vi.mock('./api', () => ({
  adminApi: {
    listSessions: vi.fn(),
    listLocations: vi.fn(),
    getDashboardReport: vi.fn(),
  },
}));

const listSessions = vi.mocked(adminApi.listSessions);
const listLocations = vi.mocked(adminApi.listLocations);
const getDashboardReport = vi.mocked(adminApi.getDashboardReport);

function renderDashboard() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
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

function session(overrides: Partial<SessionSummary>): SessionSummary {
  return {
    id: overrides.id ?? `session-${overrides.plateNumberRaw ?? 'plate'}`,
    parkingLocationId: 'location-1',
    plateNumberRaw: 'ABC 123',
    vehicleType: 'Car',
    notes: null,
    entryTime: '2026-06-23T10:00:00.000Z',
    status: 'ActiveUnpaid',
    pricingAvailable: true,
    currency: 'PHP',
    currentFee: 0,
    outstanding: 0,
    finalFee: null,
    totalPaid: 0,
    paidExitDeadline: null,
    ...overrides,
  };
}

function location(overrides: Partial<Location> = {}): Location {
  return {
    id: 'location-1',
    tenantId: 'tenant-1',
    name: 'Demo Mall Parking',
    slug: 'demo-mall',
    address: null,
    timezone: 'Asia/Manila',
    status: 'Active',
    allowCashPayment: true,
    publicQrCodeUrl: null,
    createdAt: '2026-06-23T10:00:00.000Z',
    updatedAt: '2026-06-23T10:00:00.000Z',
    ...overrides,
  };
}

describe('DashboardPage', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
    listSessions.mockResolvedValue(page([
      session({ id: 'unpaid-1', plateNumberRaw: 'ABC 123', status: 'ActiveUnpaid' }),
      session({ id: 'pending-1', plateNumberRaw: 'DEF 456', status: 'PaymentPending' }),
      session({ id: 'overstay-1', plateNumberRaw: 'GHI 789', status: 'OverstayDue' }),
      session({ id: 'paid-1', plateNumberRaw: 'JKL 246', status: 'PaidExitWindow', totalPaid: 70 }),
    ]));
    listLocations.mockResolvedValue(page([location()]));
    getDashboardReport.mockResolvedValue({
      periodStart: '2026-06-17T00:00:00.000Z',
      periodEnd: '2026-06-24T00:00:00.000Z',
      summary: {
        activeSessions: 4,
        paidAwaitingExit: 1,
        unpaidSessions: 2,
        overGraceSessions: 1,
        overGraceAmount: 180,
        todayEntries: 4,
        todayExits: 1,
        todayRevenue: 70,
        currency: 'PHP',
        periodEntries: 18,
        periodExits: 14,
        periodRevenue: 6400,
        averageDurationMinutes: 132,
        previousPeriodRevenue: 5900,
        supervisorOverrides: 0,
        overrideCashRevenue: 0,
        overrideCashPaymentCount: 0,
        maximumCapacity: 50,
      },
      revenue: [
        { date: '2026-06-23T00:00:00.000Z', amount: 70, paymentCount: 1 },
      ],
      paymentMix: [
        { key: 'cash', label: 'Cash', amount: 70, count: 1 },
        { key: 'paymongo', label: 'PayMongo', amount: 0, count: 0 },
        { key: 'complimentary', label: 'Complimentary', amount: 0, count: 0 },
        { key: 'failed', label: 'Failed', amount: 0, count: 0 },
        { key: 'pending', label: 'Pending', amount: 0, count: 0 },
      ],
    } satisfies DashboardReport);
  });

  afterEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
  });

  it('renders revenue and payment reporting data', async () => {
    renderDashboard();

    expect(await screen.findByText('Settled revenue')).toBeInTheDocument();
    expect(screen.getByText('Live operations')).toBeInTheDocument();
    expect(await screen.findByText('4 / 50')).toBeInTheDocument();
    expect(screen.getByText("Today's performance")).toBeInTheDocument();
    expect(screen.getByText('Sessions requiring attention')).toBeInTheDocument();
    expect(screen.getByText('Recent performance · Last 7 days')).toBeInTheDocument();
    expect(await screen.findByText('Settled payments only')).toBeInTheDocument();
    expect(screen.getAllByText(/70/).length).toBeGreaterThan(0);
    expect(screen.getByText('Revenue trend')).toBeInTheDocument();
    expect(screen.getByText('Payment mix')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();

    const pageText = document.body.textContent ?? '';
    expect(pageText).not.toMatch(/backend|endpoint|phase 6|N\/A|not available/i);
  });

  it('makes actionable attention items full links to filtered sessions', async () => {
    renderDashboard();

    expect(await screen.findByText('4 open')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unpaid active sessions, 2 items\. Needs payment\. View unpaid sessions/i }))
      .toHaveAttribute('href', '/admin/sessions?attention=unpaid');
    expect(screen.getByRole('link', { name: /Vehicles overstaying, 1 item\. Additional payment may be needed\. View overstays/i }))
      .toHaveAttribute('href', '/admin/sessions?attention=over-grace');
    expect(screen.getByRole('link', { name: /Paid awaiting exit, 1 item\. Ready for exit validation\. View paid sessions/i }))
      .toHaveAttribute('href', '/admin/sessions?attention=paid-awaiting-exit');
  });
});
