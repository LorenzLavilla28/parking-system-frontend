import { useState } from 'react';
import { ArrowLeft, CheckCircle2, ExternalLink, QrCode, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { guardApi } from '@/features/guard/api';
import { SessionQrCard } from '@/features/guard/SessionQrCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { elapsedSince, formatDateTime, formatMoney } from '@/lib/format';

export function SessionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [showQr, setShowQr] = useState(false);

  const session = useQuery({
    queryKey: ['admin-session', id],
    queryFn: () => guardApi.getSession(id!),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });

  if (!id) return <ErrorState error={new Error('The parking session could not be identified.')} />;
  if (session.isLoading) return <LoadingState label="Loading parking session..." />;
  if (session.isError || !session.data) return <ErrorState error={session.error} />;

  const current = session.data;
  const sessionView = sessionStatusView(current.status);
  const paymentView = paymentStatusView(current);
  const isActive = !['Exited', 'Void', 'Cancelled'].includes(current.status);
  const balanceDue = current.pricingAvailable ? current.outstanding : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Parking session"
        title={current.plateNumberRaw}
        description={`${current.locationName ?? 'Unknown location'} · ${isActive ? 'Currently parked' : 'Session closed'}`}
        actions={<Link to="/admin/sessions" className={buttonClasses({ variant: 'secondary' })}><ArrowLeft className="h-4 w-4" /> All sessions</Link>}
      />

      <Card className={current.status === 'OverstayDue' ? 'ring-2 ring-amber-200' : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Session status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={sessionView.tone}>{sessionView.label}</Badge>
              <Badge tone={paymentView.tone}>{paymentView.label}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {isActive ? `Active for ${elapsedSince(current.entryTime)}` : 'This parking session is no longer active.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isActive && <button type="button" className={buttonClasses({ variant: 'secondary' })} onClick={() => setShowQr((open) => !open)}><QrCode className="h-4 w-4" />{showQr ? 'Hide payment QR' : 'Show payment QR'}</button>}
            {isActive && <Link to={`/guard/exit?session=${encodeURIComponent(current.id)}`} className={buttonClasses({ variant: 'primary' })}><CheckCircle2 className="h-4 w-4" /> Validate exit</Link>}
          </div>
        </div>

        {current.status === 'OverstayDue' && (
          <div className="mt-5 flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p>Payment coverage has expired. The vehicle is still parked and has an estimated balance of <strong>{moneyOrUnavailable(balanceDue, current.currency)}</strong>.</p>
          </div>
        )}

        {current.notes && (
          <div className="mt-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-950 ring-1 ring-blue-200">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Guard note</p>
            <p className="mt-1 font-medium">{current.notes}</p>
          </div>
        )}

        <dl className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Vehicle" value={current.vehicleType} />
          <Definition label="Entry" value={formatDateTime(current.entryTime)} />
          <Definition label="Current session fee" value={moneyOrUnavailable(current.pricingAvailable ? current.currentFee : null, current.currency)} />
          <Definition label="Amount paid" value={formatMoney(current.totalPaid, current.currency)} />
          <Definition label="Balance due" value={moneyOrUnavailable(balanceDue, current.currency)} emphasis={balanceDue != null && balanceDue > 0} />
          <Definition label="Payment coverage" value={current.paidExitDeadline ? `Until ${formatDateTime(current.paidExitDeadline)}` : 'Not paid'} />
        </dl>
      </Card>

      {showQr && <SessionQrCard sessionId={current.id} onClose={() => setShowQr(false)} />}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-950">What happens next</h2>
            <p className="mt-1 text-sm text-slate-600">Use this view to review the live session. Payment records appear in Revenue &amp; Payments only after a payment attempt is created.</p>
          </div>
          <Link to={`/guard/exit?session=${encodeURIComponent(current.id)}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Open exit workflow <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </Card>
    </div>
  );
}

function Definition({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 font-semibold tabular-nums ${emphasis ? 'text-amber-700' : 'text-slate-900'}`}>{value}</dd></div>;
}

function moneyOrUnavailable(value: number | null | undefined, currency: string) {
  return value == null || !Number.isFinite(value) ? 'Not calculated' : formatMoney(value, currency);
}

function sessionStatusView(status: string): { label: string; tone: 'neutral' | 'blue' | 'amber' | 'red' } {
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
