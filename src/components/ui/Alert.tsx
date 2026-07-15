import { cn } from './cn';

type Tone = 'error' | 'success' | 'info' | 'warning';

const tones: Record<Tone, string> = {
  error: 'bg-red-50 text-red-800 ring-red-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  info: 'bg-brand-50 text-brand-800 ring-brand-100',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200',
};

export function Alert({ tone = 'info', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg px-4 py-3 text-sm leading-6 ring-1', tones[tone])} role="alert">
      {children}
    </div>
  );
}
