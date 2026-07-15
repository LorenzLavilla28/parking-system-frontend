import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg bg-white/95 p-6 shadow-sm ring-1 ring-slate-200/80', className)}
      {...props}
    />
  );
}
