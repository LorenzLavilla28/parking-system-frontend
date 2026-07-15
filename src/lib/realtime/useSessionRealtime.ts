import { useEffect, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureStarted, getConnection, getStatus, subscribeStatus } from './connection';
import { applySessionEvent, type RealtimeStatus, type SessionRealtimeEvent } from './events';

interface Options {
  /** Watch a single location (guards). */
  locationId?: string | null;
  /** Watch the whole tenant (supervisors/admins). */
  tenant?: boolean;
}

const CLIENT_EVENT = 'SessionChanged';

/**
 * Subscribes the shared hub connection to the location or tenant being viewed and
 * invalidates the affected React Query caches whenever the server pushes a session
 * change. Returns the live connection status for a badge. Re-subscribes after a
 * reconnect (group membership is per-connection and is lost on drop).
 */
export function useSessionRealtime({ locationId, tenant }: Options): RealtimeStatus {
  const queryClient = useQueryClient();
  const status = useSyncExternalStore(subscribeStatus, getStatus);

  useEffect(() => {
    if (!tenant && !locationId) return;

    const connection = getConnection();
    let cancelled = false;

    const handler = (evt: SessionRealtimeEvent) => applySessionEvent(queryClient, evt);
    connection.on(CLIENT_EVENT, handler);

    const subscribe = async () => {
      await ensureStarted();
      if (cancelled) return;
      if (tenant) await connection.invoke('SubscribeToTenant').catch(() => undefined);
      else if (locationId) await connection.invoke('SubscribeToLocation', locationId).catch(() => undefined);
    };

    // Group membership is dropped on reconnect, so re-join once reconnected.
    const onReconnected = () => void subscribe();
    connection.onreconnected(onReconnected);

    void subscribe();

    return () => {
      cancelled = true;
      connection.off(CLIENT_EVENT, handler);
      if (tenant) void connection.invoke('UnsubscribeFromTenant').catch(() => undefined);
      else if (locationId) void connection.invoke('UnsubscribeFromLocation', locationId).catch(() => undefined);
    };
  }, [queryClient, locationId, tenant]);

  return status;
}
