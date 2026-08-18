import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';
import { useResetPassword } from './hooks';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const reset = useResetPassword();
  const error = reset.error instanceof ApiError ? reset.error : null;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="app-surface grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7 shadow-xl">
        {reset.isSuccess ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Password reset complete</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Your password has been updated. Sign in with your new password.</p>
            <Link className="mt-6 inline-block text-sm font-semibold text-brand-700" to="/login">Go to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Set a new password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Use at least 12 characters with a number and special character.</p>
            <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); reset.mutate({ token, newPassword: password }); }} noValidate>
              {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}
              {!token && <Alert tone="error">This reset link is missing its token.</Alert>}
              <FormField label="New password" htmlFor="password">
                <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required />
              </FormField>
              <FormField label="Confirm new password" htmlFor="confirm" error={mismatch ? 'Passwords do not match.' : undefined}>
                <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} invalid={mismatch} required />
              </FormField>
              <Button type="submit" fullWidth loading={reset.isPending} disabled={!token || password.length < 12 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password) || mismatch || !confirm}>Reset password</Button>
            </form>
            <Link className="mt-6 inline-block text-sm font-semibold text-brand-700" to="/login">Back to sign in</Link>
          </>
        )}
      </Card>
    </div>
  );
}
