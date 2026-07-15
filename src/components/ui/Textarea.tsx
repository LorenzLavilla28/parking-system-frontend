import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from './cn';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-lg bg-white px-3 py-2 text-slate-900 ring-1 transition',
        'placeholder:text-slate-400 hover:ring-slate-400 focus:outline-none focus-visible:ring-2',
        invalid ? 'ring-red-400 focus-visible:ring-red-500' : 'ring-slate-300 focus-visible:ring-brand-500',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});
