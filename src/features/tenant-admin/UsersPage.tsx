import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Pencil, Plus, ShieldCheck, UserRoundCheck, Users } from 'lucide-react';
import { adminApi, type User } from './api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

const ROLES = ['TenantAdministrator', 'Supervisor', 'Guard'] as const;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<User | 'new' | null>(null);

  const users = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.listUsers() });
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

function UserModal({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !user;
  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState<string[]>(user?.roles ?? ['Guard']);
  const [locationIds, setLocationIds] = useState<string[]>(user?.assignedLocationIds ?? []);
  const [isActive, setIsActive] = useState(user ? user.status === 'Active' : true);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  const save = useMutation({
    mutationFn: () =>
      isNew
        ? adminApi.createUser({ firstName, lastName, email, password, roles, assignedLocationIds: locationIds })
        : adminApi.updateUser(user!.id, { firstName, lastName, roles, assignedLocationIds: locationIds, isActive }),
    onSuccess: onSaved,
  });

  return (
    <Modal open onClose={onClose} title={isNew ? 'New user' : 'Edit user'} size="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField label="First name" htmlFor="fn">
            <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </FormField>
          <FormField label="Last name" htmlFor="ln">
            <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </FormField>
        </div>

        {isNew && (
          <>
            <FormField label="Email" htmlFor="email">
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FormField>
            <FormField label="Temporary password" htmlFor="pw">
              <Input id="pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </FormField>
          </>
        )}

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700">Roles</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                <input
                  type="checkbox"
                  checked={roles.includes(r)}
                  onChange={() => setRoles(toggle(roles, r))}
                  className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
                />
                <span className="font-semibold">{r.replace('TenantAdministrator', 'Tenant Admin')}</span>
              </label>
            ))}
          </div>
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
