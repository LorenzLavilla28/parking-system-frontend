import type { ReactNode } from 'react';
import { cn } from './cn';

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg bg-white/95 shadow-sm ring-1 ring-slate-200/80">
      <table className={cn('min-w-full divide-y divide-slate-200 bg-white/95 text-sm', className)}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <th className={cn('px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500', className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-slate-700', className)}>{children}</td>;
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-slate-50/90">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100 [&_tr:hover]:bg-slate-50/70">{children}</tbody>;
}
