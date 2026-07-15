import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, Mail, RefreshCw } from 'lucide-react';
import { adminApi } from './api';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime, formatMoney } from '@/lib/format';

const REPORT_HOURS = 3;

export function ReportsPage() {
  const summary = useQuery({
    queryKey: ['admin-operations-summary', REPORT_HOURS],
    queryFn: () => adminApi.getOperationsSummary(REPORT_HOURS),
  });
  const send = useMutation({
    mutationFn: () => adminApi.sendOperationsSummaryEmail(REPORT_HOURS),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Reports"
        description="Review the latest three hours of activity and send the same digest to the tenant administrators."
        actions={(
          <Button onClick={() => send.mutate()} loading={send.isPending}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            {send.isPending ? 'Queueing...' : 'Send report now'}
          </Button>
        )}
      />

      {summary.isError && <ErrorState error={summary.error} />}
      {send.isError && <ErrorState error={send.error} />}
      {send.isSuccess && (
        <Alert tone="success">
          Report queued for {send.data.recipientsQueued} tenant administrator{send.data.recipientsQueued === 1 ? '' : 's'}.
          The email dispatcher will deliver it shortly.
        </Alert>
      )}

      {summary.isLoading && <LoadingState label="Preparing the latest operations summary..." />}
      {summary.data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
            <span>{formatDateTime(summary.data.periodStart)} – {formatDateTime(summary.data.periodEnd)}</span>
            <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Automatic digest every 3 hours</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Revenue" value={formatMoney(summary.data.revenue, summary.data.currency)} detail="Successful payments" tone="green" />
            <MetricCard label="Session entries" value={summary.data.sessionEntries} detail="During this period" tone="blue" />
            <MetricCard label="Session exits" value={summary.data.sessionExits} detail={`${summary.data.activeSessions} active now`} tone="slate" />
            <MetricCard label="Overstays" value={summary.data.overstays} detail="Require review" tone={summary.data.overstays > 0 ? 'amber' : 'green'} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <h2 className="text-base font-bold text-slate-950">Payment reconciliation</h2>
              <p className="mt-1 text-sm text-slate-500">Attempts created or settled during the selected period.</p>
              <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Count</th><th className="px-4 py-3 text-right">Amount</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {summary.data.paymentBreakdown.map((item) => (
                      <tr key={item.label}>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.label}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{item.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatMoney(item.amount, summary.data.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Pending: {formatMoney(summary.data.pendingAmount, summary.data.currency)} · Failed/closed: {formatMoney(summary.data.failedAmount, summary.data.currency)} · Failed webhooks: {summary.data.failedWebhooks}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Attention required</h2>
                  <p className="mt-1 text-sm text-slate-500">Exceptions included in the digest email.</p>
                </div>
                <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden="true" />
              </div>
              <div className="mt-4 space-y-3">
                {summary.data.attention.length === 0 && <Alert tone="success">No review items were detected.</Alert>}
                {summary.data.attention.map((item) => (
                  <div key={`${item.title}-${item.detail}`} className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                    <p className="font-semibold text-amber-950">{item.title}</p>
                    <p className="mt-1 text-sm text-amber-900">{item.detail}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
