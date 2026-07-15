import { formatMoney } from '@/lib/format';
import type { FeeBreakdownItem } from './api';

export function FeeBreakdown({
  items,
  currency,
  total,
}: {
  items: FeeBreakdownItem[];
  currency: string;
  total: number;
}) {
  return (
    <div className="space-y-1.5 text-sm">
      {items.map((item, i) => (
        <div key={`${item.code}-${i}`} className="flex justify-between gap-4">
          <span className="text-slate-600">{item.description}</span>
          <span className={item.amount < 0 ? 'text-green-700' : 'text-slate-800'}>
            {formatMoney(item.amount, currency)}
          </span>
        </div>
      ))}
      <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
        <span>Total</span>
        <span>{formatMoney(total, currency)}</span>
      </div>
    </div>
  );
}
