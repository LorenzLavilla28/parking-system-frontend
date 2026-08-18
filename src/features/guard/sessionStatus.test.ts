import { describe, it, expect } from 'vitest';
import { sessionStatusView } from './sessionStatus';

describe('sessionStatusView', () => {
  it('maps active/paid/overstay to distinct tones', () => {
    expect(sessionStatusView('ActiveUnpaid')).toEqual({ tone: 'blue', label: 'Active' });
    expect(sessionStatusView('PaidExitWindow')).toEqual({ tone: 'blue', label: 'Active' });
    expect(sessionStatusView('OverstayDue')).toEqual({ tone: 'amber', label: 'Overstay' });
  });
  it('treats terminal states as neutral', () => {
    expect(sessionStatusView('Exited').tone).toBe('neutral');
    expect(sessionStatusView('Void').tone).toBe('neutral');
  });
});
