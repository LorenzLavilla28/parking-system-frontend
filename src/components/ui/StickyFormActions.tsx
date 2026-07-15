import type { ReactNode } from 'react';
import { cn } from './cn';

export function StickyFormActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        '-mx-4 mt-6 border-t border-slate-200 bg-white/95 px-4 py-3 sm:sticky sm:bottom-0 sm:z-10 sm:-mx-6 sm:px-6 sm:shadow-[0_-8px_24px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">{children}</div>
    </div>
  );
}
