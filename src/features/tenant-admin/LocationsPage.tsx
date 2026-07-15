import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Banknote, MapPin, Pencil, Plus, TimerReset } from 'lucide-react';
import { adminApi, type Location, type LocationInput, type RatePlan } from './api';
import { slugify } from '@/lib/slug';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormField } from '@/components/ui/FormField';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

const empty: LocationInput = {
  name: '',
  slug: '',
  address: '',
  timezone: 'Asia/Manila',
  exitGraceMinutes: 15,
  allowCashPayment: true,
};

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Location | 'new' | null>(null);

  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });
  const ratePlans = useQuery({ queryKey: ['admin-rate-plans', 'locations-page'], queryFn: () => adminApi.listRatePlans(undefined, { pageSize: 200 }) });
  const planNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const plan of ratePlans.data?.items ?? []) {
      names.set(plan.id, plan.name);
    }
    return names;
  }, [ratePlans.data?.items]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
  const archive = useMutation({ mutationFn: adminApi.archiveLocation, onSuccess: invalidate });
  const activeCount = locations.data?.items.filter((location) => location.status === 'Active').length ?? 0;
  const cashCount = locations.data?.items.filter((location) => location.allowCashPayment).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Parking locations"
        description="Manage branches, public lookup slugs, guard exit grace, and cash-payment availability. Assign reusable rate plans to each location."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" />
            New location
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={MapPin} label="Total locations" value={locations.data?.items.length ?? '...'} detail="Configured branches" tone="blue" />
        <MetricCard icon={TimerReset} label="Active locations" value={activeCount} detail="Available to guards" tone="green" />
        <MetricCard icon={Banknote} label="Cash enabled" value={cashCount} detail="Locations accepting cash" tone="amber" />
      </div>

      {locations.isLoading && <LoadingState />}
      {locations.isError && <ErrorState error={locations.error} />}
      {locations.data && locations.data.items.length === 0 && <EmptyState>No locations yet.</EmptyState>}

      {locations.data && locations.data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Grace</Th>
              <Th>Cash</Th>
              <Th>Assigned rate plan</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </THead>
          <TBody>
            {locations.data.items.map((l) => (
              <tr key={l.id}>
                <Td className="font-medium text-slate-900">{l.name}</Td>
                <Td className="font-mono text-xs">{l.slug}</Td>
                <Td>{l.exitGraceMinutes}m</Td>
                <Td>{l.allowCashPayment ? 'Yes' : 'No'}</Td>
                <Td>
                  {l.activeRatePlanId ? planNames.get(l.activeRatePlanId) ?? 'Assigned plan' : <span className="text-amber-700">None</span>}
                </Td>
                <Td>
                  <Badge tone={l.status === 'Active' ? 'green' : 'neutral'}>{l.status}</Badge>
                </Td>
                <Td className="space-x-3 text-right">
                  <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setEditing(l)}>
                    <Pencil className="mr-1 inline h-3.5 w-3.5" />
                    Edit
                  </button>
                  {l.status === 'Active' && (
                    <button
                      className="text-sm font-medium text-red-600 hover:underline"
                      onClick={() => archive.mutate(l.id)}
                    >
                      <Archive className="mr-1 inline h-3.5 w-3.5" />
                      Archive
                    </button>
                  )}
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      {editing && (
        <LocationModal
          location={editing === 'new' ? null : editing}
          ratePlans={(ratePlans.data?.items ?? []).filter((plan) => plan.status === 'Active')}
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

function LocationModal({
  location,
  ratePlans,
  onClose,
  onSaved,
}: {
  location: Location | null;
  ratePlans: RatePlan[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !location;
  const [form, setForm] = useState<LocationInput>(
    location
      ? {
          name: location.name,
          slug: location.slug,
          address: location.address ?? '',
          timezone: location.timezone,
          exitGraceMinutes: location.exitGraceMinutes,
          allowCashPayment: location.allowCashPayment,
          ratePlanId: location.activeRatePlanId,
        }
      : { ...empty, ratePlanId: null },
  );

  const save = useMutation({
    mutationFn: () => {
      if (isNew) {
        return adminApi.createLocation({ ...form, slug: form.slug || slugify(form.name) });
      }
      const { slug: _slug, ...rest } = form;
      void _slug;
      return adminApi.updateLocation(location!.id, { ...rest, clearRatePlan: !rest.ratePlanId });
    },
    onSuccess: onSaved,
  });

  return (
    <Modal open onClose={onClose} title={isNew ? 'New location' : 'Edit location'} size="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Name" htmlFor="name">
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </FormField>
          {isNew && (
            <FormField label="Slug (optional)" htmlFor="slug">
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder={slugify(form.name) || 'auto-generated'}
              />
            </FormField>
          )}
        </div>
        <FormField label="Address" htmlFor="address">
          <Input
            id="address"
            value={form.address ?? ''}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Timezone" htmlFor="tz">
            <Input id="tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </FormField>
          <FormField label="Exit grace (min)" htmlFor="grace">
            <Input
              id="grace"
              type="number"
              min={0}
              value={form.exitGraceMinutes}
              onChange={(e) => setForm({ ...form, exitGraceMinutes: Number(e.target.value) })}
            />
          </FormField>
        </div>
        <label className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-200">
          <input
            type="checkbox"
            checked={form.allowCashPayment}
            onChange={(e) => setForm({ ...form, allowCashPayment: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
          />
          <span>
            <span className="block font-semibold text-slate-900">Allow cash payments</span>
            <span className="text-slate-500">Guards can record cash settlements at this location.</span>
          </span>
        </label>

        {!isNew && (
          <FormField label="Assigned rate plan" htmlFor="rate-plan">
            <Select
              id="rate-plan"
              value={form.ratePlanId ?? ''}
              onChange={(e) => setForm({ ...form, ratePlanId: e.target.value || null })}
            >
              <option value="">No rate plan assigned</option>
              {ratePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
            </Select>
            <p className="text-sm text-slate-500">Choose any active reusable plan for this location.</p>
          </FormField>
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
