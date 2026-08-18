import { useState } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { ApiError } from '@/lib/api/types';
import type { AuthSession } from '@/lib/auth/types';
import { useChangePassword } from './hooks';

export function ChangePasswordForm({ onSuccess }: { onSuccess?: (session: AuthSession) => void }) {
  const change = useChangePassword();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saved, setSaved] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const error = change.error instanceof ApiError ? change.error : null;
  const mismatch = confirm.length > 0 && newPassword !== confirm;
  const requirements = [
    { label: 'At least 12 characters', met: newPassword.length >= 12 },
    { label: 'One number', met: /\d/.test(newPassword) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];
  const meetsRequirements = requirements.every((requirement) => requirement.met);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setSaved(false);
        change.mutate({ currentPassword, newPassword }, {
          onSuccess: (session) => {
            setCurrentPassword('');
            setNewPassword('');
            setConfirm('');
            setSaved(true);
            onSuccess?.(session);
          },
        });
      }}
      noValidate
    >
      {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}
      {saved && <Alert tone="success">Your password has been updated.</Alert>}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="profile-current-password" className="block text-sm font-semibold text-slate-700">Current password</label>
          <Link to="/forgot-password" className="text-xs font-semibold text-brand-700 hover:underline">Forgot password?</Link>
        </div>
        <PasswordInput id="profile-current-password" value={currentPassword} onChange={setCurrentPassword} visible={showCurrent} onToggle={() => setShowCurrent((visible) => !visible)} autoComplete="current-password" />
      </div>
      <FormField label="New password" htmlFor="profile-new-password">
        <PasswordInput id="profile-new-password" value={newPassword} onChange={setNewPassword} visible={showNew} onToggle={() => setShowNew((visible) => !visible)} autoComplete="new-password" minLength={12} />
      </FormField>
      <div className="-mt-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Password requirements</p>
        <ul className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-3">
          {requirements.map((requirement) => <li key={requirement.label} className={`flex items-center gap-1.5 ${requirement.met ? 'font-semibold text-emerald-700' : ''}`}><span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border ${requirement.met ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400'}`}>{requirement.met && <Check className="h-2.5 w-2.5" />}</span>{requirement.label}</li>)}
        </ul>
      </div>
      <FormField label="Confirm new password" htmlFor="profile-confirm-password" error={mismatch ? 'Passwords do not match.' : undefined}>
        <PasswordInput id="profile-confirm-password" value={confirm} onChange={setConfirm} visible={showConfirm} onToggle={() => setShowConfirm((visible) => !visible)} autoComplete="new-password" invalid={mismatch} />
        {confirm.length > 0 && !mismatch && <p className="text-sm font-semibold text-emerald-700">Passwords match.</p>}
      </FormField>
      <div className="flex justify-end">
        <Button type="submit" loading={change.isPending} disabled={!currentPassword || !meetsRequirements || mismatch || !confirm}>Update password</Button>
      </div>
    </form>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  minLength,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  minLength?: number;
  invalid?: boolean;
}) {
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative">
      <Input id={id} type={visible ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={(event) => onChange(event.target.value)} minLength={minLength} invalid={invalid} required className="pr-11" />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500" aria-label={visible ? 'Hide password' : 'Show password'}>
        <Icon className="h-4 w-4" />
      </button>
    </div>
  );
}
