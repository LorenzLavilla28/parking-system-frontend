import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CarFront, Check, CreditCard, Mail, Share2, ShieldCheck } from 'lucide-react';
import { publicApi } from './api';
import { paymentStatusView, isResumable, canCheckout } from './status';
import { FeeBreakdown } from './FeeBreakdown';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { elapsedSince, formatMoney, formatDateTime, formatTime } from '@/lib/format';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyDuration(value: string): string {
  return value.replace('h', ' hr').replace('m', ' min');
}

function downloadQrImage(imageUrl: string, paymentReference: string) {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `parking-qr-${paymentReference}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function saveQrImage(imageUrl: string, paymentReference: string) {
  const filename = `parking-qr-${paymentReference}.png`;

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error(`QR image request failed with ${response.status}.`);

    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    const shareData = { files: [file], title: 'Parking payment QR' };

    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      return;
    }
  } catch (error) {
    // A user closing the share sheet is not an error and should not start a
    // second save action. Other share failures fall back to browser download.
    if (error instanceof DOMException && error.name === 'AbortError') return;
  }

  downloadQrImage(imageUrl, paymentReference);
}

export function SessionPage() {
  const { token = '' } = useParams();
  const [email, setEmail] = useState('');
  const [qrPayment, setQrPayment] = useState<Awaited<ReturnType<typeof publicApi.createDynamicQr>> | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [qrHighlighted, setQrHighlighted] = useState(false);
  const qrSectionRef = useRef<HTMLDivElement>(null);

  const session = useQuery({
    queryKey: ['public-session', token],
    queryFn: () => publicApi.getSession(token),
    // While a payment is confirming ('Processing'), keep re-reading so the page flips
    // to Paid automatically if the customer actually completed the checkout.
    refetchInterval: (query) => {
      const paymentStatus = query.state.data?.paymentStatus ?? '';
      if (isResumable(paymentStatus)) return 3000;
      return paymentStatus !== 'Closed' ? 30_000 : false;
    },
  });

  const plateNumber = session.data?.plateNumber?.trim() ?? '';
  const sessionVerified = plateNumber.length > 0;
  const checkoutAllowed = !!session.data && sessionVerified && canCheckout(session.data.paymentStatus);

  const fee = useQuery({
    queryKey: ['public-fee', token],
    queryFn: () => publicApi.getCurrentFee(token),
    enabled: checkoutAllowed,
  });
  const onlinePaymentAvailable = fee.data?.onlinePaymentAvailable === true;
  const cashPaymentAvailable = fee.data?.cashPaymentAvailable === true;

  const emailIsValid = !email.trim() || emailPattern.test(email.trim());
  const pay = useMutation({
    mutationFn: async () => {
      const quote = await publicApi.createQuote(token);
      return publicApi.createDynamicQr({
        feeQuoteId: quote.id,
        email: email.trim() || null,
      });
    },
    onSuccess: (checkout) => {
      setQrPayment(checkout);
    },
  });

  useEffect(() => {
    if (!qrPayment?.expiresAt) return;

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [qrPayment?.expiresAt]);

  useEffect(() => {
    if (!qrPayment?.qrCodeImageUrl) return;

    const frame = window.requestAnimationFrame(() => {
      qrSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setQrHighlighted(true);
    });
    const timeout = window.setTimeout(() => setQrHighlighted(false), 1800);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [qrPayment?.paymentReference, qrPayment?.qrCodeImageUrl]);

  const qrStatus = useQuery({
    queryKey: ['public-payment-status', qrPayment?.paymentReference],
    queryFn: () => publicApi.getPaymentStatus(qrPayment!.paymentReference),
    enabled: !!qrPayment,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'Paid' || status === 'Expired' || status === 'Failed' ? false : 5000;
    },
  });

  const displayDateTime = useMemo(
    () => (session.data ? formatDateTime(session.data.entryTime).replace(', ', ' · ') : ''),
    [session.data],
  );

  if (session.isLoading) return <LoadingState />;
  if (session.isError) return <ErrorState error={session.error} />;
  if (!session.data) return <ErrorState error={new Error('The session response did not contain any data.')} />;

  const s = session.data;
  const view = paymentStatusView(s.paymentStatus);
  const resuming = isResumable(s.paymentStatus);
  const overdue = s.paymentStatus === 'AdditionalPaymentRequired' || s.status === 'OverstayDue';
  const amountDue = fee.data ? formatMoney(fee.data.outstanding, fee.data.currency) : formatMoney(s.currentFee ?? 0);
  const qrAmountDue = qrPayment ? formatMoney(qrPayment.amount, qrPayment.currency) : amountDue;
  const qrExpiresAt = qrPayment?.expiresAt ? new Date(qrPayment.expiresAt).getTime() : null;
  const qrSecondsRemaining = qrExpiresAt === null
    ? null
    : Math.max(0, Math.ceil((qrExpiresAt - now) / 1000));
  const qrTimedOut = qrSecondsRemaining !== null && qrSecondsRemaining <= 0;
  const qrExpired = qrTimedOut || qrStatus.data?.status === 'Expired' || qrStatus.data?.status === 'Failed';
  const qrExpiryLabel = qrSecondsRemaining === null
    ? null
    : `QR expires in ${String(Math.floor(qrSecondsRemaining / 60)).padStart(2, '0')}:${String(qrSecondsRemaining % 60).padStart(2, '0')}`;
  const parkedFor = friendlyDuration(elapsedSince(s.entryTime));

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <CarFront className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vehicle plate</p>
              {sessionVerified ? (
                <p className="truncate text-2xl font-bold tracking-wide text-slate-950">{plateNumber}</p>
              ) : (
                <p className="text-base font-semibold text-red-700">Vehicle not verified</p>
              )}
              <p className="mt-0.5 text-sm text-slate-500">{s.vehicleType || 'Vehicle'}</p>
            </div>
          </div>
          <Badge tone={view.tone}>{view.label}</Badge>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Location</dt>
            <dd className="mt-1 font-semibold text-slate-800">{s.locationName}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Entered</dt>
            <dd className="mt-1 font-semibold text-slate-800">{displayDateTime}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Parked for</dt>
            <dd className="mt-1 font-semibold text-slate-800">{parkedFor}</dd>
          </div>
        </dl>

        {!sessionVerified && (
          <Alert tone="error">
            We couldn’t verify this parking session. Please ask the parking attendant for assistance.
          </Alert>
        )}
        {s.paymentStatus === 'Paid' && (
          <Alert tone="success">
            Paid. Please exit before <strong>{formatTime(s.paidExitDeadline)}</strong>.
          </Alert>
        )}
        {s.paymentStatus === 'AdditionalPaymentRequired' && (
          <Alert tone="warning">
            Your exit window has passed. Please pay the updated outstanding amount before leaving.
          </Alert>
        )}
      </Card>

      {checkoutAllowed && (
        <Card className="space-y-5">
          {resuming && (
            <Alert tone="info">
              Your payment is still being confirmed. If you cancelled or it didn’t go through, you can start again below — if you already paid, this page will update automatically.
            </Alert>
          )}

          <div className="rounded-xl border border-[#B91C1C] bg-gradient-to-br from-[#991B1B] to-[#7F1D1D] p-5 text-white shadow-sm">
            <p className="text-base font-semibold text-white/85">
              {overdue ? 'Amount due' : 'Amount to pay'}
            </p>
            <p className="mt-1 text-5xl font-extrabold tracking-tight text-white">
              {amountDue}
            </p>
          </div>

          {fee.isLoading && <LoadingState label="Calculating fee..." />}
          {!fee.isLoading && fee.data && !fee.data.onlinePaymentAvailable && (
            <Alert tone="info">
              {cashPaymentAvailable
                ? 'Online payments are not set up for this tenant. Please pay the parking attendant in cash.'
                : 'Online payments are not available for this parking location. Please ask the parking attendant for assistance.'}
            </Alert>
          )}
          {fee.data?.pricingAvailable && (
            <>
              <FeeBreakdown
                items={fee.data.breakdown}
                currency={fee.data.currency}
                total={overdue ? fee.data.outstanding : fee.data.totalAmount}
              />
              <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <summary className="cursor-pointer font-medium text-slate-700">Why am I being charged this amount?</summary>
                <p className="mt-2">This amount is calculated from the parking location’s current rate plan and may continue increasing while the vehicle remains parked.</p>
              </details>
            </>
          )}

          {onlinePaymentAvailable && (
            <div className="space-y-3">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email for receipt (optional)"
                  className="pl-9"
                  aria-invalid={email.length > 0 && !emailIsValid}
                />
              </div>
              {!emailIsValid && <p className="text-sm text-red-600">Enter a valid email address or leave this field blank.</p>}
              {pay.isError && <ErrorState error={pay.error} />}
              {qrPayment?.qrCodeImageUrl && !qrExpired ? (
                <div
                  ref={qrSectionRef}
                  className={`space-y-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4 text-center transition-shadow duration-500 ${qrHighlighted ? 'shadow-[0_0_0_4px_rgba(14,116,144,0.2)]' : ''}`}
                >
                  <div>
                    <p className="text-base font-bold text-slate-950">Scan to pay {qrAmountDue}</p>
                    <p className="mt-1 text-sm text-slate-600">Scan this QR using your bank or e-wallet app on another device.</p>
                  </div>
                  <div className="mx-auto flex max-w-xs justify-center rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <img src={qrPayment.qrCodeImageUrl} alt="PayMongo QR Ph payment code" className="h-auto w-full" />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    fullWidth
                    onClick={() => void saveQrImage(qrPayment.qrCodeImageUrl!, qrPayment.paymentReference)}
                  >
                    <Share2 className="h-5 w-5" />
                    Save QR to Photos
                  </Button>
                  {qrExpiryLabel && (
                    <p className="text-sm font-semibold text-amber-700" role="timer" aria-live="polite">
                      {qrExpiryLabel}
                    </p>
                  )}
                  <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    {qrStatus.data?.status === 'Paid' ? 'Payment confirmed.' : 'Waiting for secure payment confirmation…'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qrExpired && (
                    <Alert tone="warning">
                      This payment QR expired before payment was confirmed. Generate a new QR code to try again.
                    </Alert>
                  )}
                  <Button
                    size="lg"
                    fullWidth
                    loading={pay.isPending}
                    disabled={!emailIsValid || !fee.data?.pricingAvailable || pay.isPending}
                    onClick={() => {
                      setQrPayment(null);
                      pay.mutate();
                    }}
                  >
                    <CreditCard className="h-5 w-5" />
                    {qrExpired ? 'Regenerate QR' : 'Generate payment QR'}
                  </Button>
                </div>
              )}
              <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5" />
                Payment is securely processed by PayMongo QR Ph
              </p>
            </div>
          )}
          <p className="text-center text-xs text-slate-500">Need help? Ask the parking attendant.</p>
        </Card>
      )}
    </div>
  );
}
