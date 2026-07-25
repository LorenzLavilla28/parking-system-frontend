import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, CircleDollarSign, QrCode, Search, ToggleRight } from 'lucide-react';
import { adminApi } from './api';
import { sessionStatusView } from '@/features/guard/sessionStatus';
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

export function AdminSessionsPage() {
  const [params, setParams] = useSearchParams();
  const realtimeStatus = useSessionRealtime({ tenant: true });
  const attention = params.get('attention');
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);
  const locationId = params.get('locationId') ?? '';
  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });

  const sessions = useQuery({
    queryKey: ['admin-sessions', submitted, activeOnly, locationId],
    queryFn: () => adminApi.listSessions({ plate: submitted || undefined, activeOnly, locationId: locationId || undefined }),
  });
  const clearAttention = () => {
    if (!attention) return;
    const next = new URLSearchParams(params);
    next.delete('attention');
    setParams(next);
  };
  const filteredItems = (sessions.data?.items ?? []).filter((session) => {
    if (attention === 'unpaid') return ['ActiveUnpaid', 'PaymentPending'].includes(session.status);
    if (attention === 'over-grace') return session.status === 'OverstayDue';
    if (attention === 'paid-awaiting-exit') return session.status === 'PaidExitWindow';
    return true;
  });
  const totalPaid = filteredItems.reduce((sum, session) => sum + session.totalPaid, 0);
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
        actions={<LiveIndicator status={realtimeStatus} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={CarFront} label="Sessions shown" value={sessions.isLoading ? '...' : filteredItems.length} detail={attention ? filterLabel : activeOnly ? 'Active only' : 'All matching'} tone="blue" />
        <MetricCard icon={CircleDollarSign} label="Paid total" value={formatMoney(totalPaid)} detail="From visible sessions" tone="green" />
        <MetricCard icon={ToggleRight} label="Filter" value={filterLabel} detail="Current result scope" tone="slate" />
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(plate.trim());
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
      {sessions.data && filteredItems.length === 0 && <EmptyState>No sessions found.</EmptyState>}

      {sessions.data && filteredItems.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Plate</Th>
              <Th>Location</Th>
              <Th>Vehicle</Th>
              <Th>Entry</Th>
              <Th>Paid</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr>
          </THead>
          <TBody>
            {filteredItems.map((s) => {
              const view = sessionStatusView(s.status);
              return (
                <tr key={s.id}>
                  <Td className="font-semibold text-slate-900"><Link to={`/admin/payments?sessionId=${s.id}`} className="text-brand-700 hover:underline">{s.plateNumberRaw}</Link></Td>
                  <Td>{s.locationName ?? locations.data?.items.find((location) => location.id === s.parkingLocationId)?.name ?? 'Unknown location'}</Td>
                  <Td>{s.vehicleType}</Td>
                  <Td>{formatDateTime(s.entryTime)}</Td>
                  <Td>{formatMoney(s.totalPaid)}</Td>
                  <Td>
                    <Badge tone={view.tone}>{view.label}</Badge>
                  </Td>
                  <Td><Button type="button" size="sm" variant="ghost" onClick={() => setQrSessionId((current) => current === s.id ? null : s.id)}><QrCode className="h-3.5 w-3.5" />{qrSessionId === s.id ? 'Hide QR' : 'Show QR'}</Button></Td>
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
