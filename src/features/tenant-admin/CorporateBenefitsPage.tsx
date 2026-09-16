import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleHelp,
  ChevronDown,
  Clock3,
  ListChecks,
  MapPin,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { adminApi, listAllPages, type CorporateBenefitInput, type CorporateBenefitProgram, type CorporateBenefitRules } from './api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Textarea } from '@/components/ui/Textarea';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const VEHICLES = ['Car', 'Motorcycle', 'Van', 'Truck', 'Other'];
const benefitStages = [
  { label: 'Basic details', description: 'Name the benefit' },
  { label: 'Locations', description: 'Set shared capacity' },
  { label: 'Schedule', description: 'Set complimentary hours' },
  { label: 'Eligibility', description: 'Choose eligible vehicles' },
  { label: 'Revision', description: 'Set effective dates' },
  { label: 'Review', description: 'Confirm before saving' },
  { label: 'Saved', description: 'Revision is active' },
];

const defaultRules: CorporateBenefitRules = {
  windows: [{ start: '08:00', end: '20:00' }],
  daysOfWeek: DAYS.slice(0, 5),
  holidays: [],
  excludeHolidays: false,
  eligibleVehicleTypes: [],
  outsideWindowBehavior: 'NormalRate',
};

export function CorporateBenefitsPage() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CorporateBenefitProgram | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Paused'>('all');
  const [showArchived, setShowArchived] = useState(false);
  const benefits = useQuery({ queryKey: ['admin-corporate-benefits'], queryFn: adminApi.listCorporateBenefits });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-corporate-benefits'] });
  const programs = benefits.data ?? [];
  const archivedPrograms = programs.filter((program) => program.status === 'Archived');
  const activePrograms = programs.filter((program) => program.status !== 'Archived');
  const normalizedSearch = search.trim().toLowerCase();
  const matchesSearch = (program: CorporateBenefitProgram) => {
    if (!normalizedSearch) return true;
    return [
      program.name,
      program.description,
      ...program.locations.map((location) => location.locationName),
    ].some((value) => value.toLowerCase().includes(normalizedSearch));
  };
  const visiblePrograms = activePrograms.filter((program) =>
    (statusFilter === 'all' || program.status === statusFilter) && matchesSearch(program));
  const visibleArchivedPrograms = archivedPrograms.filter(matchesSearch);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Corporate parking benefits"
        description="Manage shared complimentary-parking benefits for corporate partners."
        actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />New corporate benefit</Button>}
      />

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
        <CircleHelp className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Complimentary parking spaces are shared within each benefit. When all spaces are in use, additional vehicles are charged at the standard rate.</span>
      </div>

      {benefits.isLoading && <LoadingState />}
      {benefits.isError && <ErrorState error={benefits.error} />}

      {benefits.data && (
        <section className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-950">Corporate benefits</h2>
              <p className="mt-1 text-sm text-slate-500">
                {activePrograms.length} active program{activePrograms.length === 1 ? '' : 's'}{archivedPrograms.length > 0 ? ` · ${archivedPrograms.length} archived` : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative block">
                <span className="sr-only">Search corporate benefits</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search benefits" className="w-full pl-9 sm:w-44" />
              </label>
              <label>
                <span className="sr-only">Filter benefit status</span>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'Active' | 'Paused')} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 sm:w-36">
                  <option value="all">All statuses</option>
                  <option value="Active">Active only</option>
                  <option value="Paused">Paused only</option>
                </select>
              </label>
            </div>
          </div>

          {visiblePrograms.length > 0 ? (
            <div>
              <div className="hidden grid-cols-[minmax(12rem,1.4fr)_minmax(9rem,1fr)_minmax(10rem,1.2fr)_6rem_2.5rem] gap-4 bg-blue-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-600 lg:grid lg:px-6">
                <span>Corporate benefit</span><span>Capacity</span><span>Coverage</span><span>Status</span><span />
              </div>
              <div className="divide-y divide-slate-100">
                {visiblePrograms.map((program) => (
                  <BenefitProgramRow key={program.id} program={program} onEdit={() => setEditing(program)} onChanged={invalidate} />
                ))}
              </div>
            </div>
          ) : (
            <div className="px-5 py-8 sm:px-6">
              <EmptyState>{activePrograms.length === 0 ? 'No active corporate benefits yet.' : 'No active corporate benefits match your filters.'}</EmptyState>
            </div>
          )}

          {archivedPrograms.length > 0 && (
            <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-950">Archived corporate benefits</h3>
                  <p className="mt-1 text-sm text-slate-500">{archivedPrograms.length} archived benefit{archivedPrograms.length === 1 ? '' : 's'} hidden from the active list</p>
                </div>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowArchived((current) => !current)}>{showArchived ? 'Hide archived benefits' : 'View archived benefits'}</Button>
              </div>
              {showArchived && (
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                  {visibleArchivedPrograms.length > 0 ? visibleArchivedPrograms.map((program) => (
                    <BenefitProgramRow key={program.id} program={program} onEdit={() => setEditing(program)} onChanged={invalidate} archived />
                  )) : <p className="px-4 py-5 text-sm text-slate-500">No archived benefits match your search.</p>}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {editing && (
        <BenefitModal
          program={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onPersisted={invalidate}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}
    </div>
  );
}

function BenefitProgramRow({ program, onEdit, onChanged, archived = false }: { program: CorporateBenefitProgram; onEdit: () => void; onChanged: () => void; archived?: boolean }) {
  const setStatus = useMutation({
    mutationFn: (status: string) => adminApi.setCorporateBenefitStatus(program.id, status),
    onSuccess: onChanged,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const active = program.locations.reduce((total, location) => total + location.activeAllocations, 0);
  const capacity = program.locations.reduce((total, location) => total + location.maxConcurrentFreeSessions, 0);
  const rules = program.rules;
  const vehicleSummary = rules.eligibleVehicleTypes.length > 0 ? rules.eligibleVehicleTypes.join(' + ') : 'All vehicles';
  const daySummary = summarizeDays(rules.daysOfWeek);
  return (
    <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(12rem,1.4fr)_minmax(9rem,1fr)_minmax(10rem,1.2fr)_6rem_2.5rem] lg:items-center lg:gap-4 lg:px-6">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Corporate benefit</p>
        <p className="truncate text-sm font-bold text-slate-950">{program.name}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{program.description || 'Guard-assigned eligibility'}</p>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Capacity</p>
        <p className="text-sm font-semibold text-slate-900">{Math.max(0, capacity - active)} available</p>
        <p className="mt-1 text-xs text-slate-500">{active} of {capacity} spaces used</p>
      </div>
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Coverage</p>
        <p className="text-sm font-medium text-slate-800">{program.locations.map((location) => location.locationName).join(', ') || 'No location assigned'}</p>
        <p className="mt-1 text-xs text-slate-500">{daySummary} · {vehicleSummary}</p>
      </div>
      <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 lg:hidden">Status</p><Badge tone={program.status === 'Active' ? 'green' : program.status === 'Paused' ? 'amber' : 'neutral'}>{program.status}</Badge></div>
      <div className="relative flex justify-end">
        {!archived && <>
          <button type="button" aria-label={`Actions for ${program.name}`} onClick={() => setMenuOpen((current) => !current)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"><MoreHorizontal className="h-4 w-4" /></button>
          {menuOpen && <div className="absolute bottom-9 right-0 z-20 min-w-36 rounded-lg border border-slate-200 bg-white p-1 text-sm shadow-lg">
            <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50" onClick={() => { setMenuOpen(false); onEdit(); }}><Pencil className="h-3.5 w-3.5" />Edit benefit</button>
            <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-50 disabled:opacity-50" disabled={setStatus.isPending} onClick={() => { setMenuOpen(false); setStatus.mutate(program.status === 'Active' ? 'Paused' : 'Active'); }}>{program.status === 'Active' ? <PauseCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}{program.status === 'Active' ? 'Pause benefit' : 'Resume benefit'}</button>
            <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-700 hover:bg-red-50 disabled:opacity-50" disabled={setStatus.isPending} onClick={() => { setMenuOpen(false); setStatus.mutate('Archived'); }}>Archive benefit</button>
          </div>}
        </>}
      </div>
    </div>
  );
}

function summarizeDays(days: string[]) {
  if (days.length === 7) return 'Mon–Sun';
  if (days.length === 5 && ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].every((day) => days.includes(day))) return 'Mon–Fri';
  return days.map((day) => day.slice(0, 3)).join(', ') || 'No days configured';
}

function BenefitModal({ program, onClose, onSaved, onPersisted }: { program: CorporateBenefitProgram | null; onClose: () => void; onSaved: () => void; onPersisted: () => void }) {
  const locations = useQuery({ queryKey: ['admin-locations', 'benefits'], queryFn: () => listAllPages(adminApi.listLocations) });
  const isNew = !program;
  const [stage, setStage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [priority, setPriority] = useState(program?.priority ?? 0);
  const [rules, setRules] = useState<CorporateBenefitRules>(() => program ? { ...program.rules } : defaultRules);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [holidaySettingsOpen, setHolidaySettingsOpen] = useState(Boolean(program?.rules.excludeHolidays || program?.rules.holidays.length));
  const [selectedLocations, setSelectedLocations] = useState<Record<string, number>>(() =>
    Object.fromEntries(program?.locations.map((location) => [location.parkingLocationId, location.maxConcurrentFreeSessions]) ?? []),
  );
  const revisionTimezone = locations.data?.items.find((location) => selectedLocations[location.id] !== undefined)?.timezone ?? 'UTC';

  const payload = useMemo<CorporateBenefitInput>(() => ({
    name: name.trim(),
    description: description.trim() || null,
    priority,
    locations: Object.entries(selectedLocations).map(([parkingLocationId, maxConcurrentFreeSessions]) => ({ parkingLocationId, maxConcurrentFreeSessions })),
    rules,
    effectiveFrom: effectiveFrom ? zonedDateTimeToIso(effectiveFrom, '00:00:00', revisionTimezone) : null,
    effectiveTo: effectiveTo ? zonedDateTimeToIso(effectiveTo, '23:59:59', revisionTimezone) : null,
  }), [description, effectiveFrom, effectiveTo, name, priority, revisionTimezone, rules, selectedLocations]);

  const save = useMutation({
    mutationFn: () => isNew ? adminApi.createCorporateBenefit(payload) : adminApi.updateCorporateBenefit(program!.id, payload),
    onSuccess: () => { setDirty(false); onPersisted(); setStage(6); },
  });

  const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
  const updateRules = (next: CorporateBenefitRules) => { setDirty(true); setRules(next); };
  const setWindow = (index: number, key: 'start' | 'end', value: string) => updateRules({ ...rules, windows: rules.windows.map((window, i) => i === index ? { ...window, [key]: value } : window) });
  const toggleLocation = (id: string) => setSelectedLocations((current) => {
    setDirty(true);
    const next = { ...current };
    if (next[id] === undefined) next[id] = 1; else delete next[id];
    return next;
  });
  const canContinue = stage === 0
    ? Boolean(name.trim())
    : stage === 1
      ? Object.keys(selectedLocations).length > 0
      : stage === 2
        ? rules.windows.length > 0 && rules.daysOfWeek.length > 0
        : true;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  const handleClose = () => {
    if (stage === 6) { onSaved(); return; }
    if (!dirty || window.confirm('Discard your unsaved corporate benefit changes?')) onClose();
  };

  return (
    <Modal open onClose={handleClose} title={isNew ? 'New corporate benefit' : `Edit corporate benefit: ${program.name}`} size="xl">
      <BenefitStepIndicator current={stage} />
      {stage === 5 ? (
        <ReviewStep
          isNew={isNew}
          payload={payload}
          effectiveFromDate={effectiveFrom}
          effectiveToDate={effectiveTo}
          locations={locations.data?.items ?? []}
          onBack={() => { save.reset(); setStage(4); }}
          onConfirm={() => save.mutate()}
          saving={save.isPending}
          error={save.error}
        />
      ) : stage === 6 ? (
        <SavedStep isNew={isNew} onDone={onSaved} />
      ) : (
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (canContinue) setStage((current) => current + 1); }}>
          {stage === 0 && <SectionCard icon={<ListChecks className="h-4 w-4" />} title="Basic details" description="Name the benefit and set its selection priority.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Benefit name" htmlFor="benefit-name"><Input id="benefit-name" value={name} onChange={(event) => { setDirty(true); setName(event.target.value); }} required maxLength={160} placeholder="e.g. Acme employee parking" /></FormField>
              <FormField label="Priority (optional)" htmlFor="benefit-priority"><Input id="benefit-priority" type="number" min={0} max={10000} value={priority} onChange={(event) => { setDirty(true); setPriority(Number(event.target.value)); }} /><p className="text-xs text-slate-500">Higher-priority benefits appear first when multiple benefits are available.</p></FormField>
            </div>
            <FormField label="Description (optional)" htmlFor="benefit-description"><Textarea id="benefit-description" value={description} onChange={(event) => { setDirty(true); setDescription(event.target.value); }} maxLength={500} rows={2} placeholder="e.g. Complimentary parking for Acme employees" /></FormField>
          </SectionCard>}

          {stage === 1 && <SectionCard icon={<MapPin className="h-4 w-4" />} title="Parking locations" description="Select where this benefit applies and set the complimentary spaces available at each location.">
            <div className="space-y-2">
              {locations.isLoading && <LoadingState label="Loading locations..." />}
              {locations.data?.items.filter((location) => location.status === 'Active').map((location) => {
                const selected = selectedLocations[location.id] !== undefined;
                return (
                  <div key={location.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 transition ${selected ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
                      <input type="checkbox" checked={selected} onChange={() => toggleLocation(location.id)} className="h-4 w-4 accent-brand-700" />
                      {location.name}
                    </label>
                    {selected && <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Complimentary spaces<Input aria-label={`${location.name} complimentary spaces`} className="w-24" type="number" min={1} max={100000} value={selectedLocations[location.id]} onChange={(event) => { setDirty(true); setSelectedLocations({ ...selectedLocations, [location.id]: Math.max(1, Number(event.target.value)) }); }} /></label>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-slate-500">Capacity is shared across all vehicles using this benefit at a location. Once all spaces are in use, additional vehicles may enter but are charged at the standard rate.</p>
          </SectionCard>}

          {stage === 2 && <SectionCard icon={<Clock3 className="h-4 w-4" />} title="Schedule" description="Parking during these windows is complimentary. Time outside the windows or on unselected days is charged at the standard rate.">
            <div className="space-y-3">
              {rules.windows.map((window, index) => (
                <div key={`${index}-${window.start}-${window.end}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-end gap-3">
                    <FormField label={index === 0 ? 'Start time' : `Window ${index + 1} start`} htmlFor={`window-from-${index}`}><Input id={`window-from-${index}`} type="time" value={window.start} onChange={(event) => setWindow(index, 'start', event.target.value)} required /></FormField>
                    <FormField label="End time" htmlFor={`window-until-${index}`}><Input id={`window-until-${index}`} type="time" value={window.end} onChange={(event) => setWindow(index, 'end', event.target.value)} required /></FormField>
                    {index > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => updateRules({ ...rules, windows: rules.windows.filter((_, i) => i !== index) })}><Trash2 className="h-3.5 w-3.5" />Remove</Button>}
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => updateRules({ ...rules, windows: [...rules.windows, { start: '08:00', end: '20:00' }] })}><Plus className="h-3.5 w-3.5" />Add another time window</Button>
            </div>
            <div className="pt-1">
              <p className="mb-2 text-sm font-semibold text-slate-700">Days when complimentary parking is available</p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((day) => {
                  const selected = rules.daysOfWeek.includes(day);
                  return <button key={day} type="button" aria-pressed={selected} onClick={() => updateRules({ ...rules, daysOfWeek: toggle(rules.daysOfWeek, day) })} className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>{day.slice(0, 3)}</button>;
                })}
              </div>
            </div>
            <details className="group rounded-lg border border-slate-200 bg-white" open={holidaySettingsOpen} onToggle={(event) => setHolidaySettingsOpen(event.currentTarget.open)}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 [&::-webkit-details-marker]:hidden">
                <span>Holiday settings <span className="font-normal text-slate-400">(optional)</span></span><ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-slate-100 px-4 py-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={rules.excludeHolidays} onChange={(event) => updateRules({ ...rules, excludeHolidays: event.target.checked })} className="h-4 w-4 accent-brand-700" />Exclude configured holidays from complimentary parking</label>
                <FormField label="Holiday dates (optional)" htmlFor="benefit-holidays"><Textarea id="benefit-holidays" value={rules.holidays.join('\n')} onChange={(event) => updateRules({ ...rules, holidays: event.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} rows={2} placeholder="2026-12-25" /><p className="text-xs text-slate-500">Enter one date per line using yyyy-MM-dd format.</p></FormField>
              </div>
            </details>
          </SectionCard>}

          {stage === 3 && <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="Eligibility" description="Specify which vehicle types may use this benefit.">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-950">At entry, the guard selects this benefit after entering the vehicle plate. No approved plate list is required. The shared capacity limit still applies.</div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Eligible vehicle types <span className="font-normal text-slate-400">(optional)</span></p>
              <p className="mb-3 text-xs text-slate-500">Leave all unselected to allow every vehicle type.</p>
              <div className="flex flex-wrap gap-2">
                {VEHICLES.map((type) => {
                  const selected = rules.eligibleVehicleTypes.includes(type);
                  return <button key={type} type="button" aria-pressed={selected} onClick={() => updateRules({ ...rules, eligibleVehicleTypes: toggle(rules.eligibleVehicleTypes, type) })} className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>{selected && <Check className="mr-1 inline h-3.5 w-3.5" />}{type}</button>;
                })}
              </div>
            </div>
          </SectionCard>}

          {stage === 4 && <SectionCard icon={<CalendarDays className="h-4 w-4" />} title="Revision (optional)" description="Set when this benefit revision takes effect. Leave both dates blank to apply it immediately.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Effective from (optional)" htmlFor="benefit-effective-from"><Input id="benefit-effective-from" type="date" value={effectiveFrom} onChange={(event) => { setDirty(true); setEffectiveFrom(event.target.value); }} /><p className="text-xs text-slate-500">Leave blank to apply immediately.</p></FormField>
              <FormField label="Effective until (optional)" htmlFor="benefit-effective-to"><Input id="benefit-effective-to" type="date" value={effectiveTo} onChange={(event) => { setDirty(true); setEffectiveTo(event.target.value); }} /></FormField>
            </div>
          </SectionCard>}

          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_20px_-18px_rgba(15,39,66,0.45)] backdrop-blur">
            <p className="hidden text-xs text-slate-500 sm:block">Step {stage + 1} of 5 · Review your changes before saving.</p>
            <div className="ml-auto flex gap-2"><Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>{stage > 0 && <Button type="button" variant="secondary" onClick={() => setStage((current) => current - 1)}><ArrowLeft className="h-4 w-4" />Back</Button>}<Button type="submit" disabled={!canContinue}>{stage === 4 ? 'Review changes' : 'Continue'}<ArrowRight className="h-4 w-4" /></Button></div>
          </div>
        </form>
      )}
    </Modal>
  );
}

function BenefitStepIndicator({ current }: { current: number }) {
  return (
    <ol className="mb-5 grid gap-2 sm:grid-cols-3 xl:grid-cols-7">
      {benefitStages.map((stage, index) => (
        <li key={stage.label} className={`rounded-lg px-3 py-2 ring-1 transition ${index === current ? 'bg-brand-700 text-white ring-brand-700' : index < current ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-white text-slate-500 ring-slate-200'}`}>
          <span className="block text-xs font-bold uppercase tracking-wide">{index < current ? '✓ ' : `${index + 1}. `}{stage.label}</span>
          <span className={`mt-0.5 block text-xs ${index === current ? 'text-white/80' : 'text-slate-500'}`}>{stage.description}</span>
        </li>
      ))}
    </ol>
  );
}

function SavedStep({ isNew, onDone }: { isNew: boolean; onDone: () => void }) {
  return (
    <div className="flex min-h-[24rem] flex-col items-center justify-center py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-8 w-8" /></div>
      <h3 className="mt-5 text-xl font-bold text-slate-950">{isNew ? 'Corporate benefit created' : 'Corporate benefit updated'}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">This benefit is now available for new parking sessions. Existing sessions keep the rules that applied when they entered.</p>
      <div className="mt-8"><Button type="button" onClick={onDone}>Close</Button></div>
    </div>
  );
}

function ReviewStep({ isNew, payload, effectiveFromDate, effectiveToDate, locations, onBack, onConfirm, saving, error }: { isNew: boolean; payload: CorporateBenefitInput; effectiveFromDate: string; effectiveToDate: string; locations: Array<{ id: string; name: string }>; onBack: () => void; onConfirm: () => void; saving: boolean; error: Error | null }) {
  const locationNames = payload.locations.map((assignment) => `${locations.find((location) => location.id === assignment.parkingLocationId)?.name ?? 'Selected location'} (${assignment.maxConcurrentFreeSessions} complimentary space${assignment.maxConcurrentFreeSessions === 1 ? '' : 's'})`);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4"><p className="text-sm font-bold text-brand-950">Review your changes</p><p className="mt-1 text-sm leading-6 text-brand-900">Confirm these settings before {isNew ? 'creating the corporate benefit' : 'saving the new revision'}. Existing sessions keep the benefit version that applied when they entered.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewItem label="Benefit" value={payload.name || '—'} />
        <ReviewItem label="Priority" value={String(payload.priority)} />
        <ReviewItem label="Parking locations" value={locationNames.join(', ') || '—'} />
        <ReviewItem label="Complimentary hours" value={payload.rules.windows.map((window) => `${window.start}–${window.end}`).join(', ')} />
        <ReviewItem label="Eligible days" value={payload.rules.daysOfWeek.map((day) => day.slice(0, 3)).join(', ') || '—'} />
        <ReviewItem label="Eligible vehicle types" value={payload.rules.eligibleVehicleTypes.length > 0 ? payload.rules.eligibleVehicleTypes.join(', ') : 'All vehicle types'} />
        <ReviewItem label="Selection" value="Guard selects the benefit at entry" />
        <ReviewItem label="Revision" value={formatRevision(effectiveFromDate, effectiveToDate)} />
      </div>
      {payload.rules.excludeHolidays && <ReviewItem label="Holiday handling" value={`Exclude ${payload.rules.holidays.length > 0 ? payload.rules.holidays.join(', ') : 'configured holidays'} from complimentary parking`} />}
      {error && <ErrorState error={error} />}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_20px_-18px_rgba(15,39,66,0.45)] backdrop-blur"><Button type="button" variant="secondary" onClick={onBack} disabled={saving}>Back to edit</Button><Button type="button" onClick={onConfirm} loading={saving}>{isNew ? 'Create benefit' : 'Save changes'}</Button></div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p></div>;
}

function SectionCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">{icon}{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>{children}</section>;
}

function formatRevision(effectiveFrom: string, effectiveTo: string) {
  if (!effectiveFrom && !effectiveTo) return 'Applies immediately';
  if (!effectiveFrom) return `Starts immediately to ${effectiveTo}`;
  if (!effectiveTo) return `Starts ${effectiveFrom} with no end date`;
  return `${effectiveFrom} to ${effectiveTo}`;
}

function zonedDateTimeToIso(date: string, time: string, timeZone: string) {
  try {
    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute, second] = time.split(':').map(Number);
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(new Date(utcGuess));
    const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour) === 24 ? 0 : Number(values.hour), Number(values.minute), Number(values.second));
    return new Date(utcGuess - (localAsUtc - utcGuess)).toISOString();
  } catch {
    return `${date}T${time}Z`;
  }
}
