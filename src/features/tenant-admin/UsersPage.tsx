import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, CircleAlert, Copy, Eye, EyeOff, MapPinned, Pencil, Plus, RefreshCw, ShieldCheck, UserRoundCheck, Users } from 'lucide-react';
import { adminApi, listAllPages, type User } from './api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

const ROLES = ['TenantAdministrator', 'Supervisor', 'Guard'] as const;
const PASSWORD_MIN_LENGTH = 12;
const PASSWORD_MAX_LENGTH = 16;

type UserFormErrors = Partial<Record<'firstName' | 'lastName' | 'email' | 'password' | 'roles', string>>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => listAllPages(adminApi.listUsers) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });
  const activeCount = users.data?.items.filter((user) => user.status === 'Active').length ?? 0;
  const guardCount = users.data?.items.filter((user) => user.roles.includes('Guard')).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Users and guards"
        description="Invite staff, assign roles, and control which locations each guard can operate."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" />
            New user
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={Users} label="Total users" value={users.data?.items.length ?? '...'} detail="Tenant staff accounts" tone="blue" />
        <MetricCard icon={UserRoundCheck} label="Active users" value={activeCount} detail="Can sign in" tone="green" />
        <MetricCard icon={ShieldCheck} label="Guards" value={guardCount} detail="Gate operators" tone="amber" />
      </div>

      {users.isLoading && <LoadingState />}
      {users.isError && <ErrorState error={users.error} />}
      {users.data && users.data.items.length === 0 && <EmptyState>No users yet.</EmptyState>}

      {users.data && users.data.items.length > 0 && (
        <>
          <div className="space-y-3 md:hidden">
            {users.data.items.map((u) => (
              <article key={u.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-950">{u.firstName} {u.lastName}</h2>
                    <p className="mt-1 break-all text-sm text-slate-600">{u.email}</p>
                  </div>
                  <Badge tone={u.status === 'Active' ? 'green' : 'neutral'}>{u.status}</Badge>
                </div>
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {u.roles.map((r) => <Badge key={r} tone="blue">{r.replace('Administrator', ' Admin')}</Badge>)}
                  </div>
                </div>
                <Button type="button" variant="secondary" fullWidth className="mt-4" onClick={() => setEditing(u)}><Pencil className="h-3.5 w-3.5" />Edit user</Button>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <THead>
                <tr>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Roles</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {users.data.items.map((u) => (
                  <tr key={u.id}>
                    <Td className="font-medium text-slate-900">
                      {u.firstName} {u.lastName}
                    </Td>
                    <Td>{u.email}</Td>
                    <Td className="space-x-1">
                      {u.roles.map((r) => (
                        <Badge key={r} tone="blue">
                          {r.replace('Administrator', ' Admin')}
                        </Badge>
                      ))}
                    </Td>
                    <Td>
                      <Badge tone={u.status === 'Active' ? 'green' : 'neutral'}>{u.status}</Badge>
                    </Td>
                    <Td className="text-right">
                      <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setEditing(u)}>
                        <Pencil className="mr-1 inline h-3.5 w-3.5" />
                        Edit
                      </button>
                    </Td>
                  </tr>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      {editing && (
        <UserModal
          user={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            invalidate();
          }}
        />
      )}
    </div>
  );
}

function PasswordCheck({ valid, label }: { valid: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 ${valid ? 'text-emerald-600' : 'text-slate-500'}`}>
      <CheckCircle2 className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function UserModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !user;
  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => listAllPages(adminApi.listLocations) });

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordWasGenerated, setPasswordWasGenerated] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [roles, setRoles] = useState<string[]>(user?.roles ?? ['Guard']);
  const [locationIds, setLocationIds] = useState<string[]>(user?.assignedLocationIds ?? []);
  const [isActive, setIsActive] = useState(user ? user.status === 'Active' : true);

  const passwordChecks = {
    length: password.length >= PASSWORD_MIN_LENGTH,
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const passwordIsValid = passwordChecks.length && passwordChecks.number && passwordChecks.special;

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? adminApi.createUser({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim().toLowerCase(), password, roles, assignedLocationIds: locationIds })
        : adminApi.updateUser(user!.id, { firstName: firstName.trim(), lastName: lastName.trim(), roles, assignedLocationIds: locationIds, isActive }),
    onSuccess: onSaved,
  });

  const clearError = (field: keyof UserFormErrors) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validate = (): UserFormErrors => {
    const next: UserFormErrors = {};
    if (!firstName.trim()) next.firstName = 'Enter a first name.';
    if (!lastName.trim()) next.lastName = 'Enter a last name.';
    if (!email.trim()) next.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (!password) next.password = 'Enter a temporary password.';
    else if (!passwordChecks.length) next.password = `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    else if (!passwordChecks.number) next.password = 'Include at least one number.';
    else if (!passwordChecks.special) next.password = 'Include at least one special character.';
    if (roles.length === 0) next.roles = 'Select at least one role.';
    return next;
  };

  const generatePassword = () => {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const values = new Uint32Array(PASSWORD_MAX_LENGTH);
    crypto.getRandomValues(values);
    const generated = Array.from(values, (value) => characters[value % characters.length]);
    generated[0] = 'A';
    generated[1] = '7';
    generated[2] = '!';
    setPassword(generated.join(''));
    setPasswordWasGenerated(true);
    setCopyStatus('idle');
    clearError('password');
  };

  const copyPassword = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(password);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = password;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand('copy');
        textArea.remove();
        if (!copied) throw new Error('Copy failed');
      }
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1800);
    } catch {
      setCopyStatus('failed');
    }
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'New user' : 'Edit user'} size="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isNew) {
            save.mutate();
            return;
          }
          const nextErrors = validate();
          setErrors(nextErrors);
          if (Object.keys(nextErrors).length === 0) save.mutate();
        }}
        noValidate
      >
        {Object.keys(errors).length > 0 && (
          <Alert tone="error">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span>One or more validation errors occurred.</span>
            </div>
          </Alert>
        )}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" htmlFor="fn" error={errors.firstName}>
            <Input id="fn" value={firstName} onChange={(e) => { setFirstName(e.target.value); clearError('firstName'); }} invalid={Boolean(errors.firstName)} required />
          </FormField>
          <FormField label="Last name" htmlFor="ln" error={errors.lastName}>
            <Input id="ln" value={lastName} onChange={(e) => { setLastName(e.target.value); clearError('lastName'); }} invalid={Boolean(errors.lastName)} required />
          </FormField>
        </div>

        {isNew && (
          <>
            <FormField label="Email" htmlFor="email" error={errors.email}>
              <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError('email'); }} invalid={Boolean(errors.email)} required />
            </FormField>
            <FormField label="Temporary password" htmlFor="pw" error={errors.password}>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative">
                  <Input
                    id="pw"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordWasGenerated(false); setCopyStatus('idle'); clearError('password'); }}
                    className="pr-11"
                    invalid={Boolean(errors.password)}
                    autoComplete="new-password"
                    maxLength={256}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
                    aria-label={showPassword ? 'Hide temporary password' : 'Show temporary password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="button" variant="secondary" onClick={generatePassword}>
                  <RefreshCw className="h-4 w-4" />
                  Generate password
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>Use at least 12 characters with a number and special character.</span>
                <span className={passwordIsValid ? 'font-semibold text-emerald-600' : ''}>
                  {password.length}/{PASSWORD_MIN_LENGTH} characters {passwordIsValid ? '✓' : ''}
                </span>
              </div>
              {password.length > 0 && (
                <div className="grid gap-1 text-xs sm:grid-cols-3" aria-live="polite">
                  <PasswordCheck valid={passwordChecks.length} label="12+ characters" />
                  <PasswordCheck valid={passwordChecks.number} label="One number" />
                  <PasswordCheck valid={passwordChecks.special} label="Special character" />
                </div>
              )}
              {passwordWasGenerated && passwordIsValid && (
                <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-200">
                  <span className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Secure password generated
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={copyPassword}>
                    <Copy className="h-3.5 w-3.5" />
                    {copyStatus === 'copied' ? 'Copied' : copyStatus === 'failed' ? 'Try again' : 'Copy'}
                  </Button>
                </div>
              )}
            </FormField>
          </>
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Roles</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <label key={r} className={`flex items-center gap-2 rounded-lg p-3 text-sm text-slate-700 ring-1 ${roles.includes(r) ? 'bg-brand-50 ring-brand-300' : 'bg-slate-50 ring-slate-200'}`}>
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => { setRoles(toggle(roles, r)); clearError('roles'); }}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                <span className="font-semibold">{r.replace('TenantAdministrator', 'Tenant Admin')}</span>
              </label>
            ))}
          </div>
          {errors.roles && <p className="mt-1.5 text-sm text-red-600" role="alert">{errors.roles}</p>}
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MapPinned className="h-4 w-4 text-slate-400" />
            Assigned locations
          </p>
          <div className="max-h-32 space-y-1.5 overflow-y-auto rounded-lg ring-1 ring-slate-200 p-3">
            {locations.data?.items.map((l) => (
              <label key={l.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={locationIds.includes(l.id)}
                  onChange={() => setLocationIds(toggle(locationIds, l.id))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                {l.name}
              </label>
            )) ?? <span className="text-sm text-slate-400">Loading…</span>}
          </div>
        </div>

        {isNew && (
          <Alert tone="warning">
            <div className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4 shrink-0" />
              <span>The user will be required to change this password after first login.</span>
            </div>
          </Alert>
        )}

        {!isNew && (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
            />
            Active
          </label>
        )}

        {save.isError && <ErrorState error={save.error} />}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
