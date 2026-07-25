import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck, QrCode, Search, X } from 'lucide-react';
import { guardApi } from './api';
import { useGuardLocations } from './useGuardLocations';
import { sessionStatusView } from './sessionStatus';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Input } from '@/components/ui/Input';
import { buttonClasses, Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { useAuthStore } from '@/lib/auth/store';
import { formatMoney, elapsedSince } from '@/lib/format';
import { SessionQrCard } from './SessionQrCard';

export function GuardSessionsPage() {
  const { selectedId, selected } = useGuardLocations();
  const realtimeStatus = useSessionRealtime({ locationId: selectedId });
  const user = useAuthStore((state) => state.session?.user);
  const isAdminPreview = user?.roles.includes('TenantAdministrator') ?? false;
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState('');
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

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Guard workflow"
        title="Active sessions"
        description={`${isAdminPreview ? 'Admin viewing guard workflow' : 'Operating as Guard'}${selected ? ` · ${selected.name}` : ''}. Find vehicles currently parked and jump straight into exit validation.`}
        actions={<LiveIndicator status={realtimeStatus} />}
      />

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="font-semibold text-slate-900">
            {sessions.isLoading ? 'Loading active vehicles' : `${sessions.data?.items.length ?? 0} active vehicle${sessions.data?.items.length === 1 ? '' : 's'}`}
            {selected ? ` at ${selected.name}` : ''}
          </p>
          {submitted && (
            <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-900" onClick={() => { setPlate(''); setSubmitted(''); }}>
              <X className="h-3.5 w-3.5" />
              Clear search
            </button>
          )}
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(plate.trim());
          }}
        >
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
            placeholder="Search by plate number"
            className="h-10 w-full sm:max-w-sm"
            aria-label="Search by plate number"
          />
          <Button type="submit" size="sm" variant="secondary">
            <Search className="h-4 w-4" />
            Search
          </Button>
        </form>
      </Card>

      {sessions.isLoading && <LoadingState />}
      {sessions.isError && <ErrorState error={sessions.error} />}
      {sessions.data && sessions.data.items.length === 0 && <EmptyState>No active sessions.</EmptyState>}

      {sessions.data && sessions.data.items.length > 0 && (
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
            {sessions.data.items.map((session) => {
              const view = sessionStatusView(session.status);
              return (
                <tr key={session.id}>
                  <Td className="py-2.5 font-mono font-bold tracking-wide text-slate-950">{session.plateNumberRaw}</Td>
                  <Td className="py-2.5">
                    {session.vehicleType}
                    {session.vehicleColor ? ` - ${session.vehicleColor}` : ''}
                  </Td>
                  <Td className="py-2.5">{formatParkingDuration(session.entryTime)}</Td>
                  <Td className="py-2.5">{session.pricingAvailable ? formatMoney(session.currentFee, session.currency) : '—'}</Td>
                  <Td className="py-2.5">{formatMoney(session.totalPaid, session.currency)}</Td>
                  <Td className={`py-2.5 font-semibold ${session.outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : '—'}
                  </Td>
                  <Td className="py-2.5">
                    <Badge tone={view.tone}>{view.label}</Badge>
                  </Td>
                  <Td className="py-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/guard/exit?session=${session.id}`} className={buttonClasses({ variant: 'secondary', size: 'sm', className: 'text-brand-700 ring-brand-200 hover:bg-brand-50' })}>
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        Validate exit
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setQrSessionId((current) => current === session.id ? null : session.id)}>
                        <QrCode className="h-3.5 w-3.5" />
                        {qrSessionId === session.id ? 'Hide QR' : 'Show QR'}
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      )}
      {qrSessionId && <SessionQrCard sessionId={qrSessionId} onClose={() => setQrSessionId(null)} />}
    </div>
  );
}

function formatParkingDuration(entryTime: string) {
  return elapsedSince(entryTime)
    .replace(/(\d+)h/g, '$1 hr')
    .replace(/(\d+)m/g, '$1 min');
}
