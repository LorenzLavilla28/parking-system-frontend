import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CorporateBenefitsPage } from './CorporateBenefitsPage';
import { adminApi, type CorporateBenefitProgram } from './api';

vi.mock('./api', () => ({
  adminApi: {
    listCorporateBenefits: vi.fn(),
    listLocations: vi.fn(),
    createCorporateBenefit: vi.fn(),
    updateCorporateBenefit: vi.fn(),
    setCorporateBenefitStatus: vi.fn(),
  },
}));

const listCorporateBenefits = vi.mocked(adminApi.listCorporateBenefits);
const listLocations = vi.mocked(adminApi.listLocations);
const createCorporateBenefit = vi.mocked(adminApi.createCorporateBenefit);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CorporateBenefitsPage />
    </QueryClientProvider>,
  );
}

describe('CorporateBenefitsPage wizard', () => {
  it('keeps the flow staged and correctly summarizes an end-only revision', async () => {
    listCorporateBenefits.mockResolvedValue([]);
    listLocations.mockResolvedValue({
      items: [{ id: 'location-1', tenantId: 'tenant-1', name: 'Julicis Location', slug: 'julicis', address: null, timezone: 'Asia/Manila', status: 'Active', allowCashPayment: true, publicQrCodeUrl: null, createdAt: '', updatedAt: '' }],
      page: 1,
      pageSize: 200,
      totalCount: 1,
      totalPages: 1,
    });
    createCorporateBenefit.mockResolvedValue({} as CorporateBenefitProgram);

    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'New benefit program' }));

    expect(screen.getByRole('heading', { name: 'Basic details' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Company / program name'), 'Julicis Benefit');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Locations' })).toBeInTheDocument();
    await user.click(await screen.findByLabelText('Julicis Location'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Schedule' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Eligibility' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Add approved plate number'), 'NJM 1502');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByRole('heading', { name: 'Revision (optional)' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New revision ends (optional)'), { target: { value: '2026-08-30' } });
    await user.click(screen.getByRole('button', { name: 'Review changes' }));

    expect(screen.getByText('Review before saving')).toBeInTheDocument();
    expect(screen.getByText('Starts immediately to 2026-08-30')).toBeInTheDocument();
    expect(createCorporateBenefit).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Create benefit program' }));
    expect(await screen.findByText('Benefit program created')).toBeInTheDocument();
    await waitFor(() => expect(listCorporateBenefits.mock.calls.length).toBeGreaterThan(1));
  });

  it('asks before discarding edits from the modal', async () => {
    listCorporateBenefits.mockResolvedValue([]);
    listLocations.mockResolvedValue({ items: [], page: 1, pageSize: 200, totalCount: 0, totalPages: 0 });
    createCorporateBenefit.mockResolvedValue({} as CorporateBenefitProgram);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();

    renderPage();
    await user.click(screen.getByRole('button', { name: 'New benefit program' }));
    await user.type(screen.getByLabelText('Company / program name'), 'Unsaved benefit');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(confirm).toHaveBeenCalledWith('Discard unsaved corporate benefit changes?');
    expect(screen.queryByRole('heading', { name: 'New corporate benefit' })).not.toBeInTheDocument();
    confirm.mockRestore();
    await waitFor(() => expect(listCorporateBenefits).toHaveBeenCalled());
  });
});
