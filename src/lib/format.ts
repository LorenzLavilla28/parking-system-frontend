/** Formatting helpers for money, dates, and durations (display only). */

export function formatMoney(amount: number, currency = 'PHP'): string {
  try {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PH', { timeStyle: 'short' }).format(d);
}

/** Compact elapsed duration since an ISO timestamp, e.g. "3h 12m". */
export function elapsedSince(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return '—';
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return '—';
  const mins = Math.max(0, Math.floor((now.getTime() - start) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}
