import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Banknote, ReceiptText } from 'lucide-react';
import { guardApi, type CashReceipt } from './api';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ErrorState } from '@/components/ui/states';
import { formatMoney } from '@/lib/format';

export function CashPaymentForm({
  sessionId,
  amountDue,
  currency,
  onPaid,
}: {
  sessionId: string;
  amountDue: number;
  currency: string;
  onPaid: (receipt: CashReceipt) => void;
}) {
  const [received, setReceived] = useState('');
  const receivedNum = Number(received) || 0;
  const change = Math.max(0, receivedNum - amountDue);

  const cash = useMutation({
    mutationFn: () => guardApi.recordCash({ sessionId, amountReceived: receivedNum }),
    onSuccess: onPaid,
  });

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
          <Banknote className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-bold text-slate-950">Record cash payment</h3>
          <p className="text-sm text-slate-500">Confirm cash received before approving exit.</p>
        </div>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Amount due</span>
        <span className="font-semibold text-slate-900">{formatMoney(amountDue, currency)}</span>
      </div>

      <FormField label="Amount received" htmlFor="received">
        <Input
          id="received"
          type="number"
          inputMode="decimal"
          min={amountDue}
          step="0.01"
          value={received}
          onChange={(e) => setReceived(e.target.value)}
        />
      </FormField>

      <div className="flex justify-between text-sm">
        <span className="text-slate-500">Change</span>
        <span className="font-semibold text-slate-900">{formatMoney(change, currency)}</span>
      </div>

      {cash.isError && <ErrorState error={cash.error} />}
      {receivedNum > 0 && receivedNum < amountDue && (
        <Alert tone="warning">Amount received is less than the amount due.</Alert>
      )}

      <Button
        size="lg"
        fullWidth
        loading={cash.isPending}
        disabled={receivedNum < amountDue}
        onClick={() => cash.mutate()}
      >
        <ReceiptText className="h-5 w-5" />
        Confirm cash payment
      </Button>
    </Card>
  );
}
