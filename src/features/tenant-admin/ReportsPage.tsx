import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CarFront,
  ChevronDown,
  Clock3,
  LogIn,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
  TimerReset,
  WalletCards,
} from 'lucide-react';
import { adminApi, type RevenuePoint } from './api';
import { sessionStatusView } from '@/features/guard/sessionStatus';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { cn } from '@/components/ui/cn';
import { formatDateTime, formatMoney } from '@/lib/format';

type RangeKey = 'today' | '90' | '180' | 'custom';

export function ReportsPage() {
  const queryClient = useQueryClient();
  const [range, setRange] = useState<RangeKey>('today');
  const [locationId, setLocationId] = useState('');
  const [customFrom, setCustomFrom] = useState(() => dateInputValue(new Date()));
  const [customTo, setCustomTo] = useState(() => dateInputValue(new Date()));
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestHours, setDigestHours] = useState(3);
  const [digestModalOpen, setDigestModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const rangeQuery = useMemo(() => reportRange(range, customFrom, customTo), [range, customFrom, customTo]);

  const locations = useQuery({
    queryKey: ['admin-locations', 'operations-overview'],
    queryFn: () => adminApi.listLocations({ pageSize: 200 }),
  });
  const report = useQuery({
    queryKey: ['admin-operations-performance', rangeQuery, locationId],
    queryFn: () => adminApi.getDashboardReport(rangeQuery.days, {
      locationId: locationId || undefined,
      from: rangeQuery.from,
      to: rangeQuery.to,
    }),
    enabled: range !== 'custom' || Boolean(rangeQuery.from && rangeQuery.to),
  });
  const operations = useQuery({
    queryKey: ['admin-operations-summary', 24],
    queryFn: () => adminApi.getOperationsSummary(24),
  });
  const digestSettings = useQuery({
    queryKey: ['admin-operations-summary-settings'],
    queryFn: adminApi.getOperationsSummarySettings,
  });
  useEffect(() => {
    if (!digestSettings.data) return;
    setDigestEnabled(digestSettings.data.enabled);
    setDigestHours(digestSettings.data.intervalHours);
  }, [digestSettings.data]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4_000);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  const sessions = useQuery({
    queryKey: ['admin-live-sessions', locationId],
    queryFn: () => adminApi.listSessions({
      activeOnly: true,
      locationId: locationId || undefined,
      pageSize: 8,
    }),
    refetchInterval: 60_000,
  });
  const send = useMutation({
    mutationFn: () => adminApi.sendOperationsSummaryEmail(digestSettings.data?.intervalHours ?? 3),
    onSuccess: (result) => setToast(
      `Digest queued for ${result.recipientsQueued} tenant administrator${result.recipientsQueued === 1 ? '' : 's'}.`,
    ),
  });
  const saveDigestSettings = useMutation({
    mutationFn: () => adminApi.updateOperationsSummarySettings({
      enabled: digestEnabled,
      intervalHours: digestHours,
    }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['admin-operations-summary-settings'], saved);
      setDigestEnabled(saved.enabled);
      setDigestHours(saved.intervalHours);
      setDigestModalOpen(false);
      setToast('Automatic digest schedule updated.');
    },
  });

  const refresh = () => Promise.all([report.refetch(), operations.refetch(), sessions.refetch(), locations.refetch(), digestSettings.refetch()]);
  const refreshing = report.isFetching || operations.isFetching || sessions.isFetching || digestSettings.isFetching;
  const selectedLocation = locations.data?.items.find((location) => location.id === locationId)?.name ?? 'All locations';
  const openDigestSettings = () => {
    setDigestEnabled(digestSettings.data?.enabled ?? true);
    setDigestHours(digestSettings.data?.intervalHours ?? 3);
    setDigestModalOpen(true);
  };
  const closeDigestSettings = () => {
    if (saveDigestSettings.isPending) return;
    setDigestModalOpen(false);
  };
  const digestStatus = digestSettings.isLoading
    ? 'Digest schedule'
    : digestSettings.data?.enabled
      ? `Every ${digestSettings.data.intervalHours} hour${digestSettings.data.intervalHours === 1 ? '' : 's'}`
      : 'Digest paused';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Parking Operations"
        description="Monitor active vehicles, revenue, payments, and exceptions."
        actions={(
          <>
            <Button variant="secondary" onClick={openDigestSettings} disabled={digestSettings.isLoading} aria-haspopup="dialog">
              <span className={cn('h-2 w-2 rounded-full', digestSettings.data?.enabled ? 'bg-emerald-500' : 'bg-slate-400')} aria-hidden="true" />
              {digestStatus}
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary" onClick={() => send.mutate()} loading={send.isPending}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              {send.isPending ? 'Queueing...' : 'Send digest'}
            </Button>
          </>
        )}
      />

      <Modal open={digestModalOpen} onClose={closeDigestSettings} title="Automatic operations digest">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            saveDigestSettings.mutate();
          }}
        >
          <div className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
            <div>
              <p className="font-semibold text-slate-950">Automatic digest</p>
              <p className="mt-1 text-sm text-slate-500">Send a recurring operations summary by email.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                role="switch"
                aria-label="Automatic operations digest"
                checked={digestEnabled}
                onChange={(event) => setDigestEnabled(event.target.checked)}
                className="peer sr-only"
                disabled={saveDigestSettings.isPending}
              />
              <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
            </label>
          </div>

          {digestEnabled && (
            <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
              Send frequency
              <Select
                className="mt-2"
                aria-label="Digest interval in hours"
                value={digestHours}
                onChange={(event) => setDigestHours(Number(event.target.value))}
                disabled={saveDigestSettings.isPending}
              >
                {Array.from({ length: 24 }, (_, index) => index + 1).map((hours) => (
                  <option key={hours} value={hours}>Every {hours} hour{hours === 1 ? '' : 's'}</option>
                ))}
              </Select>
            </label>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Recipients</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">Tenant administrators</p>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={closeDigestSettings} disabled={saveDigestSettings.isPending}>Cancel</Button>
            <Button type="submit" loading={saveDigestSettings.isPending}>Save changes</Button>
          </div>
        </form>
      </Modal>

      <Card className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Location
            <Select className="mt-2" value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">All locations</option>
              {locations.data?.items.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </Select>
          </label>
          <label className="min-w-52 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            Performance period
            <Select className="mt-2" value={range} onChange={(event) => setRange(event.target.value as RangeKey)}>
              <option value="today">Today</option>
              <option value="90">Last 3 months</option>
              <option value="180">Last 6 months</option>
              <option value="custom">Custom range</option>
            </Select>
          </label>
          {range === 'custom' && (
            <>
              <DateField label="From" value={customFrom} onChange={setCustomFrom} />
              <DateField label="To" value={customTo} onChange={setCustomTo} min={customFrom} />
            </>
          )}
          <Button variant="secondary" onClick={() => void refresh()} loading={refreshing}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Live metrics show the current state for {selectedLocation.toLocaleLowerCase()}. Performance metrics use {rangeQuery.label.toLocaleLowerCase()}.
        </p>
      </Card>

      {report.isError && <ErrorState error={report.error} />}
      {operations.isError && <ErrorState error={operations.error} />}
      {sessions.isError && <ErrorState error={sessions.error} />}
      {digestSettings.isError && <ErrorState error={digestSettings.error} />}
      {send.isError && <ErrorState error={send.error} />}
      {saveDigestSettings.isError && <ErrorState error={saveDigestSettings.error} />}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white shadow-xl" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {report.isLoading && <LoadingState label="Preparing the operations overview..." />}
      {report.data && (
        <>
          <KpiGrid
            report={report.data}
            range={range}
            rangeLabel={rangeQuery.label}
            pendingPayments={pendingCount(report.data.paymentMix)}
          />

          <AttentionSection
            overstays={report.data.summary.overGraceSessions}
            pendingPayments={pendingCount(report.data.paymentMix)}
            failedWebhooks={operations.data?.failedWebhooks ?? 0}
            unpaidSessions={report.data.summary.unpaidSessions}
          />

          <LiveActivitySection
            sessions={sessions.data?.items ?? []}
            total={sessions.data?.totalCount ?? 0}
            isLoading={sessions.isLoading}
            locationId={locationId}
          />

          <BusinessPerformance report={report.data} rangeLabel={rangeQuery.label} />
        </>
      )}
    </div>
  );
}

function KpiGrid({ report, range, rangeLabel, pendingPayments }: {
  report: Awaited<ReturnType<typeof adminApi.getDashboardReport>>;
  range: RangeKey;
  rangeLabel: string;
  pendingPayments: number;
}) {
  const periodDetail = range === 'today' ? 'Today' : rangeLabel;
  return (
    <section aria-labelledby="operations-kpis">
      <h2 id="operations-kpis" className="sr-only">Operations metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <MetricCard icon={CarFront} label="Active vehicles" value={report.summary.activeSessions} detail="Live now" tone="blue" />
        <MetricCard icon={LogIn} label={range === 'today' ? 'Entries today' : 'Entries'} value={report.summary.periodEntries} detail={periodDetail} tone="slate" />
        <MetricCard icon={LogOut} label={range === 'today' ? 'Exits today' : 'Exits'} value={report.summary.periodExits} detail={periodDetail} tone="slate" />
        <MetricCard icon={Banknote} label={range === 'today' ? 'Revenue today' : 'Revenue'} value={formatMoney(report.summary.periodRevenue, report.summary.currency)} detail={periodDetail} tone="green" />
        <MetricCard icon={TimerReset} label="Overstays" value={report.summary.overGraceSessions} detail="Live now" tone={report.summary.overGraceSessions > 0 ? 'amber' : 'green'} />
        <MetricCard
          icon={WalletCards}
          label="Outstanding balances"
          value={formatMoney(report.summary.overGraceAmount, report.summary.currency)}
          detail={`${report.summary.overGraceSessions} overstay ${report.summary.overGraceSessions === 1 ? 'session' : 'sessions'}`}
          tone={report.summary.overGraceAmount > 0 ? 'amber' : 'green'}
        />
        <MetricCard icon={WalletCards} label="Pending payments" value={pendingPayments} detail={periodDetail} tone={pendingPayments > 0 ? 'amber' : 'green'} />
      </div>
    </section>
  );
}

function AttentionSection({ overstays, pendingPayments, failedWebhooks, unpaidSessions }: {
  overstays: number;
  pendingPayments: number;
  failedWebhooks: number;
  unpaidSessions: number;
}) {
  const items = [
    overstays > 0 ? { key: 'overstay', count: overstays, label: 'overstay sessions', action: 'Review', to: '/admin/sessions?attention=over-grace', tone: 'danger' as const } : null,
    pendingPayments > 0 ? { key: 'pending', count: pendingPayments, label: 'pending payments', action: 'View payments', to: '/admin/payments?status=Pending', tone: 'warning' as const } : null,
    failedWebhooks > 0 ? { key: 'webhook', count: failedWebhooks, label: 'failed webhooks', action: 'Investigate', to: '/admin/payments?status=Failed', tone: 'danger' as const } : null,
    unpaidSessions > 0 ? { key: 'unpaid', count: unpaidSessions, label: 'unpaid active sessions', action: 'Resolve', to: '/admin/sessions?attention=unpaid', tone: 'warning' as const } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Needs attention</h2>
          <p className="mt-1 text-sm text-slate-500">Issues that may require an operator decision now.</p>
        </div>
        {items.length > 0 && <AlertTriangle className="h-5 w-5 text-red-600" aria-hidden="true" />}
      </div>
      {items.length === 0 ? (
        <div className="p-5"><Alert tone="success">No operational exceptions need attention.</Alert></div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className={cn('h-2.5 w-2.5 rounded-full', item.tone === 'danger' ? 'bg-red-600' : 'bg-amber-500')} />
                <p className="font-semibold text-slate-900"><span className="tabular-nums">{item.count}</span> {item.label}</p>
              </div>
              <Link to={item.to} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                {item.action}<ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function LiveActivitySection({ sessions, total, isLoading, locationId }: {
  sessions: Awaited<ReturnType<typeof adminApi.listSessions>>['items'];
  total: number;
  isLoading: boolean;
  locationId: string;
}) {
  return (
    <section className="space-y-4" aria-labelledby="live-activity-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="live-activity-title" className="text-lg font-bold text-slate-950">Live parking activity</h2>
          <p className="mt-1 text-sm text-slate-500">Active vehicles ordered by most recent entry. Updated every minute.</p>
        </div>
        <Link to={`/admin/sessions${locationId ? `?locationId=${locationId}` : ''}`} className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
          View all {total > 0 ? total : ''}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {isLoading && <LoadingState label="Loading live parking activity..." />}
      {!isLoading && sessions.length === 0 && <EmptyState>No vehicles are currently active.</EmptyState>}
      {!isLoading && sessions.length > 0 && (
        <Table>
          <THead><tr><Th>Plate number</Th><Th>Location</Th><Th>Entry time</Th><Th>Duration</Th><Th>Status</Th><Th className="text-right">Amount due</Th><Th className="text-right">Action</Th></tr></THead>
          <TBody>
            {sessions.map((session) => {
              const status = sessionStatusView(session.status);
              return (
                <tr key={session.id}>
                  <Td className="font-bold text-slate-950">{session.plateNumberRaw}</Td>
                  <Td>{session.locationName ?? 'Unknown location'}</Td>
                  <Td>{formatDateTime(session.entryTime)}</Td>
                  <Td>{formatDuration(Date.now() - new Date(session.entryTime).getTime())}</Td>
                  <Td><Badge tone={status.tone}>{status.label}</Badge></Td>
                  <Td className="text-right font-semibold tabular-nums text-slate-950">{session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}</Td>
                  <Td className="text-right"><Link to={`/admin/payments?sessionId=${session.id}`} className="font-semibold text-brand-700 hover:underline">Review</Link></Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </section>
  );
}

function BusinessPerformance({ report, rangeLabel }: {
  report: Awaited<ReturnType<typeof adminApi.getDashboardReport>>;
  rangeLabel: string;
}) {
  const revenue = bucketRevenue(report.revenue, 12);
  const maxRevenue = Math.max(...revenue.map((point) => point.amount), 1);
  const successfulPayments = report.paymentMix
    .filter((item) => item.key === 'paymongo' || item.key === 'cash')
    .reduce((sum, item) => sum + item.count, 0);
  const failedPayments = report.paymentMix.find((item) => item.key === 'failed')?.count ?? 0;
  const paymentTotal = successfulPayments + failedPayments;
  const movementMax = Math.max(report.summary.periodEntries, report.summary.periodExits, 1);
  const comparison = revenueComparison(report.summary.periodRevenue, report.summary.previousPeriodRevenue);

  return (
    <section className="space-y-4" aria-labelledby="business-performance-title">
      <div>
        <h2 id="business-performance-title" className="text-lg font-bold text-slate-950">Business performance</h2>
        <p className="mt-1 text-sm text-slate-500">Revenue, payment outcomes, and vehicle movement for {rangeLabel.toLocaleLowerCase()}.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div><h3 className="font-bold text-slate-950">Revenue trend</h3><p className="mt-1 text-xs text-slate-500">Settled payments</p></div>
            <Badge tone={comparison.tone}>{comparison.label}</Badge>
          </div>
          <div className="mt-6 flex h-44 items-end gap-2 border-b border-slate-200" aria-label={`Revenue trend for ${rangeLabel}`}>
            {revenue.map((point) => (
              <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                <div className="w-full max-w-12 rounded-t bg-brand-500" style={{ height: `${Math.max((point.amount / maxRevenue) * 130, point.amount > 0 ? 6 : 2)}px` }} title={`${point.label}: ${formatMoney(point.amount, report.summary.currency)}`} />
                <span className="max-w-full truncate text-[10px] text-slate-500">{point.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">{formatMoney(report.summary.periodRevenue, report.summary.currency)} total</p>
        </Card>

        <Card className="space-y-6">
          <div>
            <h3 className="font-bold text-slate-950">Payment outcomes</h3>
            <p className="mt-1 text-xs text-slate-500">Successful versus failed attempts</p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-100">
              <div className="bg-emerald-500" style={{ width: `${paymentTotal ? (successfulPayments / paymentTotal) * 100 : 0}%` }} />
              <div className="bg-red-500" style={{ width: `${paymentTotal ? (failedPayments / paymentTotal) * 100 : 0}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-sm"><span className="text-emerald-700">{successfulPayments} successful</span><span className="text-red-700">{failedPayments} failed</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <PerformanceStat icon={Clock3} label="Average parking duration" value={formatDuration(report.summary.averageDurationMinutes * 60_000)} />
            <PerformanceStat icon={Banknote} label="Previous-period revenue" value={formatMoney(report.summary.previousPeriodRevenue, report.summary.currency)} />
            <PerformanceStat icon={ShieldCheck} label="Supervisor overrides" value={String(report.summary.supervisorOverrides)} />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <h3 className="font-bold text-slate-950">Entries versus exits</h3>
          <p className="mt-1 text-xs text-slate-500">Vehicle movement during the selected period</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <MovementBar label="Entries" value={report.summary.periodEntries} max={movementMax} color="bg-brand-500" />
            <MovementBar label="Exits" value={report.summary.periodExits} max={movementMax} color="bg-slate-700" />
          </div>
        </Card>
      </div>
    </section>
  );
}

function DateField({ label, value, onChange, min }: { label: string; value: string; onChange: (value: string) => void; min?: string }) {
  return (
    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
      {label}
      <input type="date" value={value} min={min} onChange={(event) => onChange(event.target.value)} className="mt-2 block h-11 rounded-lg bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </label>
  );
}

function PerformanceStat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100"><Icon className="h-4 w-4 text-brand-700" /><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-lg font-bold text-slate-950">{value}</p></div>;
}

function MovementBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return <div><div className="flex justify-between text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="font-bold tabular-nums text-slate-950">{value}</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', color)} style={{ width: `${(value / max) * 100}%` }} /></div></div>;
}

function pendingCount(items: Awaited<ReturnType<typeof adminApi.getDashboardReport>>['paymentMix']) {
  return items.find((item) => item.key === 'pending')?.count ?? 0;
}

function reportRange(range: RangeKey, customFrom: string, customTo: string) {
  if (range === '90') return { days: 90, label: 'Last 3 months', from: undefined, to: undefined };
  if (range === '180') return { days: 180, label: 'Last 6 months', from: undefined, to: undefined };
  if (range === 'custom') {
    const from = customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined;
    const toDate = customTo ? new Date(`${customTo}T00:00:00`) : null;
    if (toDate) toDate.setDate(toDate.getDate() + 1);
    return { days: 1, label: customFrom && customTo ? `${customFrom} to ${customTo}` : 'Custom range', from, to: toDate?.toISOString() };
  }
  return { days: 1, label: 'Today', from: undefined, to: undefined };
}

function bucketRevenue(points: RevenuePoint[], maximumBuckets: number) {
  if (points.length <= maximumBuckets) return points.map((point) => ({ ...point, label: chartDate(point.date) }));
  const bucketSize = Math.ceil(points.length / maximumBuckets);
  const buckets = [];
  for (let index = 0; index < points.length; index += bucketSize) {
    const slice = points.slice(index, index + bucketSize);
    buckets.push({
      date: slice[0].date,
      label: chartDate(slice[0].date),
      amount: slice.reduce((sum, point) => sum + point.amount, 0),
      paymentCount: slice.reduce((sum, point) => sum + point.paymentCount, 0),
    });
  }
  return buckets;
}

function revenueComparison(current: number, previous: number): { label: string; tone: 'green' | 'red' | 'neutral' } {
  if (previous <= 0) return current > 0 ? { label: 'New revenue', tone: 'green' } : { label: 'No change', tone: 'neutral' };
  const percent = Math.round(((current - previous) / previous) * 100);
  return { label: `${percent >= 0 ? '+' : ''}${percent}% vs previous`, tone: percent >= 0 ? 'green' : 'red' };
}

function formatDuration(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return '0m';
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function chartDate(iso: string) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric' }).format(date);
}

function dateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
