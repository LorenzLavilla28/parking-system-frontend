import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { RatePlanBuilderPage } from './RatePlanBuilderPage';
import { adminApi } from './api';

vi.mock('./api', () => ({
  adminApi: {
    listRatePlans: vi.fn(),
    getRatePlan: vi.fn(),
    listVersions: vi.fn(),
    addVersion: vi.fn(),
    createRatePlan: vi.fn(),
  },
}));

const getRatePlan = vi.mocked(adminApi.getRatePlan);
const listVersions = vi.mocked(adminApi.listVersions);

function renderBuilder(initialPath = '/admin/rate-plans/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([
    { path: '/admin/rate-plans/new', element: <RatePlanBuilderPage /> },
    { path: '/admin/rate-plans/:id/edit', element: <RatePlanBuilderPage /> },
    { path: '/admin/rate-plans', element: <h1>Rate plans</h1> },
  ], { initialEntries: [initialPath] });

  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('RatePlanBuilderPage vehicle pricing', () => {
  it('lets an administrator configure independent car and motorcycle rates', async () => {
    const user = userEvent.setup();
    renderBuilder();

    await user.type(screen.getByLabelText('Rate-plan name'), 'Standard vehicle rates');
    await user.type(screen.getByLabelText('Description'), 'Separate car and motorcycle pricing');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const carSection = screen.getByRole('heading', { name: 'Car rate' }).closest('section');
    const motorcycleSection = screen.getByRole('heading', { name: 'Motorcycle rate' }).closest('section');
    expect(carSection).not.toBeNull();
    expect(motorcycleSection).not.toBeNull();

    expect(within(carSection!).getByRole('button', { name: /First block, then increments/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(within(motorcycleSection!).getByRole('button', { name: /Flat stay rate/ }));

    expect(within(motorcycleSection!).getByRole('button', { name: /Flat stay rate/ })).toHaveAttribute('aria-pressed', 'true');
    const motorcycleAmount = within(motorcycleSection!).getByLabelText('Flat amount');
    await user.clear(motorcycleAmount);
    await user.type(motorcycleAmount, '25');

    expect(motorcycleAmount).toHaveValue(25);
    expect(within(carSection!).getByLabelText('First block amount')).toHaveValue(50);
  });

  it('prefills an edit from the current backend revision instead of form defaults', async () => {
    getRatePlan.mockResolvedValue({
      id: 'plan-1',
      parkingLocationId: null,
      name: 'Actual rates',
      description: 'Saved pricing',
      status: 'Active',
      currentVersionNumber: 3,
      paidExitGraceMinutes: 22,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-02T00:00:00Z',
      currentRulesJson: null,
    });
    listVersions.mockResolvedValue([{
      id: 'version-3',
      ratePlanId: 'plan-1',
      versionNumber: 3,
      effectiveFrom: '2026-08-02T00:00:00Z',
      effectiveTo: null,
      createdAt: '2026-08-02T00:00:00Z',
      rulesJson: JSON.stringify({
        Currency: 'PHP',
        EntryGraceMinutes: 7,
        PaidExitGraceMinutes: 22,
        Default: { Type: 'FirstBlock', FirstHours: 4, FirstAmount: 85, IncrementAmount: 15, IncrementUnit: 'Hour' },
        VehicleRates: {
          Car: { Type: 'FirstBlock', FirstHours: 4, FirstAmount: 85, IncrementAmount: 15, IncrementUnit: 'Hour' },
          Motorcycle: { Type: 'Flat', FlatAmount: 25 },
        },
      }),
    }]);

    const user = userEvent.setup();
    renderBuilder('/admin/rate-plans/plan-1/edit');

    expect(await screen.findByDisplayValue('Actual rates')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    const carSection = screen.getByRole('heading', { name: 'Car rate' }).closest('section')!;
    const motorcycleSection = screen.getByRole('heading', { name: 'Motorcycle rate' }).closest('section')!;
    expect(within(carSection).getByLabelText('First block hours')).toHaveValue(4);
    expect(within(carSection).getByLabelText('First block amount')).toHaveValue(85);
    expect(within(carSection).getByLabelText('Increment amount')).toHaveValue(15);
    expect(within(motorcycleSection).getByLabelText('Flat amount')).toHaveValue(25);
  });
});
