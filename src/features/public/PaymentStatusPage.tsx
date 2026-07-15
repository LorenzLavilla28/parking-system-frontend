import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';
import { publicApi } from './api';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/states';
import { formatMoney, formatTime } from '@/lib/format';

const PENDING = new Set(['Pending', 'Processing']);

export function PaymentStatusPage() {
  const { reference = '' } = useParams();

  const status = useQuery({
    queryKey: ['payment-status', reference],
    queryFn: () => publicApi.getPaymentStatus(reference),
    refetchInterval: (query) => (PENDING.has(query.state.data?.status ?? 'Pending') ? 2000 : false),
  });

  if (status.isLoading) {
    return (
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <Spinner className="h-8 w-8 text-brand-600" />
        <p className="font-semibold text-slate-700">Confirming your payment...</p>
        <p className="text-sm text-slate-500">This usually takes a few seconds.</p>
      </Card>
    );
  }
  if (status.isError) return <ErrorState error={status.error} />;

  const s = status.data!;
  const pending = PENDING.has(s.status);

  return (
    <Card className="space-y-5 text-center">
      {pending ? (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Clock3 className="h-7 w-7" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Confirming your payment</h1>
            <p className="mt-1 text-sm text-slate-500">We'll update this screen automatically.</p>
          </div>
        </>
      ) : s.status === 'Paid' ? (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-slate-950">Payment confirmed</h1>
            <p className="mt-2 text-3xl font-bold text-slate-950">{formatMoney(s.amount, s.currency)}</p>
          </div>
          {s.paidExitDeadline && (
            <Alert tone="success">
              Please exit before <strong>{formatTime(s.paidExitDeadline)}</strong>.
            </Alert>
          )}
        </>
      ) : (
        <>
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
            <XCircle className="h-8 w-8" />
          </span>
          <h1 className="text-xl font-bold text-slate-950">Payment {s.status.toLowerCase()}</h1>
          <Alert tone="warning">
            Your payment was not completed. You can return to your session and try again.
          </Alert>
        </>
      )}
    </Card>
  );
}
