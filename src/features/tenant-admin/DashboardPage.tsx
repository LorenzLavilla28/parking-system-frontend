import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Banknote, CarFront, CircleDollarSign, Clock3, LogIn, LogOut, MoveRight, RefreshCw, WalletCards } from 'lucide-react';
import { adminApi, type DashboardReport, type PaymentMixItem } from './api';
import { useAuth } from '@/features/auth/hooks';
import type { SessionSummary } from '@/features/guard/api';
import { sessionStatusView } from '@/features/guard/sessionStatus';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/components/ui/cn';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';

type AttentionTone = 'attention' | 'danger' | 'info' | 'neutral';

export function DashboardPage() {
  const { user } = useAuth();
  const name = user?.fullName || user?.email || 'there';

  const activeSessions = useQuery({
    queryKey: ['admin-dashboard-active-sessions'],
    queryFn: () => adminApi.listSessions({ activeOnly: true, pageSize: 5 }),
  });
  const report = useQuery({
    queryKey: ['admin-dashboard-report', 7],
    queryFn: () => adminApi.getDashboardReport(7),
  });
  const todayReport = useQuery({
    queryKey: ['admin-dashboard-report', 1],
    queryFn: () => adminApi.getDashboardReport(1),
  });

  const sessions = activeSessions.data?.items ?? [];
  const unpaidSessions = report.data?.summary.unpaidSessions
    ?? sessions.filter((session) => ['ActiveUnpaid', 'PaymentPending'].includes(session.status)).length;
  const overGrace = report.data?.summary.overGraceSessions
    ?? sessions.filter((session) => session.status === 'OverstayDue').length;
  const paidAwaitingExit = report.data?.summary.paidAwaitingExit
    ?? sessions.filter((session) => session.status === 'PaidExitWindow').length;
  const attentionCount = unpaidSessions + overGrace + paidAwaitingExit;
  const summary = report.data?.summary;
  const todaySummary = todayReport.data?.summary ?? summary;
  const successfulPayments = todayReport.data?.paymentMix
    .filter((item) => item.key === 'cash' || item.key === 'paymongo')
    .reduce((total, item) => total + item.count, 0) ?? 0;
  const activeVehicleCount = summary?.activeSessions ?? sessions.length;
  const activeVehicleCapacity = summary?.maximumCapacity;
  const lastUpdatedAt = Math.max(activeSessions.dataUpdatedAt, report.dataUpdatedAt, todayReport.dataUpdatedAt);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description={`Welcome back, ${name}. Monitor live parking operations and today's performance.`}
        actions={<div className="flex flex-wrap items-center justify-end gap-3"><span className="text-xs font-semibold text-slate-500">{lastUpdatedAt > 0 ? `Updated ${formatRelativeTime(lastUpdatedAt)}` : 'Updating...'}</span><Button variant="secondary" onClick={() => void Promise.all([activeSessions.refetch(), report.refetch(), todayReport.refetch()])}><RefreshCw className={cn('h-4 w-4', activeSessions.isFetching || report.isFetching || todayReport.isFetching ? 'animate-spin' : '')} /> Refresh</Button></div>}
      />

      {(activeSessions.isError || report.isError || todayReport.isError) && (
        <ErrorState error={activeSessions.error ?? report.error ?? todayReport.error} />
      )}

      <section aria-labelledby="live-operations-title" className="space-y-4">
        <div><h2 id="live-operations-title" className="text-lg font-bold text-slate-950">Live operations</h2><p className="mt-1 text-sm text-slate-500">What is happening right now across active parking sessions.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={CarFront} label="Active vehicles" value={report.isLoading ? '...' : `${activeVehicleCount} / ${activeVehicleCapacity && activeVehicleCapacity > 0 ? activeVehicleCapacity : '—'}`} detail="Active / maximum capacity" tone="blue" />
          <MetricCard icon={WalletCards} label="Open issues" value={report.isLoading ? '...' : attentionCount} detail={`${unpaidSessions} unpaid · ${overGrace} overstaying`} tone={attentionCount > 0 ? 'amber' : 'green'} />
          <MetricCard icon={WalletCards} label="Outstanding balance" value={report.isLoading ? '...' : formatMoney(summary?.overGraceAmount ?? 0, summary?.currency)} detail={`${overGrace} overstay ${overGrace === 1 ? 'session' : 'sessions'}`} tone={(summary?.overGraceAmount ?? 0) > 0 ? 'amber' : 'green'} />
          <MetricCard icon={Clock3} label="Oldest active session" value={report.isLoading ? '...' : formatDuration((summary?.oldestActiveSessionMinutes ?? 0) * 60_000)} detail="Live duration" tone={(summary?.oldestActiveSessionMinutes ?? 0) >= 7 * 24 * 60 ? 'amber' : 'slate'} />
        </div>
      </section>

      <AttentionSection isLoading={activeSessions.isLoading || report.isLoading} unpaidSessions={unpaidSessions} overstays={overGrace} paidAwaitingExit={paidAwaitingExit} />

      <ActiveSessionsSection sessions={sessions} total={activeSessions.data?.totalCount ?? sessions.length} isLoading={activeSessions.isLoading} />

      <section aria-labelledby="today-performance-title" className="space-y-4">
        <div><h2 id="today-performance-title" className="text-lg font-bold text-slate-950">Today's performance</h2><p className="mt-1 text-sm text-slate-500">Completed movement and payment activity for today.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={LogIn} label="Entries" value={todayReport.isLoading ? '...' : (todaySummary?.todayEntries ?? 0)} detail="Today" tone="slate" />
          <MetricCard icon={LogOut} label="Exits" value={todayReport.isLoading ? '...' : (todaySummary?.todayExits ?? 0)} detail="Today" tone="slate" />
          <MetricCard icon={Banknote} label="Settled revenue" value={todayReport.isLoading ? '...' : formatMoney(todaySummary?.todayRevenue ?? 0, todaySummary?.currency)} detail="Today" tone="green" />
          <MetricCard icon={CircleDollarSign} label="Successful payments" value={todayReport.isLoading ? '...' : successfulPayments} detail="Confirmed today" tone="green" />
        </div>
      </section>

      <section aria-labelledby="recent-performance-title" className="space-y-4">
        <div><h2 id="recent-performance-title" className="text-lg font-bold text-slate-950">Recent performance · Last 7 days</h2><p className="mt-1 text-sm text-slate-500">Recent revenue and payment outcomes.</p></div>
        <div className="grid gap-4 xl:grid-cols-2">
        <RevenueOverview report={report.data} isLoading={report.isLoading} />
        <PaymentMix report={report.data} isLoading={report.isLoading} />
        </div>
      </section>
    </div>
  );
}

function AttentionItem({
  label,
  value,
  tone,
  statusLabel,
  actionLabel,
  href,
}: {
  label: string;
  value: number | string;
  tone: AttentionTone;
  statusLabel: string;
  actionLabel: string;
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
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700">{actionLabel}<MoveRight className="h-4 w-4" aria-hidden="true" /></span>
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
        aria-label={`${label}, ${count ?? value} ${count === 1 ? 'item' : 'items'}. ${statusLabel}. ${actionLabel}`}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function AttentionSection({ unpaidSessions, overstays, paidAwaitingExit, isLoading }: {
  unpaidSessions: number;
  overstays: number;
  paidAwaitingExit: number;
  isLoading: boolean;
}) {
  const itemCount = Number(unpaidSessions > 0) + Number(overstays > 0) + Number(paidAwaitingExit > 0);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-base font-bold text-slate-950">Needs attention</h2><p className="text-sm text-slate-500">Only active issues that require an operator decision.</p></div>
        {!isLoading && itemCount > 0 && <StatusBadge tone="attention" label={`${unpaidSessions + overstays + paidAwaitingExit} open`} />}
      </div>
      {isLoading ? <div className="mt-4"><LoadingState label="Checking active issues..." /></div> : itemCount === 0 ? <div className="mt-4"><EmptyState>No issues require attention.</EmptyState></div> : <div className="mt-4 grid gap-3 md:grid-cols-3">{unpaidSessions > 0 && <AttentionItem label="Unpaid active sessions" value={unpaidSessions} tone="attention" statusLabel="Needs payment" actionLabel="View unpaid sessions" href="/admin/sessions?attention=unpaid" />}{overstays > 0 && <AttentionItem label="Vehicles overstaying" value={overstays} tone="danger" statusLabel="Additional payment may be needed" actionLabel="View overstays" href="/admin/sessions?attention=over-grace" />}{paidAwaitingExit > 0 && <AttentionItem label="Paid awaiting exit" value={paidAwaitingExit} tone="info" statusLabel="Ready for exit validation" actionLabel="View paid sessions" href="/admin/sessions?attention=paid-awaiting-exit" />}</div>}
    </Card>
  );
}

function ActiveSessionsSection({ sessions, total, isLoading }: { sessions: SessionSummary[]; total: number; isLoading: boolean }) {
  const prioritySessions = [...sessions]
    .sort((a, b) => sessionPriority(b) - sessionPriority(a) || b.entryTime.localeCompare(a.entryTime))
    .slice(0, 5);

  return (
    <section aria-labelledby="active-sessions-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="active-sessions-title" className="text-lg font-bold text-slate-950">Sessions requiring attention</h2><p className="mt-1 text-sm text-slate-500">Priority preview of {total} active session{total === 1 ? '' : 's'} · sorted by urgency.</p></div><Link to="/admin/sessions" className="text-sm font-semibold text-brand-700 hover:underline">View all active <MoveRight className="ml-1 inline h-4 w-4" /></Link></div>
      {isLoading && <LoadingState label="Loading active sessions..." />}
      {!isLoading && sessions.length === 0 && <EmptyState>No active parking sessions right now.</EmptyState>}
          {!isLoading && prioritySessions.length > 0 && <Table className="[&_td]:py-2.5 [&_th]:py-2.5"><THead><tr><Th>Plate / location</Th><Th>Entry</Th><Th>Duration</Th><Th>Session</Th><Th>Payment</Th><Th className="text-right">Amount due</Th><Th className="text-right">Action</Th></tr></THead><TBody>{prioritySessions.map((session) => { const sessionView = sessionStatusView(session.status); const paymentView = dashboardPaymentView(session.status); return <tr key={session.id}><Td><p className="font-bold text-slate-950">{session.plateNumberRaw}</p><p className="mt-1 text-xs text-slate-500">{session.locationName ?? 'Unknown location'}</p></Td><Td className="whitespace-nowrap">{formatDateTime(session.entryTime)}</Td><Td className={cn('whitespace-nowrap font-semibold tabular-nums', isLongRunning(session.entryTime) ? 'text-amber-700' : 'text-slate-700')}>{formatDuration(Date.now() - new Date(session.entryTime).getTime())}</Td><Td><Badge tone={sessionView.tone}>{sessionView.label}</Badge></Td><Td><Badge tone={paymentView.tone}>{paymentView.label}</Badge></Td><Td className={cn('text-right font-semibold tabular-nums', session.outstanding > 0 ? 'text-amber-700' : 'text-slate-950')}>{session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}</Td><Td className="text-right"><Link to={`/admin/sessions/${session.id}`} className="font-semibold text-brand-700 hover:underline">View</Link></Td></tr>; })}</TBody></Table>}
    </section>
  );
}

function RevenueOverview({ report, isLoading }: { report?: DashboardReport; isLoading: boolean }) {
  const points = report?.revenue ?? [];
  const max = Math.max(...points.map((point) => point.amount), 1);
  const hasRevenue = points.some((point) => point.amount > 0);

  return (
    <Card>
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-950">Revenue trend</h2>
          <p className="text-xs text-slate-500">Last 7 days</p>
        </div>
      </div>
      <div className="mt-4">
        {isLoading && <LoadingState label="Loading revenue..." />}
        {!isLoading && hasRevenue && (
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
        {!isLoading && !hasRevenue && <div className="rounded-lg bg-slate-50 p-6 text-center ring-1 ring-slate-100"><p className="text-sm font-semibold text-slate-800">No completed payments in this period.</p><p className="mt-1 text-xs text-slate-500">Revenue trends will appear after the first completed payment.</p></div>}
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
        {!isLoading && items.length > 0 && total > 0 && (
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
        {!isLoading && (items.length === 0 || total === 0) && <div className="rounded-lg bg-slate-50 p-6 text-center ring-1 ring-slate-100"><p className="text-sm font-semibold text-slate-800">No completed payments in this period.</p><p className="mt-1 text-xs text-slate-500">Payment mix will appear after the first completed payment.</p></div>}
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
        {(item.overrideCount ?? 0) > 0 && <p className="text-[11px] font-semibold text-blue-700">{formatMoney(item.overrideAmount ?? 0, currency)} override-linked</p>}
      </div>
    </div>
  );
}

function formatChartDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
}

function formatDuration(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return '—';
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isLongRunning(entryTime: string) { return Date.now() - new Date(entryTime).getTime() >= 7 * 24 * 60 * 60 * 1000; }
function dashboardPaymentView(status: string): { label: string; tone: 'neutral' | 'green' | 'amber' | 'red' | 'blue' } {
  if (status === 'PaidExitWindow') return { label: 'Paid', tone: 'green' };
  if (status === 'PaymentPending') return { label: 'Pending', tone: 'blue' };
  if (status === 'OverstayDue') return { label: 'Overdue', tone: 'red' };
  return { label: 'Payment due', tone: 'neutral' };
}
function sessionPriority(session: SessionSummary) {
  const age = Math.max(0, Date.now() - new Date(session.entryTime).getTime());
  const statusWeight = session.status === 'OverstayDue' ? 3_000_000_000_000 : session.status === 'ActiveUnpaid' || session.status === 'PaymentPending' ? 2_000_000_000_000 : 0;
  return statusWeight + session.outstanding * 1_000 + age;
}
function formatRelativeTime(timestamp: number) { const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000)); if (seconds < 10) return 'just now'; if (seconds < 60) return `${seconds}s ago`; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); return `${hours}h ago`; }
