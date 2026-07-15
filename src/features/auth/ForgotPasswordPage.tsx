import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';
import { useForgotPassword } from './hooks';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const forgot = useForgotPassword();
  const error = forgot.error instanceof ApiError ? forgot.error : null;

  return (
    <div className="app-surface grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7 shadow-xl">
        {forgot.isSuccess ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If an account exists for that email, we sent a password reset link. The link expires in one hour.
            </p>
            <Link className="mt-6 inline-block text-sm font-semibold text-brand-700" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Forgot password?</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Enter your work email and we’ll send a secure reset link.</p>
            <form className="mt-7 space-y-4" onSubmit={(event) => { event.preventDefault(); forgot.mutate(email); }} noValidate>
              {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}
              <FormField label="Email" htmlFor="email">
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </FormField>
              <Button type="submit" fullWidth loading={forgot.isPending}>Send reset link</Button>
            </form>
            <Link className="mt-6 inline-block text-sm font-semibold text-brand-700" to="/login">Back to sign in</Link>
          </>
        )}
      </Card>
    </div>
  );
}
