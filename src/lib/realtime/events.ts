import type { QueryClient } from '@tanstack/react-query';

/** Mirrors the backend SessionRealtimeEvent (Contracts/Realtime). */
export interface SessionRealtimeEvent {
  sessionId: string;
  parkingLocationId: string;
  status: string;
  plateNumberRaw: string;
  kind: 'Entered' | 'Exited' | 'PaymentRecorded' | 'Overridden' | string;
}

/** Connection status surfaced to the Live badge. */
export type RealtimeStatus = 'live' | 'reconnecting' | 'offline';

/**
 * The query keys a session change should invalidate. Kept as a pure function so
 * it can be unit-tested without a hub: any session event refetches the list
 * screens, and the specific session's exit-status banner.
 */
export function invalidationKeysFor(evt: SessionRealtimeEvent): unknown[][] {
  return [
    ['guard-sessions'],
    ['exit-search'],
    ['admin-sessions'],
    ['admin-payments'],
    ['guard-entry-active-count', evt.parkingLocationId],
    ['exit-status', evt.sessionId],
  ];
}

/** Applies a session event to the query cache by invalidating the affected keys. */
export function applySessionEvent(queryClient: QueryClient, evt: SessionRealtimeEvent): void {
  for (const queryKey of invalidationKeysFor(evt)) {
    void queryClient.invalidateQueries({ queryKey });
  }
}
