import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PaymentSettingsPage } from './PaymentSettingsPage';

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
});
