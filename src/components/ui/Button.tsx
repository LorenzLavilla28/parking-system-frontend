import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white shadow-sm shadow-brand-700/20 hover:bg-brand-600 disabled:bg-brand-600/60',
  secondary: 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300',
  danger: 'bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 disabled:bg-red-600/60',
  ghost: 'bg-transparent text-slate-700 hover:bg-white/70 hover:text-slate-950',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-14 px-6 text-base',
};

export function buttonClasses({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-70',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
