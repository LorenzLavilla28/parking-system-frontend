import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from './cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-lg bg-white px-3 text-slate-900 ring-1 transition',
        'placeholder:text-slate-400 hover:ring-slate-400 focus:outline-none focus-visible:ring-2',
        invalid
          ? 'ring-red-400 focus-visible:ring-red-500'
          : 'ring-slate-300 focus-visible:ring-brand-500',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
