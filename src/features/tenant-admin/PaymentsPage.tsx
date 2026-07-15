import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarRange, CircleDollarSign, Download, ExternalLink, Search, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { adminApi, type PaymentDetail, type PaymentQuery, type PaymentSummary } from './api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { formatDateTime, formatMoney } from '@/lib/format';
import { useSessionRealtime } from '@/lib/realtime/useSessionRealtime';
import { LiveIndicator } from '@/components/ui/LiveIndicator';

export function PaymentsPage() {
  const realtimeStatus = useSessionRealtime({ tenant: true });
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [provider, setProvider] = useState(params.get('provider') ?? '');
  const [method, setMethod] = useState(params.get('paymentMethod') ?? '');
  const [from, setFrom] = useState(params.get('from') ?? '');
  const [to, setTo] = useState(params.get('to') ?? '');
  const [page, setPage] = useState(Number(params.get('page') ?? 1) || 1);
  const selectedId = params.get('paymentId');

  const query = useMemo<PaymentQuery>(() => ({
    search: params.get('search') || undefined,
    status: params.get('status') || undefined,
    provider: params.get('provider') || undefined,
    paymentMethod: params.get('paymentMethod') || undefined,
    sessionId: params.get('sessionId') || undefined,
    from: params.get('from') ? `${params.get('from')}T00:00:00Z` : undefined,
    to: params.get('to') ? `${params.get('to')}T23:59:59.999Z` : undefined,
    page,
    pageSize: 25,
  }), [page, params]);

  const payments = useQuery({
    queryKey: ['admin-payments', query],
    queryFn: () => adminApi.listPayments(query),
  });
  const detail = useQuery({
    queryKey: ['admin-payment', selectedId],
    queryFn: () => adminApi.getPayment(selectedId!),
    enabled: !!selectedId,
  });

  const rows = payments.data?.items ?? [];
  const paid = rows.filter((row) => row.status === 'Paid');
  const pending = rows.filter((row) => ['Pending', 'Processing'].includes(row.status));
  const failed = rows.filter((row) => ['Failed', 'Expired', 'Cancelled'].includes(row.status));
  const totalPaid = paid.reduce((sum, row) => sum + row.amount, 0);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(params);
    setOrDelete(next, 'search', search.trim());
    setOrDelete(next, 'status', status);
    setOrDelete(next, 'provider', provider);
    setOrDelete(next, 'paymentMethod', method);
    setOrDelete(next, 'from', from);
    setOrDelete(next, 'to', to);
    next.delete('paymentId');
    next.set('page', '1');
    setPage(1);
    setParams(next);
  }

  async function downloadCsv() {
    const response = await adminApi.exportPayments(query);
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (selectedId) {
    return (
      <PaymentInvestigation
        detail={detail.data}
        isLoading={detail.isLoading}
        error={detail.error}
        onBack={() => {
          const next = new URLSearchParams(params);
          next.delete('paymentId');
          setParams(next);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Payments"
        description="Track every payment attempt and cross-check provider, receipt, session, and audit evidence."
        actions={<div className="flex items-center gap-3"><LiveIndicator status={realtimeStatus} /><Button variant="secondary" onClick={downloadCsv}><Download className="h-4 w-4" /> Export CSV</Button></div>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={CircleDollarSign} label="Paid on page" value={formatMoney(totalPaid)} detail={`${paid.length} settled`} tone="green" />
        <MetricCard icon={CalendarRange} label="Pending" value={pending.length} detail="Awaiting provider confirmation" tone="amber" />
        <MetricCard icon={ShieldCheck} label="Failed / closed" value={failed.length} detail="Attempts needing review" tone="slate" />
        <MetricCard icon={CircleDollarSign} label="Visible records" value={rows.length} detail={payments.data ? `${payments.data.totalCount} total matches` : 'Loading'} tone="blue" />
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-center gap-3" onSubmit={applyFilters}>
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Plate, receipt, provider ID" className="max-w-xs" />
          <select aria-label="Payment status" value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            {['Paid', 'Pending', 'Processing', 'Failed', 'Expired', 'Cancelled', 'Refunded', 'PartiallyRefunded'].map((value) => <option key={value}>{value}</option>)}
          </select>
          <select aria-label="Payment provider" value={provider} onChange={(event) => setProvider(event.target.value)} className={selectClass}>
            <option value="">All providers</option>
            <option value="PayMongo">PayMongo</option>
            <option value="Cash">Cash</option>
          </select>
          <select aria-label="Payment method" value={method} onChange={(event) => setMethod(event.target.value)} className={selectClass}>
            <option value="">All methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="gcash">GCash</option>
            <option value="qrph">QRPh</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600"><span className="sr-only">From</span><input type="date" aria-label="From date" value={from} onChange={(event) => setFrom(event.target.value)} className={dateClass} /></label>
          <label className="flex items-center gap-2 text-sm text-slate-600"><span className="sr-only">To</span><input type="date" aria-label="To date" value={to} onChange={(event) => setTo(event.target.value)} className={dateClass} /></label>
          <Button type="submit" variant="secondary"><Search className="h-4 w-4" /> Search</Button>
        </form>
      </Card>

      {payments.isLoading && <LoadingState label="Loading payments..." />}
      {payments.isError && <ErrorState error={payments.error} />}
      {payments.data && rows.length === 0 && <EmptyState>No payment records match these filters.</EmptyState>}
      {rows.length > 0 && <PaymentTable rows={rows} onSelect={(id) => {
        const next = new URLSearchParams(params);
        next.set('paymentId', id);
        setParams(next);
      }} />}

      {payments.data && payments.data.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-500">Page {payments.data.page} of {payments.data.totalPages}</p>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPageAndUrl(page - 1, params, setParams, setPage)}>Previous</Button>
            <Button variant="secondary" disabled={page >= payments.data.totalPages} onClick={() => setPageAndUrl(page + 1, params, setParams, setPage)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentTable({ rows, onSelect }: { rows: PaymentSummary[]; onSelect: (id: string) => void }) {
  return (
    <Table>
      <THead><tr><Th>Time</Th><Th>Plate</Th><Th>Location</Th><Th>Amount</Th><Th>Method</Th><Th>Status</Th><Th>Reference</Th></tr></THead>
      <TBody>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{formatDateTime(row.paidAt ?? row.createdAt)}</Td>
            <Td className="font-semibold text-slate-950">{row.plateNumberRaw}</Td>
            <Td>{row.locationName}</Td>
            <Td className="font-semibold">{formatMoney(row.amount, row.currency)}</Td>
            <Td>{row.paymentMethod ?? row.provider}</Td>
            <Td><Badge tone={paymentTone(row.status)}>{row.status}</Badge></Td>
            <Td>
              <button type="button" onClick={() => onSelect(row.id)} className="inline-flex items-center gap-1 text-left text-sm font-semibold text-brand-700 hover:underline">
                {row.receiptNumber ?? row.providerPaymentId ?? row.id.slice(0, 8)} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </Td>
          </tr>
        ))}
      </TBody>
    </Table>
  );
}

function PaymentInvestigation({
  detail,
  isLoading,
  error,
  onBack,
}: {
  detail?: PaymentDetail;
  isLoading: boolean;
  error: unknown;
  onBack: () => void;
}) {
  if (isLoading) return <LoadingState label="Loading payment evidence..." />;
  if (error) return <ErrorState error={error} />;
  if (!detail) return <EmptyState>Payment evidence is unavailable.</EmptyState>;
  const { payment, session, quote } = detail;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Payment investigation" title={payment.receiptNumber ?? `Payment ${payment.id.slice(0, 8)}`} description="Review the complete internal and provider-linked record for this payment." actions={<Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All payments</Button>} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment status</p><p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(payment.amount, payment.currency)}</p></div><Badge tone={paymentTone(payment.status)}>{payment.status}</Badge></div>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Payment ID" value={payment.id} mono />
            <Info label="Provider / method" value={`${payment.provider} / ${payment.paymentMethod ?? '—'}`} />
            <Info label="Created" value={formatDateTime(payment.createdAt)} />
            <Info label="Paid" value={payment.paidAt ? formatDateTime(payment.paidAt) : 'Not paid'} />
            <Info label="Receipt number" value={payment.receiptNumber ?? '—'} />
            <Info label="Customer email" value={payment.customerEmail ?? 'Not supplied'} />
            <Info label="Provider checkout ID" value={payment.providerCheckoutSessionId ?? '—'} mono />
            <Info label="Provider payment ID" value={payment.providerPaymentId ?? '—'} mono />
            <Info label="Recorded guard" value={payment.recordedByGuardId ?? 'Online / provider'} mono />
            <Info label="Session" value={`${payment.plateNumberRaw} · ${payment.locationName}`} />
          </dl>
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900 ring-1 ring-emerald-200">Use the provider payment ID, receipt number, and timestamps to cross-check a customer claim. Webhook evidence is shown below when available.</div>
        </Card>
        <Card className="space-y-4"><h2 className="text-base font-bold text-slate-950">Session context</h2><dl className="grid gap-3 text-sm"><Info label="Vehicle" value={`${session.plateNumberRaw} · ${session.vehicleType}`} /><Info label="Entry" value={formatDateTime(session.entryTime)} /><Info label="Exit" value={session.exitTime ? formatDateTime(session.exitTime) : 'Still active'} /><Info label="Session status" value={session.status} /><Info label="Total paid" value={formatMoney(session.totalPaid, payment.currency)} /><Info label="Final fee" value={session.finalFee === null ? 'Not exited' : formatMoney(session.finalFee, payment.currency)} /><Info label="Exit deadline" value={session.paidExitDeadline ? formatDateTime(session.paidExitDeadline) : '—'} /></dl></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><h2 className="text-base font-bold text-slate-950">Event timeline</h2><div className="mt-4 space-y-3">{detail.timeline.map((event, index) => <div key={`${event.at}-${event.type}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" /><div><p className="text-sm font-semibold text-slate-800">{event.label}</p><p className="text-xs text-slate-500">{formatDateTime(event.at)}{event.detail ? ` · ${event.detail}` : ''}</p></div></div>)}</div></Card>
        <Card><h2 className="text-base font-bold text-slate-950">Fee quote</h2>{quote ? <dl className="mt-4 grid gap-3 text-sm"><Info label="Quote ID" value={quote.id} mono /><Info label="Quote status" value={quote.status} /><Info label="Created / expires" value={`${formatDateTime(quote.createdAt)} → ${formatDateTime(quote.expiresAt)}`} /><Info label="Base amount" value={formatMoney(quote.baseAmount, quote.currency)} /><Info label="Discount" value={formatMoney(quote.discountAmount, quote.currency)} /><Info label="Total charged" value={formatMoney(quote.totalAmount, quote.currency)} /><pre className="max-h-40 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(quote.pricingBreakdownJson)}</pre></dl> : <EmptyState>No fee quote is attached to this payment.</EmptyState>}</Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2"><EvidenceList title="Audit evidence" items={detail.audit.map((item) => ({ title: item.action, time: item.createdAt, detail: [item.reason, item.ipAddress, item.deviceInformation].filter(Boolean).join(' · ') || 'No additional context' }))} empty="No audit entries are linked to this payment." /><EvidenceList title="Provider webhooks" items={detail.webhooks.map((item) => ({ title: `${item.eventType} · ${item.processingStatus}`, time: item.receivedAt, detail: `${item.providerEventId} · hash ${item.payloadHash}` }))} empty="No linked provider webhook is available." /></div>
    </div>
  );
}

function EvidenceList({ title, items, empty }: { title: string; items: { title: string; time: string; detail: string }[]; empty: string }) {
  return <Card><h2 className="text-base font-bold text-slate-950">{title}</h2>{items.length === 0 ? <div className="mt-4"><EmptyState>{empty}</EmptyState></div> : <div className="mt-4 space-y-3">{items.map((item, index) => <div key={`${item.time}-${index}`} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(item.time)} · {item.detail}</p></div>)}</div>}</Card>;
}

function Info({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className={`mt-1 break-words font-semibold text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd></div>;
}

function setOrDelete(params: URLSearchParams, key: string, value: string) { if (value) params.set(key, value); else params.delete(key); }
function setPageAndUrl(nextPage: number, params: URLSearchParams, setParams: (next: URLSearchParams) => void, setPage: (page: number) => void) { const next = new URLSearchParams(params); next.set('page', String(nextPage)); setPage(nextPage); setParams(next); }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function paymentTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' { if (status === 'Paid') return 'green'; if (['Pending', 'Processing'].includes(status)) return 'amber'; if (['Failed', 'Expired', 'Cancelled'].includes(status)) return 'red'; if (['Refunded', 'PartiallyRefunded'].includes(status)) return 'blue'; return 'neutral'; }
const selectClass = 'h-11 min-w-36 rounded-lg bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
const dateClass = 'h-11 rounded-lg bg-white px-3 text-sm text-slate-900 ring-1 ring-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500';
