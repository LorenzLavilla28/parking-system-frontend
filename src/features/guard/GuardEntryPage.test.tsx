import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuardEntryPage } from './GuardEntryPage';
import { guardApi, type EntryTicket, type GuardLocation, type SessionSummary } from './api';
import { useGuardLocations } from './useGuardLocations';
import type { PagedResult } from '@/lib/api/types';

vi.mock('./api', () => ({
  VEHICLE_TYPES: ['Car', 'Motorcycle', 'Van', 'Truck', 'Other'],
  guardApi: {
    searchSessions: vi.fn(),
    recordEntry: vi.fn(),
  },
}));

vi.mock('./useGuardLocations', () => ({
  useGuardLocations: vi.fn(),
}));

vi.mock('@/lib/realtime/useSessionRealtime', () => ({
  useSessionRealtime: vi.fn(() => 'offline'),
}));

const searchSessions = vi.mocked(guardApi.searchSessions);
const recordEntry = vi.mocked(guardApi.recordEntry);
const mockUseGuardLocations = vi.mocked(useGuardLocations);

const demoLocation: GuardLocation = {
  id: 'location-1',
  name: 'Demo Mall Parking',
  slug: 'demo-mall',
  timezone: 'Asia/Manila',
  allowCashPayment: true,
  slotCapacity: 20,
};

function guardLocationState(overrides: {
  selectedId: string | null;
  selected: GuardLocation | null;
}) {
  return {
    selectedId: overrides.selectedId,
    selected: overrides.selected,
    locations: [demoLocation],
    isLoading: false,
    setLocation: vi.fn(),
  } as unknown as ReturnType<typeof useGuardLocations>;
}

function renderEntryPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <GuardEntryPage />
      </QueryClientProvider>
    </MemoryRouter>,
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

function ticket(): EntryTicket {
  return {
    sessionId: 'session-1',
    plateNumber: 'ABC 123',
    vehicleType: 'Car',
    entryTime: '2026-06-23T10:00:00.000Z',
    ticketCode: 'TICKET-1',
    paymentUrl: 'https://example.test/pay',
    qrCodeDataUri: 'data:image/png;base64,',
    locationName: demoLocation.name,
  };
}

describe('GuardEntryPage', () => {
  beforeEach(() => {
    mockUseGuardLocations.mockReturnValue(guardLocationState({ selectedId: demoLocation.id, selected: demoLocation }));
    searchSessions.mockResolvedValue(page<SessionSummary>([]));
    recordEntry.mockResolvedValue(ticket());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows user-friendly operations status without implementation copy', async () => {
    renderEntryPage();

    expect(screen.getByText('Operations status')).toBeInTheDocument();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Internet connection detected')).toBeInTheDocument();
    expect(screen.getByText('Scan vehicle plate')).toBeInTheDocument();
    expect(screen.queryByText('YoloDotNet locates the plate and PaddleOCR reads the characters.')).not.toBeInTheDocument();
    expect(screen.queryByText('Upload plate image')).not.toBeInTheDocument();
    expect(await screen.findByText('0 / 20')).toBeInTheDocument();

    const pageText = document.body.textContent ?? '';
    expect(pageText).not.toMatch(/backend|endpoint|printer-status|daily entry count|upload support/i);
  });

  it('explains why Record Entry is disabled and enables it for a valid plate', async () => {
    const user = userEvent.setup();
    renderEntryPage();

    const recordButton = screen.getByRole('button', { name: 'Record entry' });
    expect(recordButton).toBeDisabled();
    expect(screen.getByText('Enter a plate number to continue.')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/plate number/i), 'abc-123');

    await waitFor(() => expect(recordButton).toBeEnabled());
    expect(screen.queryByText('Enter a plate number to continue.')).not.toBeInTheDocument();
  });

  it('asks for a working location when none is selected', () => {
    mockUseGuardLocations.mockReturnValue(guardLocationState({ selectedId: null, selected: null }));

    renderEntryPage();

    expect(screen.getByRole('button', { name: 'Record entry' })).toBeDisabled();
    expect(screen.getByText('Select a working location before recording an entry.')).toBeInTheDocument();
  });

  it('submits an operational note with the entry', async () => {
    const user = userEvent.setup();
    renderEntryPage();

    await user.type(screen.getByLabelText(/plate number/i), 'abc-123');
    await user.type(screen.getByLabelText('Notes (optional)'), 'VIP guest - reserved space');
    await user.click(screen.getByRole('button', { name: 'Record entry' }));

    await waitFor(() => expect(recordEntry).toHaveBeenCalledWith({
      parkingLocationId: demoLocation.id,
      plateNumber: 'ABC 123',
      vehicleType: 'Car',
      notes: 'VIP guest - reserved space',
      entryPhotoUrl: null,
    }));
  });
});
