import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi, type PaymentOverride } from './api';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatMoney, formatPaymentTimestamp } from '@/lib/format';

export function AdjustmentHistoryPage() {
  const overrides = useQuery({
    queryKey: ['admin-payment-overrides-history'],
    queryFn: () => adminApi.listPaymentOverrides({ pageSize: 100 }),
  });
  const items = overrides.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Parking sessions"
        title="Adjustment history"
        description="Review supervisor-approved exits, waived balances, and complimentary parking actions."
        actions={<Link to="/admin/payments" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /> Payments &amp; Revenue</Link>}
      />

      <Card className="p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-950">Supervisor adjustment activity</h2>
              <p className="mt-1 text-sm text-slate-500">Override cash is recorded separately as revenue and remains visible on the related payment.</p>
            </div>
            <Badge tone="blue">{items.length} recent</Badge>
          </div>
        </div>
        {overrides.isLoading && <div className="p-5"><LoadingState label="Loading adjustment history..." /></div>}
        {overrides.error != null && <div className="p-5"><ErrorState error={overrides.error} /></div>}
        {!overrides.isLoading && overrides.error == null && items.length === 0 && <div className="p-5"><EmptyState>No supervisor adjustments have been recorded.</EmptyState></div>}
        {!overrides.isLoading && overrides.error == null && items.length > 0 && <AdjustmentTable items={items} />}
      </Card>
    </div>
  );
}

function AdjustmentTable({ items }: { items: PaymentOverride[] }) {
  return (
    <Table>
      <THead><tr><Th>Time</Th><Th>Plate / location</Th><Th>Adjustment</Th><Th>Reason</Th><Th>Approved by</Th><Th>Financial outcome</Th><Th>Payments</Th></tr></THead>
      <TBody>
        {items.map((item) => (
          <tr key={item.id}>
            <Td>{formatPaymentTimestamp(item.createdAt)}</Td>
            <Td><p className="font-mono font-semibold uppercase text-slate-950">{item.plateNumberRaw}</p><p className="mt-1 text-xs text-slate-500">{item.locationName}</p></Td>
            <Td><Badge tone="blue">{item.label}</Badge></Td>
            <Td className="max-w-72"><span title={item.reason}>{item.reason}</span></Td>
            <Td>{item.performedBy}</Td>
            <Td className="whitespace-nowrap text-xs text-slate-600"><div className="space-y-0.5"><p>Paid: <span className="font-semibold text-slate-800">{formatMoney(item.totalPaid)}</span></p><p>Final: <span className="font-semibold text-slate-800">{formatMoney(item.finalFee ?? item.feeOverride)}</span></p></div></Td>
            <Td><Link to={`/admin/payments?sessionId=${encodeURIComponent(item.parkingSessionId)}`} className="text-xs font-bold text-brand-700 hover:underline">View payments</Link></Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}
