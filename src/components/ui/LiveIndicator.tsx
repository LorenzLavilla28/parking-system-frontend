import { cn } from './cn';
import type { RealtimeStatus } from '@/lib/realtime/events';

interface View {
  label: string;
  dot: string;
  text: string;
  pulse: boolean;
}

const views: Record<RealtimeStatus, View> = {
  live: { label: 'System online', dot: 'bg-emerald-500', text: 'text-emerald-700', pulse: true },
  reconnecting: { label: 'Reconnecting', dot: 'bg-amber-500', text: 'text-amber-700', pulse: true },
  offline: { label: 'System offline', dot: 'bg-slate-400', text: 'text-slate-500', pulse: false },
};

/** Small connection-status pill for realtime-enabled screens. */
export function LiveIndicator({ status, className, compact = false }: { status: RealtimeStatus; className?: string; compact?: boolean }) {
  const view = views[status];
  const label = compact && status === 'live' ? 'Online' : view.label;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', view.text, className)}
      role="status"
      aria-label={view.label}
    >
      <span className="relative flex h-2 w-2">
        {view.pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', view.dot)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', view.dot)} />
      </span>
      {label}
    </span>
  );
}
