import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, QrCode, RotateCw, Search } from 'lucide-react';
import { guardApi } from './api';
import { useGuardLocations } from './useGuardLocations';
import { ExitStatusBanner } from './ExitStatusBanner';
import { CashPaymentForm } from './CashPaymentForm';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { elapsedSince, formatDateTime, formatMoney, formatTime } from '@/lib/format';

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
    queryFn: () => guardApi.searchSessions({ locationId: selectedId ?? undefined, plate: normalizePlateForSearch(plate), activeOnly: true }),
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
        <div className="space-y-4">
          <Card className="p-4">
            <form
              className="flex flex-col gap-3 sm:flex-row"
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
                className="w-full sm:max-w-sm"
                aria-label="Search by plate"
              />
              <Button type="submit" loading={search.isFetching}>
                <Search className="h-4 w-4" />
                Search
              </Button>
            </form>
          </Card>

          {search.data && (
            <section className="rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Search results</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {search.data.items.length === 1 ? '1 vehicle found' : `${search.data.items.length} vehicles found`} for <span className="font-semibold text-slate-950">“{plate.trim()}”</span>
                  </p>
                </div>
                <Badge tone="blue">{search.data.items.length} {search.data.items.length === 1 ? 'result' : 'results'}</Badge>
              </div>

              {search.data.items.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No active vehicle was found for this plate.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {search.data.items.map((session) => {
                    const payment = paymentView(session.status, session.outstanding, session.totalPaid);
                    return (
                      <li key={session.id}>
                        <button
                          type="button"
                          onClick={() => selectSession(session.id)}
                          className="group w-full rounded-lg bg-white p-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-brand-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="text-lg font-extrabold tracking-tight text-slate-950">{session.plateNumberRaw}</p>
                              <p className="mt-1 text-sm text-slate-600">
                                {session.vehicleType} <span className="text-slate-400">·</span> Entered {formatTime(session.entryTime)} <span className="text-slate-400">·</span> Parked for {elapsedSince(session.entryTime)}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">{formatDateTime(session.entryTime).replace(' at ', ' · ')}</p>
                            </div>
                            <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                              <Badge tone={payment.tone}>{payment.label}</Badge>
                              <div className="text-left sm:text-right">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount due</p>
                                <p className={`mt-0.5 text-lg font-bold ${session.pricingAvailable ? 'text-slate-950' : 'text-slate-500'}`}>
                                  {session.pricingAvailable ? formatMoney(session.outstanding, session.currency) : 'Unavailable'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-700 group-hover:text-brand-900">
                              Review exit
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
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

              {status.data.status === 'OverstayDue' && (
                <Alert tone="error">This session is overdue. Exit approval is unavailable until the outstanding balance is paid.</Alert>
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

              {status.data.status !== 'OverstayDue' && <details className="rounded-lg bg-white/75 p-4 ring-1 ring-slate-200">
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
              </details>}
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

function normalizePlateForSearch(value: string) {
  return value.toUpperCase().replace(/[\s-]+/g, '');
}

function paymentView(status: string, outstanding: number, totalPaid: number): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (status === 'PaymentPending') return { label: 'Payment pending', tone: 'red' };
  if (status === 'OverstayDue') return { label: 'Overstay due', tone: 'red' };
  if (outstanding > 0) return { label: 'Unpaid', tone: 'amber' };
  if (totalPaid > 0) return { label: 'Paid', tone: 'green' };
  return { label: 'No payment due', tone: 'green' };
}
