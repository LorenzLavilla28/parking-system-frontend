import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '@/app/providers';
import { LoginPage } from './LoginPage';

function renderLogin() {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    </AppProviders>,
  );
}

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('can reveal the password', async () => {
    const user = userEvent.setup();
    renderLogin();

    const password = screen.getByLabelText(/^password$/i);
    await user.type(password, 'secret');
    await user.click(screen.getByRole('button', { name: /show password/i }));

    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows validation errors on empty submit (no network call)', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
});
