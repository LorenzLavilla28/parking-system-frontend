import { describe, it, expect } from 'vitest';
import { formatMoney, elapsedSince } from './format';

describe('formatMoney', () => {
  it('formats PHP amounts', () => {
    // Non-breaking spaces vary by ICU; assert the significant parts.
    const out = formatMoney(90, 'PHP');
    expect(out).toMatch(/₱|PHP/);
    expect(out).toContain('90');
  });
});

describe('elapsedSince', () => {
  const now = new Date('2026-06-23T14:00:00Z');
  it('shows hours and minutes', () => {
    expect(elapsedSince('2026-06-23T10:48:00Z', now)).toBe('3h 12m');
  });
  it('shows only minutes under an hour', () => {
    expect(elapsedSince('2026-06-23T13:45:00Z', now)).toBe('15m');
  });
  it('never goes negative', () => {
    expect(elapsedSince('2026-06-23T15:00:00Z', now)).toBe('0m');
  });
});
