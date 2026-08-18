import { Fragment, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, CircleDollarSign, QrCode, Search, ToggleRight } from 'lucide-react';
import { adminApi } from './api';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { formatMoney, formatDateTime } from '@/lib/format';
import { SessionQrCard } from '@/features/guard/SessionQrCard';

const PAGE_SIZE = 10;

export function AdminSessionsPage() {
  const [params, setParams] = useSearchParams();
  const realtimeStatus = useSessionRealtime({ tenant: true });
  const attention = params.get('attention');
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const locationId = params.get('locationId') ?? '';
  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });

  const sessions = useQuery({
    queryKey: ['admin-sessions', submitted, activeOnly, locationId, attention, page],
    queryFn: () => adminApi.listSessions({
      plate: submitted || undefined,
      activeOnly,
      locationId: locationId || undefined,
      attention: attention || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  });
  const items = sessions.data?.items ?? [];
  const attentionCount = sessions.data?.attentionCount ?? items.filter((session) => isAttentionSession(session.status, session.entryTime)).length;
  const unpaidCount = sessions.data?.unpaidCount ?? items.filter((session) => isUnpaidSession(session.status)).length;
  const longRunningCount = sessions.data?.longRunningCount ?? items.filter((session) => isLongRunning(session.entryTime)).length;

  useEffect(() => {
    setPage(1);
    setQrSessionId(null);
  }, [submitted, activeOnly, locationId, attention]);

  useEffect(() => {
    if (sessions.data && page > Math.max(1, sessions.data.totalPages)) {
      setPage(Math.max(1, sessions.data.totalPages));
    }
  }, [page, sessions.data]);

  const clearAttention = () => {
    if (!attention) return;
    const next = new URLSearchParams(params);
    next.delete('attention');
    setParams(next);
    setPage(1);
  };
  const totalPaid = items.reduce((sum, session) => sum + session.totalPaid, 0);
  const filterLabel = attention === 'unpaid'
    ? 'Unpaid active sessions'
    : attention === 'over-grace'
      ? 'Over grace period'
      : attention === 'paid-awaiting-exit'
        ? 'Paid awaiting exit'
        : activeOnly
          ? 'Active'
          : 'All';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Parking sessions"
        description="Search active or historical parking sessions, review payment status, and support exit workflows."
        actions={<div className="flex flex-wrap items-center gap-3"><Link to="/admin/sessions/adjustments" className="text-sm font-semibold text-brand-700 hover:underline">Adjustment history</Link><LiveIndicator status={realtimeStatus} /></div>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={CarFront} label="Total sessions" value={sessions.isLoading ? '...' : (sessions.data?.totalCount ?? 0)} detail={sessions.isLoading ? 'Loading' : `${items.length} shown on page ${page}`} tone="blue" />
        <MetricCard icon={CircleDollarSign} label="Paid on page" value={formatMoney(totalPaid)} detail={`From ${items.length} visible session${items.length === 1 ? '' : 's'}`} tone="green" />
        <MetricCard icon={ToggleRight} label="Filter" value={filterLabel} detail="Current result scope" tone="slate" />
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(plate.trim());
            setPage(1);
            clearAttention();
          }}
        >
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="Search by plate"
            className="max-w-xs"
          />
          <select
            aria-label="Parking location"
            value={locationId}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('locationId', e.target.value); else next.delete('locationId');
              setParams(next);
              setPage(1);
            }}
            className="h-11 min-w-56 rounded-lg bg-white px-3 text-slate-900 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <option value="">All parking locations</option>
            {locations.data?.items.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
          </select>
          <Button type="submit" variant="secondary">
            <Search className="h-4 w-4" />
            Search
          </Button>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setActiveOnly(e.target.checked);
                clearAttention();
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            Active only
          </label>
          {attention && (
            <Button type="button" variant="ghost" onClick={clearAttention}>
              Clear attention filter
            </Button>
          )}
        </form>
      </Card>

      {sessions.isLoading && <LoadingState />}
      {sessions.isError && <ErrorState error={sessions.error} />}
      {sessions.data && items.length === 0 && <EmptyState>No sessions found.</EmptyState>}

      {sessions.data && items.length > 0 && (
        <>
          {activeOnly && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-4 py-3 text-sm ring-1 ring-slate-200">
              <p className="font-semibold text-slate-900"><span className="tabular-nums">{items.length}</span> shown of <span className="tabular-nums">{sessions.data.totalCount}</span> active sessions · <span className="text-amber-700">{attentionCount} require attention</span></p>
              <p className="text-slate-500"><span className="tabular-nums">{unpaidCount}</span> unpaid · <span className="tabular-nums">{longRunningCount}</span> long-running</p>
            </div>
          )}
          <div className="space-y-3 md:hidden">
            {items.map((s) => (
              <MobileAdminSessionCard
                key={s.id}
                session={s}
                locationName={s.locationName ?? locations.data?.items.find((location) => location.id === s.parkingLocationId)?.name ?? 'Unknown location'}
                qrOpen={qrSessionId === s.id}
                onToggleQr={() => setQrSessionId((current) => current === s.id ? null : s.id)}
              />
            ))}
          </div>
          <div className="hidden md:block xl:hidden">
            <AdminSessionsCompactTable
              items={items}
              locations={locations.data?.items ?? []}
              qrSessionId={qrSessionId}
              onToggleQr={(id) => setQrSessionId((current) => current === id ? null : id)}
            />
          </div>
          <div className="hidden xl:block">
            <Table>
              <THead>
                <tr>
                  <Th>Plate / location</Th>
                  <Th>Entry</Th>
                  <Th>Duration</Th>
                  <Th>Session</Th>
                  <Th>Payment</Th>
                  <Th>Amount due</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </THead>
              <TBody>
                {items.map((s) => {
                  const sessionView = parkingSessionView(s.status);
                  const paymentView = paymentStatusView(s);
                  const row = <tr key={s.id}>
                    <Td><Link to={`/admin/sessions/${s.id}`} className="font-semibold text-brand-700 hover:underline">{s.plateNumberRaw}</Link><p className="mt-1 text-xs text-slate-500">{s.locationName ?? locations.data?.items.find((location) => location.id === s.parkingLocationId)?.name ?? 'Unknown location'}</p></Td>
                    <Td className="whitespace-nowrap">{formatDateTime(s.entryTime)}</Td>
                    <Td className={`whitespace-nowrap font-semibold tabular-nums ${isLongRunning(s.entryTime) ? 'text-amber-700' : 'text-slate-700'}`}>{formatDuration(Date.now() - new Date(s.entryTime).getTime())}</Td>
                    <Td><Badge tone={sessionView.tone}>{sessionView.label}</Badge></Td>
                    <Td><Badge tone={paymentView.tone}>{paymentView.label}</Badge></Td>
                    <Td className={`font-semibold tabular-nums ${s.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {s.pricingAvailable ? formatMoney(s.outstanding, s.currency) : '-'}
                    </Td>
                    <Td className="text-right"><Button type="button" size="sm" variant="ghost" onClick={() => setQrSessionId((current) => current === s.id ? null : s.id)}><QrCode className="h-3.5 w-3.5" />{qrSessionId === s.id ? 'Hide QR' : 'Show QR'}</Button></Td>
                  </tr>;
                  return <Fragment key={s.id}>
                    {row}
                    {qrSessionId === s.id && <tr><td colSpan={7} className="p-3"><SessionQrCard sessionId={s.id} onClose={() => setQrSessionId(null)} /></td></tr>}
                  </Fragment>;
                })}
              </TBody>
            </Table>
          </div>
        </>
      )}
      {sessions.data && sessions.data.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-slate-500 sm:text-left">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sessions.data.totalCount)} of {sessions.data.totalCount} sessions</p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:flex">
            <Button className="w-full sm:w-auto" type="button" variant="secondary" disabled={page <= 1} onClick={() => { setPage((current) => Math.max(1, current - 1)); setQrSessionId(null); }}>Previous</Button>
            <span className="whitespace-nowrap px-1 text-center text-sm text-slate-500">Page {page} of {sessions.data.totalPages}</span>
            <Button className="w-full sm:w-auto" type="button" variant="secondary" disabled={page >= sessions.data.totalPages} onClick={() => { setPage((current) => Math.min(sessions.data.totalPages, current + 1)); setQrSessionId(null); }}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

type AdminSessionItem = Awaited<ReturnType<typeof adminApi.listSessions>>['items'][number];

function AdminSessionsCompactTable({
  items,
  locations,
  qrSessionId,
  onToggleQr,
}: {
  items: AdminSessionItem[];
  locations: { id: string; name: string }[];
  qrSessionId: string | null;
  onToggleQr: (id: string) => void;
}) {
  return (
    <Table>
      <THead><tr><Th>Plate / location</Th><Th>Duration</Th><Th>Session</Th><Th>Payment</Th><Th className="text-right">Amount due</Th><Th className="text-right">Action</Th></tr></THead>
      <TBody>
        {items.map((session) => {
          const sessionView = parkingSessionView(session.status);
          const paymentView = paymentStatusView(session);
          const locationName = session.locationName ?? locations.find((location) => location.id === session.parkingLocationId)?.name ?? 'Unknown location';
          const row = <tr key={session.id}>
            <Td><Link to={`/admin/sessions/${session.id}`} className="font-semibold text-brand-700 hover:underline">{session.plateNumberRaw}</Link><p className="mt-1 text-xs text-slate-500">{locationName}</p></Td>
            <Td className="whitespace-nowrap font-semibold tabular-nums">{formatDuration(Date.now() - new Date(session.entryTime).getTime())}</Td>
            <Td><Badge tone={sessionView.tone}>{sessionView.label}</Badge></Td>
            <Td><Badge tone={paymentView.tone}>{paymentView.label}</Badge></Td>
            <Td className={`text-right font-semibold tabular-nums ${session.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}</Td>
            <Td className="text-right"><Button type="button" size="sm" variant="ghost" onClick={() => onToggleQr(session.id)}><QrCode className="h-3.5 w-3.5" />{qrSessionId === session.id ? 'Hide QR' : 'Show QR'}</Button></Td>
          </tr>;
          return <Fragment key={session.id}>
            {row}
            {qrSessionId === session.id && <tr><td colSpan={6} className="p-3"><SessionQrCard sessionId={session.id} onClose={() => onToggleQr(session.id)} /></td></tr>}
          </Fragment>;
        })}
      </TBody>
    </Table>
  );
}

function MobileAdminSessionCard({
  session,
  locationName,
  qrOpen,
  onToggleQr,
}: {
  session: AdminSessionItem;
  locationName: string;
  qrOpen: boolean;
  onToggleQr: () => void;
}) {
  const sessionView = parkingSessionView(session.status);
  const paymentView = paymentStatusView(session);
  const duration = formatDuration(Date.now() - new Date(session.entryTime).getTime());

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/admin/sessions/${session.id}`} className="block truncate font-mono text-lg font-extrabold uppercase tracking-wide text-brand-700 hover:underline">{session.plateNumberRaw}</Link>
          <p className="mt-1 truncate text-sm text-slate-600">{locationName}</p>
        </div>
        <p className="shrink-0 text-lg font-extrabold tabular-nums text-slate-950">{session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge tone={sessionView.tone}>{sessionView.label}</Badge>
        <Badge tone={paymentView.tone}>{paymentView.label}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-sm">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Duration</p><p className="mt-1 font-semibold tabular-nums text-slate-900">{duration}</p></div>
        <div className="text-right"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entered</p><p className="mt-1 text-slate-700">{formatDateTime(session.entryTime)}</p></div>
      </div>
      <Button type="button" variant="secondary" fullWidth className="mt-4" onClick={onToggleQr}><QrCode className="h-4 w-4" />{qrOpen ? 'Hide QR' : 'Show QR'}</Button>
      {qrOpen && <SessionQrCard sessionId={session.id} onClose={onToggleQr} />}
    </article>
  );
}

function isUnpaidSession(status: string) {
  return ['ActiveUnpaid', 'PaymentPending', 'OverstayDue'].includes(status);
}

function isAttentionSession(status: string, entryTime: string) {
  return isUnpaidSession(status) || isLongRunning(entryTime);
}

function isLongRunning(entryTime: string) {
  return Date.now() - new Date(entryTime).getTime() >= 7 * 24 * 60 * 60 * 1000;
}

function formatDuration(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function parkingSessionView(status: string): { label: string; tone: 'neutral' | 'blue' | 'amber' | 'red' } {
  if (status === 'OverstayDue') return { label: 'Overstay', tone: 'amber' };
  if (status === 'Exited') return { label: 'Closed', tone: 'neutral' };
  if (status === 'Void') return { label: 'Void', tone: 'neutral' };
  if (status === 'Cancelled') return { label: 'Cancelled', tone: 'neutral' };
  return { label: 'Active', tone: 'blue' };
}

function paymentStatusView(session: { status: string; totalPaid: number }): { label: string; tone: 'neutral' | 'green' | 'amber' | 'red' | 'blue' } {
  if (session.status === 'PaidExitWindow' || (session.status === 'Exited' && session.totalPaid > 0)) return { label: 'Paid', tone: 'green' };
  if (session.status === 'PaymentPending') return { label: 'Pending', tone: 'blue' };
  if (session.status === 'OverstayDue') return { label: 'Overdue', tone: 'red' };
  if (session.status === 'ActiveUnpaid') return { label: 'Payment due', tone: 'neutral' };
  if (session.status === 'Exited') return { label: 'No payment', tone: 'neutral' };
  return { label: 'Not applicable', tone: 'neutral' };
}
