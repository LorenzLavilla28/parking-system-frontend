import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentSettingsPage } from './PaymentSettingsPage';
import { adminApi } from './api';

vi.mock('./api', () => ({
  adminApi: {
    getPayMongoConnections: vi.fn().mockResolvedValue(null),
    connectPayMongo: vi.fn(),
    disconnectPayMongo: vi.fn(),
  },
}));

describe('PaymentSettingsPage', () => {
  it('offers live PayMongo credentials only', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentSettingsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Live mode only/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk_live_...')).toBeInTheDocument();
    expect(screen.queryByText('Test mode')).not.toBeInTheDocument();
  });

  it('treats a legacy missing data property as not connected', async () => {
    vi.mocked(adminApi.getPayMongoConnections).mockResolvedValueOnce(undefined as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PaymentSettingsPage />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Enter credentials')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong. Please try again.')).not.toBeInTheDocument();
  });
});
