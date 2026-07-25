import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExitStatusBanner } from './ExitStatusBanner';
import type { ExitStatus } from './api';

const overdueStatus: ExitStatus = {
  sessionId: 'session-1',
  plateNumberRaw: 'ABC 1234',
  vehicleType: 'Car',
  status: 'OverstayDue',
  decision: 'Paid',
  pricingAvailable: true,
  currency: 'PHP',
  currentFee: 50,
  totalPaid: 50,
  outstanding: 0,
  entryTime: '2026-07-26T00:00:00Z',
  paidExitDeadline: '2026-07-26T02:07:00Z',
  canApproveExit: true,
};

describe('ExitStatusBanner', () => {
  it('prioritizes an overdue session over a stale paid decision', () => {
    render(<ExitStatusBanner status={overdueStatus} />);

    expect(screen.getByText('ADDITIONAL PAYMENT REQUIRED')).toBeInTheDocument();
    expect(screen.queryByText('PAID')).not.toBeInTheDocument();
    expect(screen.getByText(/paid exit window has expired/i)).toBeInTheDocument();
  });
});
