import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';
import { useAuth, useChangePassword, homeRouteForRoles } from './hooks';

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const error = change.error instanceof ApiError ? change.error : null;
  const mismatch = confirm.length > 0 && newPassword !== confirm;

  if (!user) return null;

  return (
    <div className="app-surface grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-md p-7 shadow-xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Change your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your account is using a temporary password. Set a new one before continuing.
        </p>
        <form className="mt-7 space-y-4" onSubmit={(event) => {
          event.preventDefault();
          change.mutate({ currentPassword, newPassword }, {
            onSuccess: (session) => navigate((location.state as { from?: string } | null)?.from ?? homeRouteForRoles(session.user.roles), { replace: true }),
          });
        }} noValidate>
          {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}
          <FormField label="Current password" htmlFor="current-password">
            <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </FormField>
          <FormField label="New password" htmlFor="new-password">
            <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={10} required />
          </FormField>
          <FormField label="Confirm new password" htmlFor="confirm-password" error={mismatch ? 'Passwords do not match.' : undefined}>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} invalid={mismatch} required />
          </FormField>
          <Button type="submit" fullWidth loading={change.isPending} disabled={!currentPassword || newPassword.length < 10 || mismatch || !confirm}>Save new password</Button>
        </form>
      </Card>
    </div>
  );
}
