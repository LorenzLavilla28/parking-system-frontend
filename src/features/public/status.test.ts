import { describe, it, expect } from 'vitest';
import { paymentStatusView, isPayable, isResumable, canCheckout } from './status';

describe('paymentStatusView', () => {
  it('maps known statuses to tones', () => {
    expect(paymentStatusView('Paid').tone).toBe('green');
    expect(paymentStatusView('AdditionalPaymentRequired').tone).toBe('amber');
    expect(paymentStatusView('Processing').tone).toBe('blue');
  });
  it('falls back to the raw label', () => {
    expect(paymentStatusView('Weird')).toEqual({ tone: 'neutral', label: 'Weird' });
  });
});

describe('isPayable', () => {
  it('is true for unpaid and overstay', () => {
    expect(isPayable('Unpaid')).toBe(true);
    expect(isPayable('AdditionalPaymentRequired')).toBe(true);
  });
  it('is false once paid or closed', () => {
    expect(isPayable('Paid')).toBe(false);
    expect(isPayable('Closed')).toBe(false);
  });
  it('is false while a payment is confirming', () => {
    expect(isPayable('Processing')).toBe(false);
  });
});

describe('isResumable', () => {
  it('is true only while a payment is confirming', () => {
    expect(isResumable('Processing')).toBe(true);
    expect(isResumable('Unpaid')).toBe(false);
    expect(isResumable('Paid')).toBe(false);
  });
});

describe('canCheckout', () => {
  it('lets an unpaid or a mid-flight (Processing) session start a checkout', () => {
    expect(canCheckout('Unpaid')).toBe(true);
    expect(canCheckout('AdditionalPaymentRequired')).toBe(true);
    expect(canCheckout('Processing')).toBe(true);
  });
  it('does not offer checkout once paid or closed', () => {
    expect(canCheckout('Paid')).toBe(false);
    expect(canCheckout('Closed')).toBe(false);
  });
});
