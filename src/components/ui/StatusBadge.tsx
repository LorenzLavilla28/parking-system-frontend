import type { ComponentType, ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Circle, Clock3, Info, XCircle } from 'lucide-react';
import { cn } from './cn';

type StatusTone = 'success' | 'attention' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  tone: StatusTone;
  label: ReactNode;
  description?: string;
}

const toneStyles: Record<StatusTone, { className: string; icon: ComponentType<{ className?: string }> }> = {
  success: { className: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CheckCircle2 },
  attention: { className: 'bg-amber-50 text-amber-900 ring-amber-200', icon: AlertTriangle },
  danger: { className: 'bg-red-50 text-red-800 ring-red-200', icon: XCircle },
  info: { className: 'bg-brand-50 text-brand-800 ring-brand-100', icon: Info },
  neutral: { className: 'bg-slate-100 text-slate-700 ring-slate-200', icon: Circle },
};

export function StatusBadge({ tone, label, description }: StatusBadgeProps) {
  const style = toneStyles[tone];
  const Icon = description ? Clock3 : style.icon;

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1', style.className)}
      title={description}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
      {description && <span className="sr-only">: {description}</span>}
    </span>
  );
}
