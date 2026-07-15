import type { ReactNode } from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Spinner } from './Spinner';
import { Alert } from './Alert';
import { ApiError } from '@/lib/api/types';

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-lg bg-white/70 py-12 text-slate-500 ring-1 ring-slate-200/70">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    error instanceof ApiError ? (error.detail ?? error.title) : 'Something went wrong. Please try again.';
  return (
    <Alert tone="error">
      <span className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </span>
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white/65 px-6 py-12 text-center text-sm text-slate-500">
      <Inbox className="mx-auto mb-3 h-8 w-8 text-slate-400" />
      <div>{children}</div>
    </div>
  );
}
