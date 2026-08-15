import { describe, expect, it, vi } from 'vitest';
import { applySessionEvent, invalidationKeysFor, type SessionRealtimeEvent } from './events';

const event: SessionRealtimeEvent = {
  sessionId: 'sess-123',
  parkingLocationId: 'loc-1',
  status: 'PaidExitWindow',
  plateNumberRaw: 'ABC 1234',
  kind: 'PaymentRecorded',
};

describe('invalidationKeysFor', () => {
  it('invalidates the staff list screens and the specific session status', () => {
    expect(invalidationKeysFor(event)).toEqual([
      ['guard-sessions'],
      ['exit-search'],
      ['admin-sessions'],
      ['admin-payments'],
      ['guard-entry-active-count', 'loc-1'],
      ['exit-status', 'sess-123'],
    ]);
  });

  it('scopes the exit-status key to the event session id', () => {
    const keys = invalidationKeysFor({ ...event, sessionId: 'other' });
    expect(keys).toContainEqual(['exit-status', 'other']);
  });
});

describe('applySessionEvent', () => {
  it('invalidates every mapped key on the query client', () => {
    const invalidateQueries = vi.fn();
    const queryClient = { invalidateQueries } as never;

    applySessionEvent(queryClient, event);

    expect(invalidateQueries).toHaveBeenCalledTimes(6);
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['guard-sessions'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['guard-entry-active-count', 'loc-1'] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ['exit-status', 'sess-123'] });
  });
});
