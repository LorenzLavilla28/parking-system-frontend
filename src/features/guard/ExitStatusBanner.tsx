import { AlertTriangle, CheckCircle2, CircleDollarSign, XCircle } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { formatDateTime, formatMoney, formatTime } from '@/lib/format';
import type { ExitStatus } from './api';

const styles: Record<ExitStatus['decision'], { box: string; title: string; icon: typeof CheckCircle2; iconBox: string }> = {
  Paid: { box: 'bg-emerald-50 ring-emerald-200', title: 'PAID', icon: CheckCircle2, iconBox: 'bg-emerald-600 text-white' },
  Free: { box: 'bg-emerald-50 ring-emerald-200', title: 'FREE EXIT', icon: CheckCircle2, iconBox: 'bg-emerald-600 text-white' },
  NotPaid: { box: 'bg-red-50 ring-red-200', title: 'NOT PAID', icon: XCircle, iconBox: 'bg-red-600 text-white' },
  AdditionalPaymentRequired: { box: 'bg-amber-50 ring-amber-200', title: 'ADDITIONAL PAYMENT REQUIRED', icon: AlertTriangle, iconBox: 'bg-amber-500 text-white' },
  Closed: { box: 'bg-slate-50 ring-slate-200', title: 'CLOSED', icon: CircleDollarSign, iconBox: 'bg-slate-600 text-white' },
};

export function ExitStatusBanner({ status }: { status: ExitStatus }) {
  const s = styles[status.decision];
  const Icon = s.icon;
  return (
    <div className={cn('rounded-xl px-6 py-6 shadow-sm ring-1', s.box)}>
      <span className={cn('mx-auto flex h-14 w-14 items-center justify-center rounded-2xl', s.iconBox)}>
        <Icon className="h-7 w-7" />
      </span>
      <p className="mt-3 text-center text-2xl font-extrabold tracking-wide text-slate-900">{s.title}</p>
      <p className="mt-1 text-center text-3xl font-bold tracking-wider text-slate-900">
        {status.plateNumberRaw}
      </p>

      <dl className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-3 text-sm">
        <dt className="text-slate-500">Current fee</dt>
        <dd className="text-right font-semibold text-slate-900">
          {formatMoney(status.currentFee, status.currency)}
        </dd>
        <dt className="text-slate-500">Amount paid</dt>
        <dd className="text-right font-semibold text-slate-900">
          {formatMoney(status.totalPaid, status.currency)}
        </dd>
        {status.outstanding > 0 && (
          <>
            <dt className="text-slate-500">Outstanding</dt>
            <dd className="text-right font-bold text-red-700">
              {formatMoney(status.outstanding, status.currency)}
            </dd>
          </>
        )}
        {status.paidExitDeadline && (
          <>
            <dt className="text-slate-500">{status.decision === 'Paid' ? 'Exit before' : 'Exit deadline'}</dt>
            <dd className="text-right font-semibold text-slate-900">{status.decision === 'Paid' ? formatTime(status.paidExitDeadline) : formatDateTime(status.paidExitDeadline)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
