import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { describeRateRules, type RateRulesForm } from './pricingRules';

const sampleHours = [2, 4, 8, 24];

export function RatePlanSummary({ rules }: { rules: RateRulesForm }) {
  return (
    <Card className="space-y-4 p-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-950">Live rate summary</h2>
        <Badge tone="blue">{rules.currency}</Badge>
      </div>
      <p className="text-sm leading-6 text-slate-700">{describeRateRules(rules)}</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Free exit period" value={`${rules.entryGraceMinutes} min`} />
        <SummaryItem label="Exit grace after payment" value={`${rules.paidExitGraceMinutes} min`} />
        <SummaryItem label="Lost ticket" value={formatOptionalMoney(rules.lostTicketFee, rules.currency)} />
      </dl>
      <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Example charges</p>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2 text-sm">
          <span />
          <span className="text-right text-xs font-bold text-slate-500">Car</span>
          <span className="text-right text-xs font-bold text-slate-500">Motorcycle</span>
          {sampleHours.map((hours) => (
            <div key={hours} className="contents">
              <span className="text-slate-500">{hours}-hour stay</span>
              <span className="text-right font-semibold text-slate-900">{formatMoney(calculateSampleCharge(rules.carRate, rules.entryGraceMinutes, hours), rules.currency)}</span>
              <span className="text-right font-semibold text-slate-900">{formatMoney(calculateSampleCharge(rules.motorcycleRate, rules.entryGraceMinutes, hours), rules.currency)}</span>
            </div>
          ))}
        </div>
        {rules.enableOvernight && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Overnight fee is added when a stay overlaps the configured overnight window.
          </p>
        )}
      </div>
    </Card>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function calculateSampleCharge(rate: RateRulesForm['carRate'], entryGraceMinutes: number, hours: number) {
  let amount = 0;

  if (hours * 60 <= entryGraceMinutes) {
    amount = 0;
  } else if (rate.type === 'Flat') {
    amount = rate.flatAmount;
  } else if (rate.type === 'PerUnit') {
    if (rate.perUnit === 'Minute') amount = Math.ceil(hours * 60) * rate.perUnitAmount;
    else if (rate.perUnit === 'Fraction') amount = Math.ceil((hours * 60) / rate.fractionMinutes) * rate.perUnitAmount;
    else amount = Math.ceil(hours) * rate.perUnitAmount;
  } else {
    const extraHours = Math.max(0, hours - rate.firstHours);
    const increments =
      rate.incrementUnit === 'Minute' ? Math.ceil(extraHours * 60) : Math.ceil(extraHours);
    amount = rate.firstAmount + increments * rate.incrementAmount;
  }

  return amount;
}

function formatOptionalMoney(value: number | '', currency: string) {
  return value === '' ? 'Off' : formatMoney(value, currency);
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency }).format(value);
}
