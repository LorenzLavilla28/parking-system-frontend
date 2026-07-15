import type { ReactNode } from 'react';
import { cn } from './cn';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('rounded-xl bg-white/65 p-5 shadow-sm ring-1 ring-white/80 backdrop-blur sm:flex sm:items-end sm:justify-between sm:gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      </div>
      {actions && <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">{actions}</div>}
    </div>
  );
}
