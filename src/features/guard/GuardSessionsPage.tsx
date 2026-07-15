import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, ClipboardCheck, Search } from 'lucide-react';
import { guardApi } from './api';
import { useGuardLocations } from './useGuardLocations';
import { sessionStatusView } from './sessionStatus';
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
import { formatMoney, elapsedSince } from '@/lib/format';

export function GuardSessionsPage() {
  const { selectedId } = useGuardLocations();
  const realtimeStatus = useSessionRealtime({ locationId: selectedId });
  const [plate, setPlate] = useState('');
  const [submitted, setSubmitted] = useState('');

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guard workflow"
        title="Active sessions"
        description="Find vehicles currently parked and jump straight into exit validation."
        actions={<LiveIndicator status={realtimeStatus} />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard icon={CarFront} label="Active shown" value={sessions.data?.items.length ?? '...'} detail="For selected location" tone="blue" />
        <MetricCard icon={ClipboardCheck} label="Next step" value="Validate" detail="Approve paid exits or collect balance" tone="green" />
      </div>

      <Card className="p-4">
        <form
          className="flex flex-wrap gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(plate.trim());
          }}
        >
          <Input
            value={plate}
            onChange={(event) => setPlate(event.target.value.toUpperCase())}
            placeholder="Search by plate"
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary">
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
              <Th>Duration</Th>
              <Th>Paid</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {sessions.data.items.map((session) => {
              const view = sessionStatusView(session.status);
              return (
                <tr key={session.id}>
                  <Td className="font-semibold text-slate-900">{session.plateNumberRaw}</Td>
                  <Td>
                    {session.vehicleType}
                    {session.vehicleColor ? ` - ${session.vehicleColor}` : ''}
                  </Td>
                  <Td>{elapsedSince(session.entryTime)}</Td>
                  <Td>{formatMoney(session.totalPaid)}</Td>
                  <Td>
                    <Badge tone={view.tone}>{view.label}</Badge>
                  </Td>
                  <Td>
                    <Link to={`/guard/exit?session=${session.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                      <ClipboardCheck className="h-3.5 w-3.5" />
                      Validate exit
                    </Link>
                  </Td>
                </tr>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
