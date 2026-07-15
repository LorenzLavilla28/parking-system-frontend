import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, invalid, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg bg-white px-3 text-slate-900 ring-1 transition',
        'hover:ring-slate-400 focus:outline-none focus-visible:ring-2',
        invalid ? 'ring-red-400 focus-visible:ring-red-500' : 'ring-slate-300 focus-visible:ring-brand-500',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
