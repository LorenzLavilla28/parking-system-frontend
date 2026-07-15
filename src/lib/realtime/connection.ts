import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { authToken, useAuthStore } from '@/lib/auth/store';
import type { RealtimeStatus } from './events';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

let connection: HubConnection | null = null;
let starting: Promise<void> | null = null;

// --- Connection-status store (drives the Live badge) ------------------------
let currentStatus: RealtimeStatus = 'offline';
const statusListeners = new Set<(s: RealtimeStatus) => void>();

function setStatus(status: RealtimeStatus): void {
  currentStatus = status;
  statusListeners.forEach((l) => l(status));
}

/** Subscribe to connection-status changes. Returns an unsubscribe function. */
export function subscribeStatus(listener: (s: RealtimeStatus) => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getStatus(): RealtimeStatus {
  return currentStatus;
}

/**
 * Returns the shared session hub connection, building it lazily. One connection
 * serves the whole app; pages subscribe to the groups they care about. The access
 * token is read fresh on every (re)connect via the factory, so a token refresh is
 * picked up automatically on the next reconnect.
 */
export function getConnection(): HubConnection {
  if (connection) return connection;

  connection = new HubConnectionBuilder()
    .withUrl(`${baseURL}/hubs/sessions`, {
      accessTokenFactory: () => authToken() ?? '',
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  // Lifecycle → status. Bound once per connection instance.
  connection.onreconnecting(() => setStatus('reconnecting'));
  connection.onreconnected(() => setStatus('live'));
  connection.onclose(() => setStatus('offline'));

  return connection;
}

/** Starts the connection if it isn't already connected/connecting. Idempotent. */
export async function ensureStarted(): Promise<void> {
  const conn = getConnection();
  if (conn.state === HubConnectionState.Connected) {
    setStatus('live');
    return;
  }
  if (starting) return starting;

  starting = conn
    .start()
    .then(() => setStatus('live'))
    .catch((err) => {
      // Swallow: automatic reconnect keeps trying and the Live badge shows the
      // disconnected state to the user.
      setStatus('offline');
      console.warn('SignalR connection failed to start', err);
    })
    .finally(() => {
      starting = null;
    });

  return starting;
}

/** Stops and disposes the connection. Called on logout so no stale socket lingers. */
export async function stopConnection(): Promise<void> {
  if (!connection) return;
  const conn = connection;
  connection = null;
  starting = null;
  setStatus('offline');
  try {
    await conn.stop();
  } catch {
    // ignore — we're tearing down anyway
  }
}

// Tear the socket down when the user signs out (logout or failed refresh both
// clear the session). Subscribed once at module load.
useAuthStore.subscribe((state, prev) => {
  if (prev.session && !state.session) {
    void stopConnection();
  }
});
