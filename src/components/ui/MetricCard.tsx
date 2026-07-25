import type { ComponentType, ReactNode } from 'react';
import { cn } from './cn';

interface MetricCardProps {
  label: string;
  value: ReactNode;
  detail?: string;
  tone?: 'blue' | 'green' | 'amber' | 'slate';
  icon?: ComponentType<{ className?: string }>;
  iconSize?: 'default' | 'subtle';
}

const tones = {
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  slate: 'bg-slate-50 text-slate-700 ring-slate-100',
};

export function MetricCard({ label, value, detail, tone = 'slate', icon: Icon, iconSize = 'default' }: MetricCardProps) {
  return (
    <div className="rounded-lg bg-white/95 p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn(
          'flex items-center justify-center rounded-lg ring-1',
          iconSize === 'subtle' ? 'h-7 w-7 opacity-70' : 'h-9 w-9',
          tones[tone],
        )} aria-hidden="true">
          {Icon ? <Icon className="h-4 w-4" /> : <span className="h-2.5 w-2.5 rounded-full bg-current" />}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
