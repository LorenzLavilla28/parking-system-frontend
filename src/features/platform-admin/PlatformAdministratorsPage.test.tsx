import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformAdministratorsPage } from './PlatformAdministratorsPage';
import { platformApi, type InvitePlatformAdministratorResponse } from './api';

vi.mock('./api', () => ({
  platformApi: {
    listAdministrators: vi.fn(),
    inviteAdministrator: vi.fn(),
  },
}));

const listAdministrators = vi.mocked(platformApi.listAdministrators);
const inviteAdministrator = vi.mocked(platformApi.inviteAdministrator);

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <PlatformAdministratorsPage />
    </QueryClientProvider>,
  );
}

const invitation: InvitePlatformAdministratorResponse = {
  administrator: {
    id: 'admin-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.test',
    status: 'Active',
    mustChangePassword: true,
    createdAt: '2026-07-10T09:00:00.000Z',
  },
  temporaryPassword: 'A7!securePassword',
  emailQueued: true,
  existingAccount: false,
};

describe('PlatformAdministratorsPage', () => {
  beforeEach(() => {
    listAdministrators.mockResolvedValue([]);
    inviteAdministrator.mockResolvedValue(invitation);
  });

  afterEach(() => vi.clearAllMocks());

  it('sends a platform administrator invitation and shows the one-time password', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Invite administrator' }));
    await user.type(screen.getByLabelText('First name'), 'Ada');
    await user.type(screen.getByLabelText('Last name'), 'Lovelace');
    await user.type(screen.getByLabelText('Email'), 'Ada@Example.test');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));

    await waitFor(() => expect(inviteAdministrator).toHaveBeenCalledWith({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.test',
    }));
    expect(await screen.findByText('Invitation queued for ada@example.test.')).toBeInTheDocument();
    expect(screen.getByText('A7!securePassword')).toBeInTheDocument();
  });
});
