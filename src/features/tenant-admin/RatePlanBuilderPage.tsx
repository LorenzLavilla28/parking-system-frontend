import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Clock } from 'lucide-react';
import { adminApi } from './api';
import { RatePlanSummary } from './RatePlanSummary';
import { DEFAULT_RATE_RULES_FORM, parseRateRulesJson, serializeRateRules, type PricingType, type PricingUnit, type RateRulesForm } from './pricingRules';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StickyFormActions } from '@/components/ui/StickyFormActions';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { cn } from '@/components/ui/cn';

const steps = [
  'Basic information',
  'Vehicle pricing',
  'Grace and limits',
  'Additional fees',
  'Availability',
  'Review',
];

const pricingModels: Array<{ value: PricingType; label: string; example: string }> = [
  { value: 'FirstBlock', label: 'First block, then increments', example: 'PHP 50 for 3 hours, then PHP 20 per succeeding hour.' },
  { value: 'Flat', label: 'Flat stay rate', example: 'One fixed amount for the entire stay.' },
  { value: 'PerUnit', label: 'Time-based rate', example: 'Charge every hour, minute, or configured fraction.' },
];

const units: PricingUnit[] = ['Hour', 'Minute', 'Fraction'];

export function RatePlanBuilderPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const isEditingVersion = Boolean(id);
  const isDuplicating = !isEditingVersion && Boolean(duplicateId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRulesState] = useState<RateRulesForm>(DEFAULT_RATE_RULES_FORM);
  const [lostTicketEnabled, setLostTicketEnabled] = useState(DEFAULT_RATE_RULES_FORM.lostTicketFee !== '');
  const [weekendEnabled, setWeekendEnabled] = useState(DEFAULT_RATE_RULES_FORM.weekendMultiplier !== '');
  const [holidayEnabled, setHolidayEnabled] = useState(DEFAULT_RATE_RULES_FORM.holidayMultiplier !== '');
  const selectedPlan = useQuery({
    queryKey: ['admin-rate-plan', id ?? duplicateId],
    queryFn: () => adminApi.getRatePlan((id ?? duplicateId)!),
    enabled: isEditingVersion || isDuplicating,
  });
  const versions = useQuery({
    queryKey: ['rate-plan-versions', id],
    queryFn: () => adminApi.listVersions(id!),
    enabled: isEditingVersion,
  });

  const currentPlan = isEditingVersion ? selectedPlan.data : undefined;
  const duplicateSource = isDuplicating ? selectedPlan.data : undefined;

  useEffect(() => {
    const source = currentPlan ?? duplicateSource;
    if (!source || (isEditingVersion && !versions.data)) return;
    setName(isDuplicating ? `${source.name} copy` : source.name);
    setDescription(source.description);
    const currentVersion = isEditingVersion
      ? versions.data?.find((version) => version.versionNumber === source.currentVersionNumber)
        ?? versions.data?.find((version) => version.effectiveTo === null)
        ?? versions.data?.[0]
      : undefined;
    const parsed = isEditingVersion
      ? parseRateRulesJson(currentVersion?.rulesJson ?? source.currentRulesJson ?? undefined)
      : parseRateRulesJson(source.currentRulesJson ?? undefined);
    setRulesState(parsed);
    setLostTicketEnabled(parsed.lostTicketFee !== '');
    setWeekendEnabled(parsed.weekendMultiplier !== '');
    setHolidayEnabled(parsed.holidayMultiplier !== '');
  }, [currentPlan, duplicateSource, isDuplicating, isEditingVersion, versions.data]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const setRules = (next: RateRulesForm) => {
    setDirty(true);
    setRulesState(next);
  };

  const create = useMutation<unknown, Error, void>({
    mutationFn: () =>
      isEditingVersion
        ? adminApi.addVersion(id!, serializeRateRules(rules))
        : adminApi.createRatePlan({ name, description, rulesJson: serializeRateRules(rules) }),
    onSuccess: async () => {
      setDirty(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-rate-plans'] });
      navigate('/admin/rate-plans');
    },
  });

  const canContinue = step !== 0 || (name.trim() && description.trim());
  const isBusy = (isEditingVersion || isDuplicating) && (selectedPlan.isLoading || versions.isLoading);

  if (isBusy) return <LoadingState label="Loading rate-plan builder..." />;
  if (selectedPlan.isError) return <ErrorState error={selectedPlan.error} />;
  if (versions.isError) return <ErrorState error={versions.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rate plans"
        title={isEditingVersion ? 'Edit rate plan' : isDuplicating ? 'Duplicate rate plan' : 'Create rate plan'}
        description={isEditingVersion
          ? 'Review the proposed pricing, then publish it as a new immutable revision.'
          : 'Configure pricing in focused steps, then review the customer-facing fee behavior before publishing.'}
        actions={
          <Button variant="secondary" onClick={() => navigate('/admin/rate-plans')}>
            <ArrowLeft className="h-4 w-4" />
            Back to rate plans
          </Button>
        }
      />

      {isEditingVersion && (
        <Alert tone="info">
          Publishing these changes updates pricing for new parking sessions only. Existing sessions continue using the pricing revision that was active when they entered.
          {currentPlan?.currentVersionNumber ? ` Current pricing: Revision ${currentPlan.currentVersionNumber}.` : ''}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <StepIndicator current={step} />
          <Card>
            {step === 0 && (
              <BasicInfoStep
                isEditingVersion={isEditingVersion}
                name={name}
                description={description}
                currency={rules.currency}
                onNameChange={(value) => {
                  setDirty(true);
                  setName(value);
                }}
                onDescriptionChange={(value) => {
                  setDirty(true);
                  setDescription(value);
                }}
                onCurrencyChange={(currency) => setRules({ ...rules, currency })}
              />
            )}
            {step === 1 && <BasePricingStep rules={rules} onChange={setRules} />}
            {step === 2 && (
              <GraceStep
                rules={rules}
                onChange={setRules}
              />
            )}
            {step === 3 && (
              <AdditionalFeesStep
                rules={rules}
                lostTicketEnabled={lostTicketEnabled}
                weekendEnabled={weekendEnabled}
                holidayEnabled={holidayEnabled}
                onLostTicketEnabled={(enabled) => {
                  setLostTicketEnabled(enabled);
                  setRules({ ...rules, lostTicketFee: enabled ? 500 : '' });
                }}
                onWeekendEnabled={(enabled) => {
                  setWeekendEnabled(enabled);
                  setRules({ ...rules, weekendMultiplier: enabled ? 1.5 : '' });
                }}
                onHolidayEnabled={(enabled) => {
                  setHolidayEnabled(enabled);
                  setRules({ ...rules, holidayMultiplier: enabled ? 2 : '' });
                }}
                onChange={setRules}
              />
            )}
            {step === 4 && <AvailabilityStep isEditingVersion={isEditingVersion} />}
            {step === 5 && <ReviewStep isEditingVersion={isEditingVersion} name={name} description={description} rules={rules} />}

            {create.isError && <div className="mt-4"><ErrorState error={create.error} /></div>}

            <StickyFormActions className="rounded-b-lg">
              <Button type="button" variant="secondary" onClick={() => confirmLeave(dirty) && navigate('/admin/rate-plans')}>
                Cancel
              </Button>
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => setStep((current) => current - 1)}>
                  Back
                </Button>
              )}
              {step < steps.length - 1 ? (
                <Button type="button" disabled={!canContinue} onClick={() => setStep((current) => current + 1)}>
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" loading={create.isPending} disabled={!name.trim() || !description.trim()} onClick={() => create.mutate()}>
                  <Check className="h-4 w-4" />
                  {isEditingVersion ? 'Publish changes' : 'Create rate plan'}
                </Button>
              )}
            </StickyFormActions>
          </Card>
        </div>
        <RatePlanSummary rules={rules} />
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {steps.map((label, index) => (
        <li
          key={label}
          className={cn(
            'rounded-lg px-3 py-2 text-xs font-bold ring-1',
            index === current
              ? 'bg-brand-700 text-white ring-brand-700'
              : index < current
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                : 'bg-white text-slate-500 ring-slate-200',
          )}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function BasicInfoStep({
  isEditingVersion,
  name,
  description,
  currency,
  onNameChange,
  onDescriptionChange,
  onCurrencyChange,
}: {
  isEditingVersion: boolean;
  name: string;
  description: string;
  currency: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Basic information" description="Create a reusable pricing plan. Assign it to locations later." />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Rate-plan name" htmlFor="rpname">
          <Input id="rpname" value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Standard weekday parking" disabled={isEditingVersion} required />
        </FormField>
        <FormField label="Description" htmlFor="rpdescription">
          <Input id="rpdescription" value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="PHP 50 for the first 3 hours, then PHP 20 per hour" disabled={isEditingVersion} required />
        </FormField>
        <FormField label="Currency" htmlFor="currency">
          <Select id="currency" value={currency} onChange={(event) => onCurrencyChange(event.target.value)}>
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
          </Select>
        </FormField>
        <FormField label="Status" htmlFor="status">
          <Input id="status" value="Active after create" disabled />
        </FormField>
      </div>
    </section>
  );
}

function BasePricingStep({ rules, onChange }: { rules: RateRulesForm; onChange: (rules: RateRulesForm) => void }) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Vehicle pricing" description="Configure independent rates for cars and motorcycles." />
      <RateBlockEditor
        idPrefix="car"
        title="Car rate"
        description="This is also the fallback rate for vans, trucks, and other vehicle types."
        currency={rules.currency}
        rate={rules.carRate}
        onChange={(carRate) => onChange({ ...rules, carRate })}
      />
      <RateBlockEditor
        idPrefix="motorcycle"
        title="Motorcycle rate"
        description="Applied when the guard records the vehicle as a motorcycle."
        currency={rules.currency}
        rate={rules.motorcycleRate}
        onChange={(motorcycleRate) => onChange({ ...rules, motorcycleRate })}
      />
    </section>
  );
}

function RateBlockEditor({ idPrefix, title, description, currency, rate, onChange }: {
  idPrefix: string;
  title: string;
  description: string;
  currency: string;
  rate: RateRulesForm['carRate'];
  onChange: (rate: RateRulesForm['carRate']) => void;
}) {
  const updateRate = <Key extends keyof typeof rate>(key: Key, value: (typeof rate)[Key]) =>
    onChange({ ...rate, [key]: value });

  return (
    <section className="space-y-4 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <div>
        <h3 className="font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {pricingModels.map((model) => (
          <button
            key={model.value}
            type="button"
            aria-pressed={rate.type === model.value}
            onClick={() => updateRate('type', model.value)}
            className={cn('rounded-lg bg-white p-4 text-left ring-1 transition', rate.type === model.value ? 'ring-2 ring-brand-600' : 'ring-slate-200 hover:bg-slate-50')}
          >
            <span className="block font-bold text-slate-950">{model.label}</span>
            <span className="mt-2 block text-sm leading-6 text-slate-600">{model.example}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {rate.type === 'Flat' && <MoneyField id={`${idPrefix}-flatAmount`} label="Flat amount" currency={currency} value={rate.flatAmount} onChange={(value) => updateRate('flatAmount', value)} />}
        {rate.type === 'FirstBlock' && (
          <>
            <NumberField id={`${idPrefix}-firstHours`} label="First block hours" value={rate.firstHours} onChange={(value) => updateRate('firstHours', value)} min={1} />
            <MoneyField id={`${idPrefix}-firstAmount`} label="First block amount" currency={currency} value={rate.firstAmount} onChange={(value) => updateRate('firstAmount', value)} />
            <MoneyField id={`${idPrefix}-incrementAmount`} label="Increment amount" currency={currency} value={rate.incrementAmount} onChange={(value) => updateRate('incrementAmount', value)} />
            <UnitField id={`${idPrefix}-incrementUnit`} label="Increment unit" value={rate.incrementUnit} onChange={(value) => updateRate('incrementUnit', value)} />
          </>
        )}
        {rate.type === 'PerUnit' && (
          <>
            <MoneyField id={`${idPrefix}-perUnitAmount`} label="Amount per unit" currency={currency} value={rate.perUnitAmount} onChange={(value) => updateRate('perUnitAmount', value)} />
            <UnitField id={`${idPrefix}-perUnit`} label="Billing unit" value={rate.perUnit} onChange={(value) => updateRate('perUnit', value)} />
            <NumberField id={`${idPrefix}-fractionMinutes`} label="Fraction size in minutes" value={rate.fractionMinutes} onChange={(value) => updateRate('fractionMinutes', value)} min={1} />
          </>
        )}
      </div>
    </section>
  );
}

function GraceStep({
  rules,
  onChange,
}: {
  rules: RateRulesForm;
  onChange: (rules: RateRulesForm) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Grace periods" description="Define the free-entry period and the time customers have to exit after payment." />
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id="entryGraceMinutes"
          label="Free exit period after entry"
          description="Vehicles that exit within this period are not charged."
          value={rules.entryGraceMinutes}
          onChange={(value) => onChange({ ...rules, entryGraceMinutes: value })}
          min={0}
          suffix="minutes"
        />
        <NumberField
          id="paidExitGraceMinutes"
          label="Exit grace after payment"
          description="Customers must complete exit within this period after payment."
          value={rules.paidExitGraceMinutes}
          onChange={(value) => onChange({ ...rules, paidExitGraceMinutes: value })}
          min={0}
          max={720}
          suffix="minutes"
        />
      </div>
    </section>
  );
}

function AdditionalFeesStep({
  rules,
  lostTicketEnabled,
  weekendEnabled,
  holidayEnabled,
  onLostTicketEnabled,
  onWeekendEnabled,
  onHolidayEnabled,
  onChange,
}: {
  rules: RateRulesForm;
  lostTicketEnabled: boolean;
  weekendEnabled: boolean;
  holidayEnabled: boolean;
  onLostTicketEnabled: (enabled: boolean) => void;
  onWeekendEnabled: (enabled: boolean) => void;
  onHolidayEnabled: (enabled: boolean) => void;
  onChange: (rules: RateRulesForm) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle title="Additional fees" description="Reveal only the fees and modifiers this location actually uses." />
      <ToggleSection checked={lostTicketEnabled} title="Lost-ticket fee" description="Charge a fixed fee when the customer cannot provide a ticket or QR." onChange={onLostTicketEnabled}>
        <MoneyField id="lostTicketFee" label="Lost-ticket amount" currency={rules.currency} value={rules.lostTicketFee === '' ? 0 : rules.lostTicketFee} onChange={(value) => onChange({ ...rules, lostTicketFee: value })} />
      </ToggleSection>
      <ToggleSection checked={rules.enableOvernight} title="Overnight fee" description="Add a fixed fee when the stay overlaps the overnight window." onChange={(enabled) => onChange({ ...rules, enableOvernight: enabled })}>
        <div className="grid gap-4 sm:grid-cols-3">
          <MoneyField id="overnightFee" label="Overnight fee" currency={rules.currency} value={rules.overnightFee} onChange={(value) => onChange({ ...rules, overnightFee: value })} />
          <NumberField id="overnightStartHour" label="Start hour" value={rules.overnightStartHour} onChange={(value) => onChange({ ...rules, overnightStartHour: value })} min={0} max={23} />
          <NumberField id="overnightEndHour" label="End hour" value={rules.overnightEndHour} onChange={(value) => onChange({ ...rules, overnightEndHour: value })} min={0} max={23} />
        </div>
        <p className="mt-3 text-sm text-slate-500">Application rule: added to the base time charge when the stay overlaps the configured window.</p>
      </ToggleSection>
      <div className="grid gap-4 sm:grid-cols-2">
        <ToggleSection checked={weekendEnabled} title="Weekend multiplier" description="Multiply the base fee during weekend periods." onChange={onWeekendEnabled}>
          <NumberField id="weekendMultiplier" label="Multiplier" value={rules.weekendMultiplier === '' ? 1 : rules.weekendMultiplier} onChange={(value) => onChange({ ...rules, weekendMultiplier: value })} min={1} />
        </ToggleSection>
        <ToggleSection checked={holidayEnabled} title="Holiday multiplier" description="Multiply the base fee on configured holidays." onChange={onHolidayEnabled}>
          <NumberField id="holidayMultiplier" label="Multiplier" value={rules.holidayMultiplier === '' ? 1 : rules.holidayMultiplier} onChange={(value) => onChange({ ...rules, holidayMultiplier: value })} min={1} />
        </ToggleSection>
      </div>
    </section>
  );
}

function AvailabilityStep({ isEditingVersion }: { isEditingVersion: boolean }) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title="Availability"
        description={isEditingVersion
          ? 'Confirm how the reviewed pricing revision will be introduced.'
          : 'Confirm when the first pricing revision will become available.'}
      />
      <Alert tone="info">
        Publishing creates an immutable pricing revision effective immediately for new parking sessions. Existing sessions keep their pinned revision and pricing.
      </Alert>
      <div className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Clock className="h-4 w-4 text-slate-400" />
          Effective immediately for new sessions
        </div>
      </div>
    </section>
  );
}

function ReviewStep({ isEditingVersion, name, description, rules }: { isEditingVersion: boolean; name: string; description: string; rules: RateRulesForm }) {
  return (
    <section className="space-y-4">
      <SectionTitle
        title={isEditingVersion ? 'Review and publish' : 'Review and create'}
        description={isEditingVersion
          ? 'Confirm the changes before publishing a new pricing revision.'
          : 'Confirm the important operator-facing details before publishing the first revision.'}
      />
      <dl className="grid gap-3 sm:grid-cols-2">
        <ReviewItem label="Rate plan" value={name || 'Not named'} />
        <ReviewItem label="Description" value={description || 'Not described'} />
        <ReviewItem label="Currency" value={rules.currency} />
        <ReviewItem label="Car pricing" value={rules.carRate.type} />
        <ReviewItem label="Motorcycle pricing" value={rules.motorcycleRate.type} />
      </dl>
    </section>
  );
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function ToggleSection({ checked, title, description, onChange, children }: { checked: boolean; title: string; description: string; onChange: (checked: boolean) => void; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500" />
        <span>
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className="block text-sm leading-6 text-slate-600">{description}</span>
        </span>
      </label>
      {checked && <div className="mt-4">{children}</div>}
    </section>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function MoneyField({ id, label, currency, value, onChange }: { id: string; label: string; currency: string; value: number; onChange: (value: number) => void }) {
  return <NumberField id={id} label={label} prefix={currency} value={value} onChange={onChange} min={0} />;
}

function NumberField({ id, label, value, onChange, prefix, suffix, min, max, description }: { id: string; label: string; value: number; onChange: (value: number) => void; prefix?: string; suffix?: string; min?: number; max?: number; description?: string }) {
  return (
    <FormField label={label} htmlFor={id}>
      {description && <p className="mb-1 text-sm text-slate-500">{description}</p>}
      <div className="flex rounded-lg ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
        {prefix && <span className="flex items-center border-r border-slate-200 px-3 text-sm text-slate-500">{prefix}</span>}
        <Input id={id} type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="rounded-none ring-0 focus-visible:ring-0" required />
        {suffix && <span className="flex items-center border-l border-slate-200 px-3 text-sm text-slate-500">{suffix}</span>}
      </div>
    </FormField>
  );
}

function UnitField({ id, label, value, onChange }: { id: string; label: string; value: PricingUnit; onChange: (value: PricingUnit) => void }) {
  return (
    <FormField label={label} htmlFor={id}>
      <Select id={id} value={value} onChange={(event) => onChange(event.target.value as PricingUnit)}>
        {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
      </Select>
    </FormField>
  );
}

function confirmLeave(dirty: boolean) {
  return !dirty || window.confirm('Discard unsaved rate-plan changes?');
}
