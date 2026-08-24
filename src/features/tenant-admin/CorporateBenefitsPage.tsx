import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ListChecks,
  MapPin,
  PauseCircle,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { adminApi, type CorporateBenefitInput, type CorporateBenefitProgram, type CorporateBenefitRules } from './api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
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
  { label: 'Schedule', description: 'Choose free windows' },
  { label: 'Eligibility', description: 'Choose vehicles and plates' },
  { label: 'Revision', description: 'Set optional dates' },
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
  const benefits = useQuery({ queryKey: ['admin-corporate-benefits'], queryFn: adminApi.listCorporateBenefits });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-corporate-benefits'] });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant administration"
        title="Corporate parking benefits"
        description="Give a company a shared, configurable free-parking entitlement for approved plate numbers."
        actions={<Button onClick={() => setEditing('new')}><Plus className="h-4 w-4" />New benefit program</Button>}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
        A free slot is shared by the whole company program. When its capacity is occupied, other approved plates still enter but are charged using the normal rate plan.
      </div>

      {benefits.isLoading && <LoadingState />}
      {benefits.isError && <ErrorState error={benefits.error} />}
      {benefits.data?.length === 0 && <EmptyState>No corporate benefit programs yet.</EmptyState>}
      {benefits.data && benefits.data.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {benefits.data.map((program) => (
            <BenefitCard key={program.id} program={program} onEdit={() => setEditing(program)} onChanged={invalidate} />
          ))}
        </div>
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

function BenefitCard({ program, onEdit, onChanged }: { program: CorporateBenefitProgram; onEdit: () => void; onChanged: () => void }) {
  const setStatus = useMutation({
    mutationFn: (status: string) => adminApi.setCorporateBenefitStatus(program.id, status),
    onSuccess: onChanged,
  });
  const active = program.locations.reduce((total, location) => total + location.activeAllocations, 0);
  const capacity = program.locations.reduce((total, location) => total + location.maxConcurrentFreeSessions, 0);
  const rules = program.rules;
  return (
    <Card className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-slate-950">{program.name}</h2>
          <p className="mt-1 text-sm text-slate-600">{program.description || 'No description provided.'}</p>
        </div>
        <Badge tone={program.status === 'Active' ? 'green' : program.status === 'Paused' ? 'amber' : 'neutral'}>{program.status}</Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Free windows" value={rules.windows.map((window) => `${window.start}–${window.end}`).join(', ')} />
        <Info label="Shared capacity" value={`${active} / ${capacity}`} />
        <Info label="Approved plates" value={`${program.plates.filter((plate) => plate.isActive).length}`} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-slate-600">
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{program.locations.map((location) => location.locationName).join(', ')}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1">{rules.daysOfWeek.join(', ')}</span>
        {rules.excludeHolidays && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">Excludes holidays</span>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
        {program.status !== 'Archived' && <Button size="sm" variant="secondary" onClick={onEdit}><Pencil className="h-3.5 w-3.5" />Edit</Button>}
        {program.status === 'Active' && <Button size="sm" variant="secondary" onClick={() => setStatus.mutate('Paused')} loading={setStatus.isPending}><PauseCircle className="h-3.5 w-3.5" />Pause</Button>}
        {program.status === 'Paused' && <Button size="sm" variant="secondary" onClick={() => setStatus.mutate('Active')} loading={setStatus.isPending}><CheckCircle2 className="h-3.5 w-3.5" />Resume</Button>}
        {program.status !== 'Archived' && <Button size="sm" variant="danger" onClick={() => setStatus.mutate('Archived')} loading={setStatus.isPending}>Archive</Button>}
      </div>
    </Card>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-900">{value}</p></div>;
}

function BenefitModal({ program, onClose, onSaved, onPersisted }: { program: CorporateBenefitProgram | null; onClose: () => void; onSaved: () => void; onPersisted: () => void }) {
  const locations = useQuery({ queryKey: ['admin-locations', 'benefits'], queryFn: () => adminApi.listLocations({ pageSize: 200 }) });
  const isNew = !program;
  const [stage, setStage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState(program?.name ?? '');
  const [description, setDescription] = useState(program?.description ?? '');
  const [priority, setPriority] = useState(program?.priority ?? 0);
  const [rules, setRules] = useState<CorporateBenefitRules>(program?.rules ?? defaultRules);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [effectiveTo, setEffectiveTo] = useState('');
  const [holidaySettingsOpen, setHolidaySettingsOpen] = useState(Boolean(program?.rules.excludeHolidays || program?.rules.holidays.length));
  const [selectedLocations, setSelectedLocations] = useState<Record<string, number>>(() =>
    Object.fromEntries(program?.locations.map((location) => [location.parkingLocationId, location.maxConcurrentFreeSessions]) ?? []),
  );
  const [plateNumbers, setPlateNumbers] = useState<string[]>(program?.plates.filter((plate) => plate.isActive).map((plate) => plate.plateNumber) ?? []);
  const [plateInput, setPlateInput] = useState('');
  const revisionTimezone = locations.data?.items.find((location) => selectedLocations[location.id] !== undefined)?.timezone ?? 'UTC';

  const payload = useMemo<CorporateBenefitInput>(() => ({
    name: name.trim(),
    description: description.trim() || null,
    priority,
    locations: Object.entries(selectedLocations).map(([parkingLocationId, maxConcurrentFreeSessions]) => ({ parkingLocationId, maxConcurrentFreeSessions })),
    rules,
    plateNumbers,
    effectiveFrom: effectiveFrom ? zonedDateTimeToIso(effectiveFrom, '00:00:00', revisionTimezone) : null,
    effectiveTo: effectiveTo ? zonedDateTimeToIso(effectiveTo, '23:59:59', revisionTimezone) : null,
  }), [description, effectiveFrom, effectiveTo, name, plateNumbers, priority, revisionTimezone, rules, selectedLocations]);

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
  const addPlates = (raw: string) => {
    const additions = raw.split(/[\n,]+/).map((plate) => plate.trim()).filter(Boolean);
    if (additions.length === 0) return;
    setDirty(true);
    setPlateNumbers((current) => {
      const seen = new Set(current.map(normalizePlateForUi));
      return [...current, ...additions.filter((plate) => {
        const key = normalizePlateForUi(plate);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })];
    });
    setPlateInput('');
  };
  const onPlateKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addPlates(plateInput);
    }
  };
  const canContinue = stage === 0
    ? Boolean(name.trim())
    : stage === 1
      ? Object.keys(selectedLocations).length > 0
      : stage === 2
        ? rules.windows.length > 0 && rules.daysOfWeek.length > 0
        : stage === 3
          ? plateNumbers.length > 0
          : true;
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);
  const handleClose = () => {
    if (stage === 6) { onSaved(); return; }
    if (!dirty || window.confirm('Discard unsaved corporate benefit changes?')) onClose();
  };

  return (
    <Modal open onClose={handleClose} title={isNew ? 'New corporate benefit' : `Edit ${program.name}`} size="xl">
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
          {stage === 0 && <SectionCard icon={<ListChecks className="h-4 w-4" />} title="Basic details" description="Name this company benefit and set how it should be selected when programs overlap.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company / program name" htmlFor="benefit-name"><Input id="benefit-name" value={name} onChange={(event) => { setDirty(true); setName(event.target.value); }} required maxLength={160} placeholder="e.g. Julicis Benefit" /></FormField>
              <FormField label="Priority (optional)" htmlFor="benefit-priority"><Input id="benefit-priority" type="number" min={0} max={10000} value={priority} onChange={(event) => { setDirty(true); setPriority(Number(event.target.value)); }} /><p className="text-xs text-slate-500">Higher priority wins if more than one program matches.</p></FormField>
            </div>
            <FormField label="Description (optional)" htmlFor="benefit-description"><Textarea id="benefit-description" value={description} onChange={(event) => { setDirty(true); setDescription(event.target.value); }} maxLength={500} rows={2} placeholder="e.g. ABC Corporation employee parking" /></FormField>
          </SectionCard>}

          {stage === 1 && <SectionCard icon={<MapPin className="h-4 w-4" />} title="Locations" description="Choose where this benefit applies and how many vehicles can use it at the same time.">
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
                    {selected && <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Free slots<Input aria-label={`${location.name} free slots`} className="w-24" type="number" min={1} max={100000} value={selectedLocations[location.id]} onChange={(event) => { setDirty(true); setSelectedLocations({ ...selectedLocations, [location.id]: Math.max(1, Number(event.target.value)) }); }} /></label>}
                  </div>
                );
              })}
            </div>
            <p className="text-xs leading-5 text-slate-500">The capacity is shared across all approved plates in this program. A second vehicle can still enter, but it uses the normal rate when all free slots are occupied.</p>
          </SectionCard>}

          {stage === 2 && <SectionCard icon={<Clock3 className="h-4 w-4" />} title="Schedule" description="Parking time inside these windows is free. Time outside the windows or selected days uses the normal rate plan.">
            <div className="space-y-3">
              {rules.windows.map((window, index) => (
                <div key={`${index}-${window.start}-${window.end}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-end gap-3">
                    <FormField label={index === 0 ? 'From' : `Window ${index + 1} from`} htmlFor={`window-from-${index}`}><Input id={`window-from-${index}`} type="time" value={window.start} onChange={(event) => setWindow(index, 'start', event.target.value)} required /></FormField>
                    <FormField label="Until" htmlFor={`window-until-${index}`}><Input id={`window-until-${index}`} type="time" value={window.end} onChange={(event) => setWindow(index, 'end', event.target.value)} required /></FormField>
                    {index > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => updateRules({ ...rules, windows: rules.windows.filter((_, i) => i !== index) })}><Trash2 className="h-3.5 w-3.5" />Remove</Button>}
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="secondary" onClick={() => updateRules({ ...rules, windows: [...rules.windows, { start: '08:00', end: '20:00' }] })}><Plus className="h-3.5 w-3.5" />Add time window</Button>
            </div>
            <div className="pt-1">
              <p className="mb-2 text-sm font-semibold text-slate-700">Days when the benefit is available</p>
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
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={rules.excludeHolidays} onChange={(event) => updateRules({ ...rules, excludeHolidays: event.target.checked })} className="h-4 w-4 accent-brand-700" />Exclude configured holidays</label>
                <FormField label="Holiday dates (optional)" htmlFor="benefit-holidays"><Textarea id="benefit-holidays" value={rules.holidays.join('\n')} onChange={(event) => updateRules({ ...rules, holidays: event.target.value.split(/[\n,]+/).map((value) => value.trim()).filter(Boolean) })} rows={2} placeholder="2026-12-25" /><p className="text-xs text-slate-500">Use one date per line in yyyy-MM-dd format.</p></FormField>
              </div>
            </details>
          </SectionCard>}

          {stage === 3 && <SectionCard icon={<ShieldCheck className="h-4 w-4" />} title="Eligibility" description="Choose vehicle types and maintain the approved plate list for this company.">
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Vehicle types <span className="font-normal text-slate-400">(optional)</span></p>
              <p className="mb-3 text-xs text-slate-500">Leave all unselected to allow every vehicle type.</p>
              <div className="flex flex-wrap gap-2">
                {VEHICLES.map((type) => {
                  const selected = rules.eligibleVehicleTypes.includes(type);
                  return <button key={type} type="button" aria-pressed={selected} onClick={() => updateRules({ ...rules, eligibleVehicleTypes: toggle(rules.eligibleVehicleTypes, type) })} className={`rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'}`}>{selected && <Check className="mr-1 inline h-3.5 w-3.5" />}{type}</button>;
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-slate-700">Approved plate numbers</p>
              <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
                {plateNumbers.length === 0 && <span className="text-sm text-slate-400">No plates added yet.</span>}
                {plateNumbers.map((plate, index) => <span key={`${normalizePlateForUi(plate)}-${index}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-mono text-sm text-slate-700 ring-1 ring-slate-200">{plate}<button type="button" onClick={() => { setDirty(true); setPlateNumbers((current) => current.filter((_, i) => i !== index)); }} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label={`Remove plate ${plate}`}><X className="h-3.5 w-3.5" /></button></span>)}
              </div>
              <div className="mt-3 flex gap-2"><Input aria-label="Add approved plate number" value={plateInput} onChange={(event) => setPlateInput(event.target.value)} onKeyDown={onPlateKeyDown} placeholder="Enter a plate number" /><Button type="button" variant="secondary" onClick={() => addPlates(plateInput)} disabled={!plateInput.trim()}><Plus className="h-4 w-4" />Add</Button></div>
              <p className="mt-2 text-xs text-slate-500">Press Enter or Add. Matching ignores spaces, dashes, and letter case.</p>
            </div>
          </SectionCard>}

          {stage === 4 && <SectionCard icon={<CalendarDays className="h-4 w-4" />} title="Revision (optional)" description="Choose when this benefit revision starts and ends. Leave both dates blank to apply it immediately.">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="New revision starts (optional)" htmlFor="benefit-effective-from"><Input id="benefit-effective-from" type="date" value={effectiveFrom} onChange={(event) => { setDirty(true); setEffectiveFrom(event.target.value); }} /><p className="text-xs text-slate-500">Leave blank to apply immediately.</p></FormField>
              <FormField label="New revision ends (optional)" htmlFor="benefit-effective-to"><Input id="benefit-effective-to" type="date" value={effectiveTo} onChange={(event) => { setDirty(true); setEffectiveTo(event.target.value); }} /></FormField>
            </div>
          </SectionCard>}

          <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_20px_-18px_rgba(15,39,66,0.45)] backdrop-blur">
            <p className="hidden text-xs text-slate-500 sm:block">Step {stage + 1} of 5 · You can review everything before saving.</p>
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
      <h3 className="mt-5 text-xl font-bold text-slate-950">{isNew ? 'Benefit program created' : 'Benefit revision saved'}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">The revision is now active for new parking sessions. Existing sessions keep the benefit rules that were active when they entered.</p>
      <div className="mt-8"><Button type="button" onClick={onDone}>Done</Button></div>
    </div>
  );
}

function ReviewStep({ isNew, payload, effectiveFromDate, effectiveToDate, locations, onBack, onConfirm, saving, error }: { isNew: boolean; payload: CorporateBenefitInput; effectiveFromDate: string; effectiveToDate: string; locations: Array<{ id: string; name: string }>; onBack: () => void; onConfirm: () => void; saving: boolean; error: Error | null }) {
  const locationNames = payload.locations.map((assignment) => `${locations.find((location) => location.id === assignment.parkingLocationId)?.name ?? 'Selected location'} (${assignment.maxConcurrentFreeSessions} free slot${assignment.maxConcurrentFreeSessions === 1 ? '' : 's'})`);
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-4"><p className="text-sm font-bold text-brand-950">Review before saving</p><p className="mt-1 text-sm leading-6 text-brand-900">Confirm these settings before {isNew ? 'creating the benefit program' : 'saving a new revision'}. Existing sessions keep their current benefit version.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ReviewItem label="Program" value={payload.name || '—'} />
        <ReviewItem label="Priority" value={String(payload.priority)} />
        <ReviewItem label="Locations" value={locationNames.join(', ') || '—'} />
        <ReviewItem label="Schedule" value={payload.rules.windows.map((window) => `${window.start}–${window.end}`).join(', ')} />
        <ReviewItem label="Days" value={payload.rules.daysOfWeek.map((day) => day.slice(0, 3)).join(', ') || '—'} />
        <ReviewItem label="Vehicle types" value={payload.rules.eligibleVehicleTypes.length > 0 ? payload.rules.eligibleVehicleTypes.join(', ') : 'All vehicle types'} />
        <ReviewItem label="Approved plates" value={payload.plateNumbers.join(', ') || '—'} />
        <ReviewItem label="Revision" value={formatRevision(effectiveFromDate, effectiveToDate)} />
      </div>
      {payload.rules.excludeHolidays && <ReviewItem label="Holiday handling" value={`Exclude ${payload.rules.holidays.length > 0 ? payload.rules.holidays.join(', ') : 'configured holidays'}`} />}
      {error && <ErrorState error={error} />}
      <div className="sticky bottom-0 z-10 -mx-6 -mb-6 flex justify-end gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 shadow-[0_-8px_20px_-18px_rgba(15,39,66,0.45)] backdrop-blur"><Button type="button" variant="secondary" onClick={onBack} disabled={saving}>Back to edit</Button><Button type="button" onClick={onConfirm} loading={saving}>{isNew ? 'Create benefit program' : 'Save new revision'}</Button></div>
    </div>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold leading-6 text-slate-900">{value}</p></div>;
}

function SectionCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div><h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-700">{icon}{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></div>{children}</section>;
}

function normalizePlateForUi(plate: string) {
  return plate.replace(/[\s-]/g, '').toUpperCase();
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
