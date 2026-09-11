import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, ShieldCheck } from 'lucide-react';
import { platformApi, type InvitePlatformAdministratorInput } from './api';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TBody, Td, Th, THead } from '@/components/ui/Table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';

const emptyForm: InvitePlatformAdministratorInput = {
  firstName: '',
  lastName: '',
  email: '',
};

type FormErrors = Partial<Record<keyof InvitePlatformAdministratorInput, string>>;

export function PlatformAdministratorsPage() {
  const queryClient = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [created, setCreated] = useState<Awaited<ReturnType<typeof platformApi.inviteAdministrator>> | null>(null);

  const administrators = useQuery({
    queryKey: ['platform-administrators'],
    queryFn: () => platformApi.listAdministrators(),
  });

  const invite = useMutation({
    mutationFn: () => platformApi.inviteAdministrator({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
    }),
    onSuccess: (result) => {
      setCreated(result);
      setInviting(false);
      setForm(emptyForm);
      setErrors({});
      void queryClient.invalidateQueries({ queryKey: ['platform-administrators'] });
    },
  });

  const openInvite = () => {
    setCreated(null);
    setErrors({});
    setForm(emptyForm);
    setInviting(true);
  };

  const closeInvite = () => {
    if (invite.isPending) return;
    setInviting(false);
    setErrors({});
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: FormErrors = {};
    if (!form.firstName.trim()) next.firstName = 'Enter a first name.';
    if (!form.lastName.trim()) next.lastName = 'Enter a last name.';
    if (!form.email.trim()) next.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email address.';
    setErrors(next);
    if (Object.keys(next).length === 0) invite.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Platform administrators"
        description="Invite trusted operators who can manage tenants, plans, capacity, and platform health."
        actions={
          <Button onClick={openInvite}>
            <Plus className="h-4 w-4" />
            Invite administrator
          </Button>
        }
      />

      {created && (
        <Alert tone="success">
          <div className="space-y-2">
            <p className="font-semibold">
              {created.existingAccount
                ? `Platform access was added to ${created.administrator.email}.`
                : `Invitation queued for ${created.administrator.email}.`}
            </p>
            {created.temporaryPassword ? (
              <>
                <p>
                  Temporary password:
                  <code className="ml-2 rounded bg-white px-2 py-1 font-mono text-sm ring-1 ring-emerald-200">
                    {created.temporaryPassword}
                  </code>
                </p>
                <p className="text-xs">Share this password through an approved secure channel. It must be changed on first login.</p>
              </>
            ) : (
              <p className="text-xs">The user should sign in with their existing password. Their tenant workspace access remains available.</p>
            )}
          </div>
        </Alert>
      )}

      {administrators.isLoading && <LoadingState label="Loading platform administrators..." />}
      {administrators.isError && <ErrorState error={administrators.error} />}
      {administrators.data?.length === 0 && <EmptyState>No platform administrators yet.</EmptyState>}
      {administrators.data && administrators.data.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Administrator</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th>Access</Th>
              <Th>Added</Th>
            </tr>
          </THead>
          <TBody>
            {administrators.data.map((administrator) => (
              <tr key={administrator.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <span className="font-semibold text-slate-900">{administrator.firstName} {administrator.lastName}</span>
                  </div>
                </Td>
                <Td>{administrator.email}</Td>
                <Td><Badge tone={administrator.status === 'Active' ? 'green' : 'neutral'}>{administrator.status}</Badge></Td>
                <Td>
                  {administrator.mustChangePassword
                    ? <Badge tone="amber">Password change required</Badge>
                    : <Badge tone="blue">Ready</Badge>}
                </Td>
                <Td>{new Date(administrator.createdAt).toLocaleDateString()}</Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      {inviting && (
        <Modal open onClose={closeInvite} title="Invite platform administrator">
          <form className="space-y-4" onSubmit={submit} noValidate>
            <Alert tone="info">
              <div className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                <span>An invitation email with a server-generated temporary password will be queued after the account is created.</span>
              </div>
            </Alert>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name" htmlFor="platform-admin-first-name" error={errors.firstName}>
                <Input id="platform-admin-first-name" value={form.firstName} invalid={Boolean(errors.firstName)} onChange={(event) => setForm({ ...form, firstName: event.target.value })} autoFocus required />
              </FormField>
              <FormField label="Last name" htmlFor="platform-admin-last-name" error={errors.lastName}>
                <Input id="platform-admin-last-name" value={form.lastName} invalid={Boolean(errors.lastName)} onChange={(event) => setForm({ ...form, lastName: event.target.value })} required />
              </FormField>
            </div>
            <FormField label="Email" htmlFor="platform-admin-email" error={errors.email}>
              <Input id="platform-admin-email" type="email" value={form.email} invalid={Boolean(errors.email)} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" required />
            </FormField>
            {invite.isError && <ErrorState error={invite.error} />}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variant="secondary" onClick={closeInvite}>Cancel</Button>
              <Button type="submit" loading={invite.isPending}>Send invitation</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
