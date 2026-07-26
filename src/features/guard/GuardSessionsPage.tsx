import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck, QrCode, Search, X } from 'lucide-react';
import { guardApi, type SessionSummary } from './api';
import { useGuardLocations } from './useGuardLocations';
import { sessionStatusView } from './sessionStatus';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Input } from '@/components/ui/Input';
import { buttonClasses, Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { useAuthStore } from '@/lib/auth/store';
import { formatMoney, elapsedSince } from '@/lib/format';
import { SessionQrCard } from './SessionQrCard';

type SessionFilter = 'all' | 'paid' | 'unpaid' | 'overstay';

export function GuardSessionsPage() {
  const { selectedId, selected } = useGuardLocations();
  const realtimeStatus = useSessionRealtime({ locationId: selectedId });
  const user = useAuthStore((state) => state.session?.user);
  const isAdminPreview = user?.roles.includes('TenantAdministrator') ?? false;
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [statusFilter, setStatusFilter] = useState<SessionFilter>('all');
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);

  const sessions = useQuery({
    queryKey: ['guard-sessions', selectedId, submitted],
    queryFn: () =>
      guardApi.searchSessions({
        locationId: selectedId ?? undefined,
        plate: submitted || undefined,
        activeOnly: true,
      }),
    enabled: !!selectedId,
  });

  const items = sessions.data?.items ?? [];
  const visibleSessions = useMemo(
    () => items
      .filter((session) => matchesFilter(session, statusFilter))
      .sort((a, b) => urgencyRank(a.status) - urgencyRank(b.status) || b.entryTime.localeCompare(a.entryTime)),
    [items, statusFilter],
  );

  const clearSearch = () => {
    setPlate('');
    setSubmitted('');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/65 p-4 shadow-sm ring-1 ring-white/80 backdrop-blur sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="hidden text-xs font-bold uppercase tracking-wide text-brand-700 sm:block">Guard workflow</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Active sessions</h1>
            <p className="mt-1 text-base text-slate-600 sm:text-sm">
              {selected?.name ?? 'Working location'} · {items.length} active vehicle{items.length === 1 ? '' : 's'}
            </p>
            <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-slate-600 sm:block">
              {isAdminPreview ? 'Admin preview of the guard workflow.' : 'Find vehicles currently parked and validate exits quickly.'}
            </p>
          </div>
          <span className="shrink-0 sm:hidden" aria-label={realtimeStatus === 'live' ? 'Online' : undefined}>
            <LiveIndicator status={realtimeStatus} compact />
            <span className="sr-only">{realtimeStatus === 'live' ? 'Online' : realtimeStatus}</span>
          </span>
          <span className="hidden shrink-0 sm:block">
            <LiveIndicator status={realtimeStatus} />
          </span>
        </div>
      </div>

      {isAdminPreview && (
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-900 ring-1 ring-brand-100">
          Admin preview · actions behave as they do for a guard.
        </div>
      )}

      <Card className="space-y-3 p-3 sm:p-4">
        <form
          className="relative"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(plate.trim());
          }}
        >
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
            placeholder="Search plate number"
            className="h-12 pl-11 pr-24 text-base"
            aria-label="Search plate number"
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            {plate && (
              <button type="button" onClick={clearSearch} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Clear search">
                <X className="h-5 w-5" />
              </button>
            )}
            <button type="submit" className="rounded-md p-2 text-brand-700 hover:bg-brand-50" aria-label="Search">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Session status filters">
          <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All {items.length}</FilterButton>
          <FilterButton active={statusFilter === 'paid'} onClick={() => setStatusFilter('paid')}>Paid {countStatus(items, 'paid')}</FilterButton>
          <FilterButton active={statusFilter === 'unpaid'} onClick={() => setStatusFilter('unpaid')}>Unpaid {countStatus(items, 'unpaid')}</FilterButton>
          <FilterButton active={statusFilter === 'overstay'} onClick={() => setStatusFilter('overstay')}>Overstay {countStatus(items, 'overstay')}</FilterButton>
        </div>
      </Card>

      {sessions.isLoading && <LoadingState />}
      {sessions.isError && <ErrorState error={sessions.error} />}
      {sessions.data && visibleSessions.length === 0 && <EmptyState>{statusFilter === 'all' ? 'No active sessions.' : 'No sessions match this filter.'}</EmptyState>}

      {visibleSessions.length > 0 && (
        <>
          <div className="space-y-3 md:hidden">
            {visibleSessions.map((session) => (
              <MobileSessionCard key={session.id} session={session} qrSessionId={qrSessionId} onToggleQr={setQrSessionId} />
            ))}
          </div>

          <div className="hidden md:block">
            <DesktopSessionTable sessions={visibleSessions} qrSessionId={qrSessionId} onToggleQr={setQrSessionId} />
          </div>
        </>
      )}

      {qrSessionId && <SessionQrCard sessionId={qrSessionId} onClose={() => setQrSessionId(null)} />}
    </div>
  );
}

function DesktopSessionTable({ sessions, qrSessionId, onToggleQr }: { sessions: SessionSummary[]; qrSessionId: string | null; onToggleQr: (id: string) => void }) {
  return (
    <Table>
      <THead>
        <tr>
          <Th>Plate</Th>
          <Th>Vehicle</Th>
          <Th>Parked for</Th>
          <Th>Total charge</Th>
          <Th>Amount paid</Th>
          <Th>Balance due</Th>
          <Th>Payment status</Th>
          <Th>Action</Th>
        </tr>
      </THead>
      <TBody>
        {sessions.map((session) => {
          const view = sessionStatusView(session.status);
          return (
            <tr key={session.id}>
              <Td className="py-2.5 font-mono font-bold tracking-wide text-slate-950">{session.plateNumberRaw}</Td>
              <Td className="py-2.5">{session.vehicleType}{session.vehicleColor ? ` - ${session.vehicleColor}` : ''}</Td>
              <Td className="py-2.5">{formatParkingDuration(session.entryTime)}</Td>
              <Td className="py-2.5">{session.pricingAvailable ? formatMoney(session.currentFee, session.currency) : '—'}</Td>
              <Td className="py-2.5">{formatMoney(session.totalPaid, session.currency)}</Td>
              <Td className={`py-2.5 font-semibold ${session.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                {session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}
              </Td>
              <Td className="py-2.5"><Badge tone={view.tone}>{view.label}</Badge></Td>
              <Td className="py-2.5">
                <SessionActions session={session} qrSessionId={qrSessionId} onToggleQr={onToggleQr} />
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );
}

function MobileSessionCard({ session, qrSessionId, onToggleQr }: { session: SessionSummary; qrSessionId: string | null; onToggleQr: (id: string) => void }) {
  const view = sessionStatusView(session.status);
  const isOverstay = session.status === 'OverstayDue';

  return (
    <article className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <Link to={`/guard/exit?session=${session.id}`} className="block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-xl font-extrabold tracking-wide text-slate-950">{session.plateNumberRaw}</p>
          <Badge tone={view.tone}>{view.label}</Badge>
        </div>
        <p className="mt-2 text-base font-medium text-slate-700">
          {session.vehicleType} · Parked for {formatParkingDuration(session.entryTime)}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
          <div>
            <p className="text-sm font-semibold text-slate-500">Balance due</p>
            <p className={`mt-0.5 text-xl font-extrabold ${session.outstanding > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}
            </p>
          </div>
          <p className="text-right text-sm text-slate-500">
            {isOverstay ? 'Paid' : 'Total charge'} {isOverstay ? formatMoney(session.totalPaid, session.currency) : formatMoney(session.currentFee, session.currency)}
            <br />
            {isOverstay ? `Additional charge ${formatMoney(session.outstanding, session.currency)}` : `Paid ${formatMoney(session.totalPaid, session.currency)}`}
          </p>
        </div>
      </Link>

      <div className="mt-4 grid gap-3">
        <Link to={`/guard/exit?session=${session.id}`} className={buttonClasses({ variant: 'primary', size: 'lg', fullWidth: true, className: 'h-12' })}>
          <ClipboardCheck className="h-4 w-4" />
          {isOverstay ? 'Review and validate exit' : 'Validate exit'}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Button type="button" size="lg" variant="secondary" fullWidth className="h-12" onClick={() => onToggleQr(qrSessionId === session.id ? '' : session.id)}>
          <QrCode className="h-4 w-4" />
          {qrSessionId === session.id ? 'Hide QR' : 'Show QR'}
        </Button>
      </div>
    </article>
  );
}

function SessionActions({ session, qrSessionId, onToggleQr }: { session: SessionSummary; qrSessionId: string | null; onToggleQr: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link to={`/guard/exit?session=${session.id}`} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'text-brand-700 ring-brand-200 hover:bg-brand-50' })}>
        <ClipboardCheck className="h-3.5 w-3.5" />
        Validate exit
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
      <Button type="button" size="sm" variant="ghost" onClick={() => onToggleQr(qrSessionId === session.id ? '' : session.id)}>
        <QrCode className="h-3.5 w-3.5" />
        {qrSessionId === session.id ? 'Hide QR' : 'Show QR'}
      </Button>
    </div>
  );
}

function FilterButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-12 shrink-0 rounded-full px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${active ? 'bg-brand-700 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  );
}

function matchesFilter(session: SessionSummary, filter: SessionFilter) {
  if (filter === 'all') return true;
  if (filter === 'overstay') return session.status === 'OverstayDue';
  if (filter === 'paid') return session.status === 'PaidExitWindow';
  return session.status === 'ActiveUnpaid' || session.status === 'PaymentPending';
}

function countStatus(sessions: SessionSummary[], filter: Exclude<SessionFilter, 'all'>) {
  return sessions.filter((session) => matchesFilter(session, filter)).length;
}

function urgencyRank(status: string) {
  if (status === 'OverstayDue') return 0;
  if (status === 'ActiveUnpaid' || status === 'PaymentPending') return 1;
  if (status === 'PaidExitWindow') return 2;
  return 3;
}

function formatParkingDuration(entryTime: string) {
  return elapsedSince(entryTime)
    .replace(/(\d+)h/g, '$1 hr')
    .replace(/(\d+)m/g, '$1 min');
}
