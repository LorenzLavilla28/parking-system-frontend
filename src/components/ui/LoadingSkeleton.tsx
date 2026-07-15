import { cn } from './cn';

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-slate-200/80', className)} aria-hidden="true" />;
}
