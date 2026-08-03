import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, Banknote, CheckCircle2, Info, MapPin, Pencil, Plus, RotateCcw, Search, TimerReset } from 'lucide-react';
import { adminApi, type Location, type LocationInput, type LocationQuota, type RatePlan } from './api';
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
  allowCashPayment: true,
  slotCapacity: 20,
};

export function LocationsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Location | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations({ pageSize: 200 }) });
  const locationQuota = useQuery({ queryKey: ['admin-location-quota'], queryFn: adminApi.getLocationQuota });
  const ratePlans = useQuery({ queryKey: ['admin-rate-plans', 'locations-page'], queryFn: () => adminApi.listRatePlans(undefined, { pageSize: 200 }) });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-location-quota'] });
  };
  const archive = useMutation({ mutationFn: adminApi.archiveLocation, onSuccess: invalidate });
  const restore = useMutation({ mutationFn: adminApi.restoreLocation, onSuccess: invalidate });
  const allLocations = locations.data?.items ?? [];
  const activeCount = allLocations.filter((location) => location.status === 'Active').length;
  const archivedCount = allLocations.filter((location) => location.status === 'Archived').length;
  const activeCashCount = allLocations.filter((location) => location.status === 'Active' && location.allowCashPayment).length;
  const canCreateLocation = locationQuota.data?.canCreateLocation ?? false;
  const locationLimitMessage = locationQuota.data
    ? locationQuota.data.maximumLocations === null
      ? 'Additional locations require platform approval.'
      : `${locationQuota.data.subscriptionPlan} includes up to ${locationQuota.data.maximumLocations} active location${locationQuota.data.maximumLocations === 1 ? '' : 's'}.`
    : locationQuota.isError
      ? 'Location availability could not be verified. Please refresh and try again.'
      : 'Checking your location allowance...';
  const locationCtaLabel = locationQuota.isLoading
    ? 'Checking allowance...'
    : locationQuota.data?.maximumLocations === null
      ? 'Contact platform admin'
      : canCreateLocation
        ? 'New location'
        : 'Upgrade to add location';
  const locationNotice = locationQuota.data
    ? locationQuota.data.maximumLocations === null
      ? locationLimitMessage
      : `${locationLimitMessage} ${locationQuota.data.activeLocations} currently in use.`
    : locationLimitMessage;
  const filteredLocations = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allLocations.filter((location) => {
      const matchesStatus = statusFilter === 'all' || location.status.toLowerCase() === statusFilter;
      const matchesSearch = !term || location.name.toLowerCase().includes(term) || location.slug.toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [allLocations, search, statusFilter]);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Tenant administration"
        title="Parking locations"
        description="Keep locations ready for daily parking operations. Assign a rate plan before accepting vehicle entries."
        className="p-4"
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <Button
              onClick={() => setEditing('new')}
              disabled={!canCreateLocation || locationQuota.isLoading || locationQuota.isError}
              title={!canCreateLocation ? locationLimitMessage : undefined}
            >
              <Plus className="h-4 w-4" />
              {locationCtaLabel}
            </Button>
            <div className={`flex max-w-xs items-start gap-1.5 rounded-md px-2 py-1 text-xs leading-4 ${canCreateLocation ? 'text-slate-500' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'}`}>
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{locationNotice}</span>
            </div>
          </div>
        }
      />

      {locations.data && allLocations.length > 0 && activeCount === 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Archive className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">No active parking locations</p>
            <p className="mt-0.5 text-amber-800">All configured locations are archived and unavailable to guards. Restore a location to resume operations.</p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard icon={MapPin} iconSize="subtle" label="Configured locations" value={locations.data?.items.length ?? '...'} detail="Includes archived locations" tone="blue" />
        <MetricCard icon={TimerReset} iconSize="subtle" label="Active locations" value={activeCount} detail="Available to guards" tone="green" />
        <MetricCard icon={Banknote} iconSize="subtle" label="Active locations accepting cash" value={activeCashCount} detail="Operational locations only" tone="amber" />
      </div>

      {locations.isLoading && <LoadingState />}
      {locations.isError && <ErrorState error={locations.error} />}
      {locations.data && locations.data.items.length === 0 && (
        <EmptyState>
          <div className="space-y-3">
            <p className="font-semibold text-slate-900">Create your first parking location</p>
            <p className="mx-auto max-w-md leading-6">Your tenant account is ready. Add a location within your membership allowance, then assign an active rate plan before accepting vehicle entries.</p>
            <Button type="button" size="sm" onClick={() => setEditing('new')} disabled={!canCreateLocation || locationQuota.isLoading || locationQuota.isError}>
              <Plus className="h-4 w-4" />
              Create first location
            </Button>
          </div>
        </EmptyState>
      )}

      {locations.data && locations.data.items.length > 0 && (
        <section className="overflow-hidden rounded-lg bg-white/95 shadow-sm ring-1 ring-slate-200/80">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Location status">
              {([
                ['active', 'Active', activeCount],
                ['archived', 'Archived', archivedCount],
                ['all', 'All', allLocations.length],
              ] as const).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === value}
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${statusFilter === value ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {label} <span className="text-xs text-slate-400">{count}</span>
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search locations" className="h-10 pl-9" aria-label="Search locations" />
            </div>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No locations match the current filters.</div>
          ) : (
            <Table className="divide-y-0">
              <THead>
                <tr>
                  <Th>Location</Th>
                  <Th>Capacity</Th>
                  <Th>Grace period</Th>
                  <Th>Payment methods</Th>
                  <Th>Rate plan</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </THead>
              <TBody>
                {filteredLocations.map((l) => {
                  const plan = l.activeRatePlanId ? ratePlans.data?.items.find((item) => item.id === l.activeRatePlanId) : undefined;
                  return (
                    <tr key={l.id}>
                      <Td>
                        <button type="button" className="text-left font-semibold text-brand-700 hover:text-brand-900 hover:underline" onClick={() => setEditing(l)}>
                          {l.name}
                          <span className="mt-0.5 block font-mono text-xs font-normal text-slate-400">{l.slug}</span>
                        </button>
                      </Td>
                      <Td>{l.slotCapacity ?? '-'} slots</Td>
                      <Td>{plan?.paidExitGraceMinutes != null ? `${plan.paidExitGraceMinutes} minutes` : '—'}</Td>
                      <Td>{l.allowCashPayment ? 'Cash' : 'Digital only'}</Td>
                      <Td>
                        {l.activeRatePlanId ? plan?.name ?? 'Assigned plan' : <span className="font-medium text-amber-700">Not assigned</span>}
                      </Td>
                      <Td>
                        <Badge tone={l.status === 'Active' ? 'green' : 'neutral'}>
                          {l.status === 'Active' ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : <Archive className="mr-1 h-3.5 w-3.5" />}
                          {l.status}
                        </Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        {l.status === 'Active' ? (
                          <div className="flex justify-end gap-3">
                            <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setEditing(l)}>
                              <Pencil className="mr-1 inline h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button className="text-sm font-medium text-red-600 hover:underline" onClick={() => archive.mutate(l.id)} disabled={archive.isPending}>
                              <Archive className="mr-1 inline h-3.5 w-3.5" />
                              Archive
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setEditing(l)}>
                              View details
                            </button>
                            <button className="text-sm font-medium text-emerald-700 hover:underline" onClick={() => restore.mutate(l.id)} disabled={restore.isPending}>
                              <RotateCcw className="mr-1 inline h-3.5 w-3.5" />
                              Restore
                            </button>
                          </div>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </section>
      )}

      {editing && (
        <LocationModal
          location={editing === 'new' ? null : editing}
          ratePlans={(ratePlans.data?.items ?? []).filter((plan) => plan.status === 'Active')}
          quota={locationQuota.data}
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
  quota,
  onClose,
  onSaved,
}: {
  location: Location | null;
  ratePlans: RatePlan[];
  quota?: LocationQuota;
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
          allowCashPayment: location.allowCashPayment,
          slotCapacity: location.slotCapacity ?? 20,
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

  const capacityLimit = quota?.effectiveMaximumSlotsPerLocation ?? null;
  const capacityAllowanceKnown = quota !== undefined;
  const capacityExceedsLimit = capacityAllowanceKnown && capacityLimit !== null && form.slotCapacity > capacityLimit;
  const capacityInvalid = form.slotCapacity < 1 || capacityExceedsLimit;
  const saveDisabled = save.isPending || !capacityAllowanceKnown || capacityInvalid;

  const capacityLedger = !quota
    ? 'Checking the platform-approved capacity allowance...'
      : capacityLimit === null
        ? `${quota.subscriptionPlan} uses platform-managed capacity. No automatic slot cap is enforced for this tenant.`
      : `${quota.subscriptionPlan} capacity: ${quota.purchasedSlotCapacityPerLocation ?? quota.maximumSlotsPerLocation ?? 0} slots${quota.additionalSlotCapacity > 0 ? ` + ${quota.additionalSlotCapacity} add-on slots` : ''} = ${capacityLimit} slots per location.`;

  return (
    <Modal open onClose={onClose} title={isNew ? 'New location' : 'Edit location'} size="lg">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (saveDisabled) return;
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
        <FormField label="Timezone" htmlFor="tz">
          <Input id="tz" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
        </FormField>
        <FormField label="Parking slots" htmlFor="slot-capacity">
          <Input
            id="slot-capacity"
            type="number"
            min={1}
            max={capacityLimit ?? undefined}
            value={form.slotCapacity}
            onChange={(e) => setForm({ ...form, slotCapacity: Number(e.target.value) })}
            required
          />
          <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${capacityExceedsLimit ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-blue-50 text-blue-900 ring-blue-100'}`}>
            <p className="font-semibold">Capacity allowance</p>
            <p className="mt-0.5">{capacityLedger}</p>
            {capacityExceedsLimit && (
              <p className="mt-1 font-semibold">Reduce the capacity to {capacityLimit} or ask the platform administrator to approve more capacity.</p>
            )}
          </div>
        </FormField>
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
          <Button type="submit" loading={save.isPending} disabled={saveDisabled}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
