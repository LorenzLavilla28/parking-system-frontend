import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CarFront, CreditCard, Mail, ShieldCheck } from 'lucide-react';
import { publicApi } from './api';
import { paymentStatusView, isResumable, canCheckout } from './status';
import { FeeBreakdown } from './FeeBreakdown';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Input } from '@/components/ui/Input';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { formatMoney, formatDateTime, formatTime } from '@/lib/format';

export function SessionPage() {
  const { token = '' } = useParams();
  const [email, setEmail] = useState('');

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
  const fee = useQuery({
    queryKey: ['public-fee', token],
    queryFn: () => publicApi.getCurrentFee(token),
    enabled: !!session.data && canCheckout(session.data.paymentStatus),
  });

  const pay = useMutation({
    mutationFn: async () => {
      const quote = await publicApi.createQuote(token);
      return publicApi.createCheckout({
        feeQuoteId: quote.id,
        email: email.trim() || null,
      });
    },
    onSuccess: (checkout) => {
      window.location.href = checkout.checkoutUrl;
    },
  });

  if (session.isLoading) return <LoadingState />;
  if (session.isError) return <ErrorState error={session.error} />;

  const s = session.data!;
  const view = paymentStatusView(s.paymentStatus);
  const resuming = isResumable(s.paymentStatus);
  const showCheckout = canCheckout(s.paymentStatus);
  const amountDue = fee.data ? formatMoney(fee.data.outstanding, fee.data.currency) : formatMoney(s.currentFee ?? 0);

  return (
    <div className="space-y-4">
      <Card className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <CarFront className="h-6 w-6" />
            </span>
            <div>
              <p className="text-sm text-slate-500">Plate</p>
              <p className="text-2xl font-bold tracking-wide text-slate-950">{s.maskedPlate}</p>
            </div>
          </div>
          <Badge tone={view.tone}>{view.label}</Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Location</dt>
            <dd className="mt-1 font-semibold text-slate-800">{s.locationName}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-slate-500">Entry time</dt>
            <dd className="mt-1 font-semibold text-slate-800">{formatDateTime(s.entryTime)}</dd>
          </div>
        </dl>

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

      {showCheckout && (
        <Card className="space-y-5">
          {resuming && (
            <Alert tone="info">
              Your payment is still being confirmed. If you cancelled or it didn't go through,
              you can start again below — if you already paid, this page will update automatically.
            </Alert>
          )}

          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Amount due</p>
            <p className="mt-1 text-3xl font-bold">{amountDue}</p>
          </div>

          {fee.isLoading && <LoadingState label="Calculating fee..." />}
          {fee.data?.pricingAvailable && (
            <FeeBreakdown
              items={fee.data.breakdown}
              currency={fee.data.currency}
              total={s.paymentStatus === 'AdditionalPaymentRequired' ? fee.data.outstanding : fee.data.totalAmount}
            />
          )}

          <div className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email for receipt (optional)"
                className="pl-9"
              />
            </div>
            {pay.isError && <ErrorState error={pay.error} />}
            <Button size="lg" fullWidth loading={pay.isPending} onClick={() => pay.mutate()}>
              <CreditCard className="h-5 w-5" />
              {resuming ? 'Resume payment' : 'Pay securely'}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              You'll be redirected to PayMongo to complete payment securely.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
