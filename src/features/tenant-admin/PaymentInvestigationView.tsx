import { useState } from 'react';
import { ArrowLeft, Check, Copy, ExternalLink, TriangleAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PaymentDetail } from './api';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/states';
import { PageHeader } from '@/components/ui/PageHeader';
import { formatMoney, formatPaymentTimestamp } from '@/lib/format';

export function PaymentInvestigationView({ detail, onBack }: { detail: PaymentDetail; onBack: () => void }) {
  const { payment, session, quote } = detail;
  const isActive = !session.exitTime;
  const isOverdue = session.status === 'OverstayDue';
  const hasWebhook = detail.webhooks.length > 0;
  const confirmationSource = hasWebhook
    ? 'Provider webhook'
    : payment.provider === 'Cash'
      ? 'Recorded by guard'
      : 'Provider confirmation; no webhook linked';
  const timeline = detail.timeline.filter((event) => event.type !== 'audit' && event.type !== 'webhook');

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Payment record"
        title="Payment details"
        description={`${payment.plateNumberRaw} · ${payment.locationName} · ${payment.status}`}
        actions={<Button variant="secondary" onClick={onBack}><ArrowLeft className="h-4 w-4" /> All payments</Button>}
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Payment status</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{formatMoney(payment.amount, payment.currency)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-700">{payment.plateNumberRaw} · {payment.locationName} · {paymentMethodLabel(payment.paymentMethod)}</p>
          </div>
          <Badge tone={paymentTone(payment.status)}>{payment.status}</Badge>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Paid at" value={payment.paidAt ? formatPaymentTimestamp(payment.paidAt) : 'Not paid'} />
          <Info label="Payment coverage" value={session.paidExitDeadline ? `Until ${formatPaymentTimestamp(session.paidExitDeadline)}` : 'Not available'} />
          <Info label="Confirmation received by" value={confirmationSource} />
        </div>
        {isOverdue && <div className="flex gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /><div><p className="font-semibold">Vehicle is still parked and may have additional charges.</p><p className="mt-1">The payment covered parking until {session.paidExitDeadline ? formatPaymentTimestamp(session.paidExitDeadline) : 'the recorded exit deadline'}.</p></div></div>}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Link to={`/admin/payments?sessionId=${session.id}`} className="inline-flex items-center gap-2 rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600">Open parking session <ExternalLink className="h-3.5 w-3.5" /></Link>
          <CopyValue label="Copy payment reference" value={payment.providerPaymentId ?? payment.receiptNumber ?? payment.id} />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-bold text-slate-950">Session information</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Definition label="Vehicle" value={`${session.plateNumberRaw} · ${session.vehicleType}`} />
          <Definition label="Location" value={session.locationName} />
          <Definition label="Entry" value={formatPaymentTimestamp(session.entryTime)} />
          <Definition label="Exit" value={session.exitTime ? formatPaymentTimestamp(session.exitTime) : 'Still parked'} />
          <Definition label="Paid through" value={session.paidExitDeadline ? formatPaymentTimestamp(session.paidExitDeadline) : 'Not available'} />
          <Definition label="Current estimated fee" value={isActive ? moneyOrUnavailable(session.currentFee, payment.currency) : 'Not applicable after exit'} />
          <Definition label="Current outstanding balance" value={isActive ? moneyOrUnavailable(session.currentOutstanding, payment.currency) : 'Not applicable after exit'} />
          <Definition label="Final fee" value={session.exitTime && session.finalFee != null ? moneyOrUnavailable(session.finalFee, payment.currency) : 'Not available until exit'} />
          <Definition label="Session status" value={sessionStatusLabel(session.status)} />
        </dl>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.85fr)]">
        <Card>
          <h2 className="text-base font-bold text-slate-950">Payment timeline</h2>
          <p className="mt-1 text-xs text-slate-500">Times shown in Asia/Manila.</p>
          <div className="mt-5 space-y-4">
            {timeline.map((event, index) => <div key={`${event.at}-${event.type}-${index}`} className="flex gap-3"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-600" /><div><p className="text-sm font-semibold text-slate-800">{timelineLabel(event.label)}</p><p className="text-xs text-slate-500">{formatPaymentTimestamp(event.at, true)}{event.detail ? ` · ${event.detail}` : ''}</p></div></div>)}
            {timeline.length === 0 && <EmptyState>No timeline events are available.</EmptyState>}
          </div>
        </Card>
        <Card>
          <h2 className="text-base font-bold text-slate-950">Fee breakdown</h2>
          {quote ? <><FeeBreakdown quote={quote} currency={payment.currency} /><details className="mt-4 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><summary className="cursor-pointer text-sm font-semibold text-slate-700">View raw fee data</summary><pre className="mt-3 max-h-56 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">{prettyJson(quote.pricingBreakdownJson)}</pre></details></> : <EmptyState>No fee quote is attached to this payment.</EmptyState>}
        </Card>
      </div>

      <details className="rounded-xl bg-white/95 shadow-sm ring-1 ring-slate-200/80">
        <summary className="cursor-pointer list-none px-5 py-4 text-base font-bold text-slate-950">Provider and audit evidence <span className="ml-2 text-xs font-normal text-slate-500">IDs, webhooks, audit events, and technical details</span></summary>
        <div className="space-y-5 border-t border-slate-100 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <CopyValue label="Payment ID" value={payment.id} />
            <CopyValue label="Provider payment ID" value={payment.providerPaymentId} />
            <CopyValue label="Provider checkout ID" value={payment.providerCheckoutSessionId} />
            <Definition label="Receipt number" value={payment.receiptNumber ?? 'Not issued'} />
            <Definition label="Customer email" value={payment.customerEmail ?? 'Not supplied'} />
            <Definition label="Recorded by" value={payment.recordedByGuardId ? 'Guard' : 'Online / provider'} />
          </div>
          <EvidenceList title="Audit evidence" items={detail.audit.map((item) => ({ title: timelineLabel(item.action), time: item.createdAt, detail: [item.reason, item.ipAddress].filter(Boolean).join(' · ') || 'No additional context', technical: item.deviceInformation }))} empty="No audit entries are linked to this payment." />
          {detail.webhooks.length > 0 ? <EvidenceList title="Provider webhooks" items={detail.webhooks.map((item) => ({ title: `${item.eventType} · ${item.processingStatus}`, time: item.receivedAt, detail: `${shortId(item.providerEventId)} · hash ${shortId(item.payloadHash)}` }))} empty="No linked provider webhook is available." /> : <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">No linked webhook is available. This payment was confirmed through the provider status flow.</div>}
        </div>
      </details>
    </div>
  );
}

function EvidenceList({ title, items, empty }: { title: string; items: { title: string; time: string; detail: string; technical?: string | null }[]; empty: string }) {
  return <section><h3 className="text-sm font-bold text-slate-800">{title}</h3>{items.length === 0 ? <p className="mt-2 text-sm text-slate-500">{empty}</p> : <div className="mt-3 space-y-2">{items.map((item, index) => <div key={`${item.time}-${index}`} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-500">{formatPaymentTimestamp(item.time, true)} · {item.detail}</p>{item.technical && <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Show technical details</summary><p className="mt-1 break-all">{item.technical}</p></details>}</div>)}</div>}</section>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100"><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd></div>; }
function Definition({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd></div>; }

function CopyValue({ label, value }: { label: string; value: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <Definition label={label} value="Not available" />;
  return <div><dt className="text-xs font-semibold text-slate-500">{label}</dt><dd className="mt-1 flex items-center gap-2"><span className="truncate font-mono text-xs font-semibold text-slate-800" title={value}>{shortId(value)}</span><button type="button" onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1400); }).catch(() => setCopied(false)); }} className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" title={`Copy ${label}`} aria-label={`Copy ${label}`}>{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}</button></dd></div>;
}

function FeeBreakdown({ quote, currency }: { quote: NonNullable<PaymentDetail['quote']>; currency: string }) {
  const rows = parseBreakdown(quote.pricingBreakdownJson);
  return <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Charge</th><th className="px-3 py-2 text-left">Pricing rule</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row.code}-${index}`}><td className="px-3 py-2 text-slate-700">{row.description}</td><td className="px-3 py-2 text-slate-500">{row.rule}</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(row.amount, currency)}</td></tr>)}<tr><td className="px-3 py-2 text-slate-700">Discount</td><td className="px-3 py-2 text-slate-500">None</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{formatMoney(quote.discountAmount, currency)}</td></tr><tr className="bg-slate-50"><td className="px-3 py-2 font-bold text-slate-900">Total paid</td><td className="px-3 py-2" /><td className="px-3 py-2 text-right font-bold tabular-nums text-slate-900">{formatMoney(quote.totalAmount, currency)}</td></tr></tbody></table></div>;
}

function parseBreakdown(value: string): { code: string; description: string; rule: string; amount: number }[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => { const row = item as Record<string, unknown>; const code = String(row.Code ?? row.code ?? `charge-${index}`); const description = String(row.Description ?? row.description ?? 'Parking charge'); const amount = Number(row.Amount ?? row.amount ?? 0); return { code, description, rule: pricingRuleLabel(code, description), amount: Number.isFinite(amount) ? amount : 0 }; });
  } catch { return []; }
}

function pricingRuleLabel(code: string, description: string) { if (code.toLowerCase().includes('first_block')) return description.toLowerCase().includes('3h') ? 'First 3 hours' : 'Initial parking block'; if (code.toLowerCase().includes('increment')) return 'Succeeding time'; return 'Applied pricing rule'; }
function moneyOrUnavailable(value: number | null | undefined, currency: string) { return value == null || !Number.isFinite(value) ? 'Not calculated' : formatMoney(value, currency); }
function shortId(value: string) { return value.length > 18 ? `${value.slice(0, 9)}…${value.slice(-6)}` : value; }
function sessionStatusLabel(status: string) { return status === 'OverstayDue' ? 'Overstay — payment coverage expired' : status === 'PaidExitWindow' ? 'Paid — awaiting exit' : status; }
function timelineLabel(label: string) { return ({ OnlineCheckoutCreated: 'Online checkout started', 'Payment record created': 'Payment attempt created' } as Record<string, string>)[label] ?? label; }
function prettyJson(value: string) { try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; } }
function paymentTone(status: string): 'green' | 'amber' | 'red' | 'blue' | 'neutral' { if (status === 'Paid') return 'green'; if (['Pending', 'Processing'].includes(status)) return 'amber'; if (['Failed', 'Expired', 'Cancelled'].includes(status)) return 'red'; if (['Refunded', 'PartiallyRefunded'].includes(status)) return 'blue'; return 'neutral'; }
function paymentMethodLabel(method: string | null | undefined) { const labels: Record<string, string> = { cash: 'Cash', card: 'Card', gcash: 'GCash', qrph: 'QR Ph' }; return method ? labels[method.toLowerCase()] ?? method : 'Not specified'; }
