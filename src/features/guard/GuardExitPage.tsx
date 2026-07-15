import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, QrCode, RotateCw, Search } from 'lucide-react';
import { guardApi } from './api';
import { useGuardLocations } from './useGuardLocations';
import { ExitStatusBanner } from './ExitStatusBanner';
import { CashPaymentForm } from './CashPaymentForm';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { formatMoney, formatTime } from '@/lib/format';

export function GuardExitPage() {
  const { selectedId, selected } = useGuardLocations();
  const realtimeStatus = useSessionRealtime({ locationId: selectedId });
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(params.get('session'));
  const [plate, setPlate] = useState('');
  const [showQr, setShowQr] = useState(false);
  const [override, setOverride] = useState('');
  const [exited, setExited] = useState<{ finalFee: number; exitTime: string } | null>(null);

  useEffect(() => {
    const fromUrl = params.get('session');
    if (fromUrl) setSessionId(fromUrl);
  }, [params]);

  const search = useQuery({
    queryKey: ['exit-search', selectedId, plate],
    queryFn: () => guardApi.searchSessions({ locationId: selectedId ?? undefined, plate, activeOnly: true }),
    enabled: false,
  });

  const status = useQuery({
    queryKey: ['exit-status', sessionId],
    queryFn: () => guardApi.exitStatus(sessionId!),
    enabled: !!sessionId && !exited,
    refetchInterval: 30_000,
  });

  const qr = useQuery({
    queryKey: ['exit-qr', sessionId],
    queryFn: () => guardApi.getQr(sessionId!),
    enabled: !!sessionId && showQr,
  });

  const approve = useMutation({
    mutationFn: () =>
      guardApi.approveExit({
        sessionId: sessionId!,
        overrideReason: override.trim() || null,
        deviceInformation: navigator.userAgent,
      }),
    onSuccess: (res) => {
      setExited({ finalFee: res.finalFee, exitTime: res.exitTime });
      queryClient.invalidateQueries({ queryKey: ['guard-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['exit-search'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['exit-status', sessionId] });

  function selectSession(id: string) {
    setSessionId(id);
    setParams({ session: id });
    setShowQr(false);
    setExited(null);
  }

  if (exited) {
    return (
      <div className="space-y-6">
        <Card className="mx-auto max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-950">Exit approved</h1>
          <p className="text-slate-600">Final fee {formatMoney(exited.finalFee)} at {formatTime(exited.exitTime)}</p>
          <Button
            onClick={() => {
              setSessionId(null);
              setExited(null);
              setPlate('');
              setParams({});
            }}
          >
            Validate another
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Guard workflow"
        title="Exit validation"
        description="Search a vehicle, confirm payment status, collect outstanding balances, and approve exits."
        actions={<LiveIndicator status={realtimeStatus} />}
      />

      {!sessionId && (
        <Card className="p-4">
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              search.refetch();
            }}
          >
            <Input
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              placeholder="Search by plate"
              autoFocus
              className="max-w-xs"
            />
            <Button type="submit" loading={search.isFetching}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </form>

          {search.data && search.data.items.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No active session found for that plate.</p>
          )}
          {search.data && search.data.items.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {search.data.items.map((session) => (
                <li key={session.id}>
                  <button
                    onClick={() => selectSession(session.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="font-semibold text-slate-900">{session.plateNumberRaw}</span>
                    <span className="text-sm text-slate-500">{session.vehicleType}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {sessionId && status.isLoading && <LoadingState />}
      {sessionId && status.isError && <ErrorState error={status.error} />}

      {status.data && (
        <>
          <ExitStatusBanner status={status.data} />

          {status.data.canApproveExit ? (
            <Button size="lg" fullWidth loading={approve.isPending} onClick={() => approve.mutate()}>
              <CheckCircle2 className="h-5 w-5" />
              Approve exit
            </Button>
          ) : status.data.decision !== 'Closed' ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button size="lg" variant="secondary" onClick={() => setShowQr((current) => !current)}>
                  <QrCode className="h-5 w-5" />
                  {showQr ? 'Hide' : 'Display'} payment QR
                </Button>
                <Button size="lg" variant="secondary" onClick={refresh}>
                  <RotateCw className="h-5 w-5" />
                  Refresh status
                </Button>
              </div>

              {showQr && qr.data && (
                <Card className="text-center">
                  <img src={qr.data.qrCodeDataUri} alt="Payment QR" className="mx-auto h-48 w-48 rounded-lg ring-1 ring-slate-200" />
                  <p className="mt-2 break-all text-xs text-slate-500">{qr.data.paymentUrl}</p>
                </Card>
              )}

              {selected?.allowCashPayment && (
                <CashPaymentForm
                  sessionId={sessionId!}
                  amountDue={status.data.outstanding}
                  currency={status.data.currency}
                  onPaid={() => {
                    setShowQr(false);
                    refresh();
                  }}
                />
              )}

              <details className="rounded-lg bg-white/75 p-4 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  Supervisor override
                </summary>
                <div className="mt-3 space-y-2">
                  <Input
                    value={override}
                    onChange={(event) => setOverride(event.target.value)}
                    placeholder="Reason, for example payment provider outage"
                  />
                  {approve.isError && <ErrorState error={approve.error} />}
                  <Button
                    variant="danger"
                    fullWidth
                    disabled={!override.trim()}
                    loading={approve.isPending}
                    onClick={() => approve.mutate()}
                  >
                    Force approve exit
                  </Button>
                </div>
              </details>
            </div>
          ) : (
            <EmptyState>This session is closed.</EmptyState>
          )}

          {approve.isError && status.data.canApproveExit && <ErrorState error={approve.error} />}
          <Button
            variant="ghost"
            onClick={() => {
              setSessionId(null);
              setParams({});
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Search another plate
          </Button>
        </>
      )}

      {!selectedId && <Alert tone="info">Select a location to begin.</Alert>}
    </div>
  );
}
