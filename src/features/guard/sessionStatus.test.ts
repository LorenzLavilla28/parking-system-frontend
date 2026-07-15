import { describe, it, expect } from 'vitest';
import { sessionStatusView } from './sessionStatus';

describe('sessionStatusView', () => {
  it('maps active/paid/overstay to distinct tones', () => {
    expect(sessionStatusView('ActiveUnpaid')).toEqual({ tone: 'amber', label: 'Unpaid' });
    expect(sessionStatusView('PaidExitWindow').tone).toBe('green');
    expect(sessionStatusView('OverstayDue').tone).toBe('red');
  });
  it('treats terminal states as neutral', () => {
    expect(sessionStatusView('Exited').tone).toBe('neutral');
    expect(sessionStatusView('Void').tone).toBe('neutral');
  });
});
