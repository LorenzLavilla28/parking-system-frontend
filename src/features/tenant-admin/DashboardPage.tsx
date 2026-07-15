import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CarFront, CircleDollarSign, Clock3, MapPin, MoveRight } from 'lucide-react';
import { adminApi, type DashboardReport, type PaymentMixItem } from './api';
import { useAuth } from '@/features/auth/hooks';
import { sessionStatusView } from '@/features/guard/sessionStatus';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/components/ui/cn';

type AttentionTone = 'attention' | 'danger' | 'info' | 'neutral';

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.fullName || user?.email || 'there';

  const activeSessions = useQuery({
    queryKey: ['admin-dashboard-active-sessions'],
    queryFn: () => adminApi.listSessions({ activeOnly: true }),
  });
  const locations = useQuery({
    queryKey: ['admin-dashboard-locations'],
    queryFn: () => adminApi.listLocations(),
  });
  const report = useQuery({
    queryKey: ['admin-dashboard-report', 7],
    queryFn: () => adminApi.getDashboardReport(7),
  });

  const sessions = activeSessions.data?.items ?? [];
  const unpaidSessions = report.data?.summary.unpaidSessions
    ?? sessions.filter((session) => ['ActiveUnpaid', 'PaymentPending'].includes(session.status)).length;
  const paidAwaitingExit = report.data?.summary.paidAwaitingExit
    ?? sessions.filter((session) => session.status === 'PaidExitWindow').length;
  const overGrace = report.data?.summary.overGraceSessions
    ?? sessions.filter((session) => session.status === 'OverstayDue').length;
  const attentionCount = unpaidSessions + overGrace;
  const activeLocations = locations.data?.items.filter((location) => location.status === 'Active').length ?? 0;
  const recentSessions = sessions.slice(0, 4);
  const summary = report.data?.summary;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description={`Welcome back, ${name}. Monitor live parking activity and jump into workflows that need attention.`}
      />

      {(activeSessions.isError || locations.isError || report.isError) && (
        <ErrorState error={activeSessions.error ?? locations.error ?? report.error} />
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CarFront}
          label="Active sessions"
          value={report.isLoading ? '...' : (summary?.activeSessions ?? sessions.length)}
          detail="Vehicles currently parked"
          tone="blue"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Today's revenue"
          value={report.isLoading ? '...' : formatMoney(summary?.todayRevenue ?? 0, summary?.currency)}
          detail={report.isLoading ? 'Loading payment data' : `${summary?.todayExits ?? 0} exits today`}
          tone="green"
        />
        <MetricCard
          icon={Clock3}
          label="Paid awaiting exit"
          value={activeSessions.isLoading ? '...' : paidAwaitingExit}
          detail="Inside the exit window"
          tone="amber"
        />
        <MetricCard
          icon={MapPin}
          label="Open locations"
          value={locations.isLoading ? '...' : activeLocations}
          detail="Active configured branches"
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Needs attention</h2>
              <p className="text-sm text-slate-500">Live counts from active parking sessions.</p>
            </div>
            <StatusBadge tone={attentionCount > 0 ? 'attention' : 'success'} label={attentionCount > 0 ? `${attentionCount} open` : 'Clear'} />
          </div>
          <div className="mt-4 grid gap-3">
            <AttentionItem
              label="Unpaid active sessions"
              value={activeSessions.isLoading ? '...' : unpaidSessions}
              tone={unpaidSessions > 0 ? 'attention' : 'neutral'}
              statusLabel={unpaidSessions > 0 ? 'Requires review' : 'No action required'}
              href={unpaidSessions > 0 ? '/admin/sessions?attention=unpaid' : undefined}
            />
            <AttentionItem
              label="Over grace period"
              value={activeSessions.isLoading ? '...' : overGrace}
              tone={overGrace > 0 ? 'danger' : 'neutral'}
              statusLabel={overGrace > 0 ? 'Additional payment may be needed' : 'No action required'}
              href={overGrace > 0 ? '/admin/sessions?attention=over-grace' : undefined}
            />
            <AttentionItem
              label="Paid awaiting exit"
              value={activeSessions.isLoading ? '...' : paidAwaitingExit}
              tone={paidAwaitingExit > 0 ? 'info' : 'neutral'}
              statusLabel={paidAwaitingExit > 0 ? 'Ready for exit validation' : 'No action required'}
              href={paidAwaitingExit > 0 ? '/admin/sessions?attention=paid-awaiting-exit' : undefined}
            />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Recent activity</h2>
              <p className="text-sm text-slate-500">Latest active sessions currently visible to this tenant.</p>
            </div>
            <Link to="/admin/sessions" className="text-sm font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-4">
            {activeSessions.isLoading && <LoadingState label="Loading activity..." />}
            {activeSessions.data && recentSessions.length === 0 && <EmptyState>No active session activity yet.</EmptyState>}
            {recentSessions.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-lg ring-1 ring-slate-200">
                {recentSessions.map((session) => {
                  const view = sessionStatusView(session.status);
                  return (
                    <li key={session.id} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{session.plateNumberRaw}</p>
                        <p className="truncate text-xs text-slate-500">{session.vehicleType} - {formatDateTime(session.entryTime)}</p>
                      </div>
                      <StatusBadge tone={toStatusBadgeTone(view.tone)} label={view.label} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <RevenueOverview report={report.data} isLoading={report.isLoading} />
        <PaymentMix report={report.data} isLoading={report.isLoading} />
      </div>
    </div>
  );
}

function AttentionItem({
  label,
  value,
  tone,
  statusLabel,
  href,
}: {
  label: string;
  value: number | string;
  tone: AttentionTone;
  statusLabel: string;
  href?: string;
}) {
  const count = typeof value === 'number' ? value : undefined;
  const content = (
    <>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{statusLabel}</p>
      </div>
      {href ? (
        <MoveRight className="h-5 w-5 shrink-0 text-brand-700" aria-hidden="true" />
      ) : (
        <StatusBadge tone={tone} label="Clear" />
      )}
    </>
  );

  const className = cn(
    'flex min-h-24 items-center justify-between gap-4 rounded-lg p-4 ring-1 transition',
    href
      ? 'bg-white text-left ring-slate-200 hover:bg-brand-50 hover:ring-brand-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500'
      : 'bg-slate-50 ring-slate-200',
  );

  if (href) {
    return (
      <Link
        to={href}
        className={className}
        aria-label={`${label}, ${count ?? value} ${count === 1 ? 'item' : 'items'}. ${statusLabel}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function RevenueOverview({ report, isLoading }: { report?: DashboardReport; isLoading: boolean }) {
  const points = report?.revenue ?? [];
  const max = Math.max(...points.map((point) => point.amount), 1);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950">Revenue overview</h2>
          <p className="text-xs text-slate-500">Last 7 days</p>
        </div>
      </div>
      <div className="mt-4">
        {isLoading && <LoadingState label="Loading revenue..." />}
        {!isLoading && points.length > 0 && (
          <div className="space-y-3" aria-label="Revenue for the last 7 days">
            <div className="flex h-40 items-end gap-2 border-b border-slate-200 px-1">
              {points.map((point) => (
                <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-semibold text-slate-500">{formatMoney(point.amount, report?.summary.currency)}</span>
                  <div
                    className="w-full max-w-10 rounded-t bg-brand-500 transition-all"
                    style={{ height: `${Math.max((point.amount / max) * 100, point.amount > 0 ? 8 : 2)}%` }}
                    title={`${formatMoney(point.amount, report?.summary.currency)} on ${formatChartDate(point.date)}`}
                  />
                  <span className="text-[10px] text-slate-500">{formatChartDate(point.date)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500">Settled payments only</p>
          </div>
        )}
        {!isLoading && points.length === 0 && <EmptyState>No revenue data is available for the selected period.</EmptyState>}
      </div>
    </Card>
  );
}

function PaymentMix({ report, isLoading }: { report?: DashboardReport; isLoading: boolean }) {
  const items = report?.paymentMix ?? [];
  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500'];

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <CircleDollarSign className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950">Payment mix</h2>
          <p className="text-xs text-slate-500">Last 7 days</p>
        </div>
      </div>
      <div className="mt-4">
        {isLoading && <LoadingState label="Loading payment mix..." />}
        {!isLoading && items.length > 0 && (
          <div className="space-y-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label="Payment mix amounts">
              {items.map((item, index) => (
                <div
                  key={item.key}
                  className={colors[index % colors.length]}
                  style={{ width: `${total > 0 ? (item.amount / total) * 100 : 0}%` }}
                  title={`${item.label}: ${formatMoney(item.amount, report?.summary.currency)}`}
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, index) => (
                <PaymentMixRow key={item.key} item={item} color={colors[index % colors.length]} currency={report?.summary.currency} />
              ))}
            </div>
          </div>
        )}
        {!isLoading && items.length === 0 && <EmptyState>Payment-method information is not available yet.</EmptyState>}
      </div>
    </Card>
  );
}

function PaymentMixRow({ item, color, currency }: { item: PaymentMixItem; color: string; currency?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', color)} />
        <span className="truncate text-sm font-medium text-slate-700">{item.label}</span>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-slate-950">{formatMoney(item.amount, currency)}</p>
        <p className="text-[11px] text-slate-500">{item.count} {item.count === 1 ? 'payment' : 'payments'}</p>
      </div>
    </div>
  );
}

function formatChartDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
}

function toStatusBadgeTone(tone: ReturnType<typeof sessionStatusView>['tone']) {
  if (tone === 'green') return 'success';
  if (tone === 'amber') return 'attention';
  if (tone === 'red') return 'danger';
  if (tone === 'blue') return 'info';
  return 'neutral';
}
