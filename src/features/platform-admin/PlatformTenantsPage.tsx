import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  History,
  KeyRound,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { platformApi, type CreateTenantInput, type Tenant, type TenantAuditLog, SUBSCRIPTION_PLANS, TENANT_STATUSES } from './api';
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
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Textarea';
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/states';
import { cn } from '@/components/ui/cn';

const statusTone = (status: string) => (status === 'Active' ? 'green' : status === 'Suspended' ? 'amber' : 'neutral');

const currencyOptions = ['PHP', 'USD', 'SGD'];
const timezoneOptions = ['Asia/Manila', 'Asia/Singapore', 'UTC'];
const steps = [
  { title: 'Company', description: 'Tenant profile' },
  { title: 'Administrator', description: 'First admin' },
  { title: 'Operations', description: 'Starter setup' },
  { title: 'Review', description: 'Confirm details' },
] as const;

const stepFields: Record<number, FieldName[]> = {
  0: ['name', 'slug', 'defaultCurrency', 'defaultTimezone'],
  1: ['adminFirstName', 'adminLastName', 'adminEmail', 'adminPassword'],
  2: [],
  3: [],
};

type FieldName =
  | 'name'
  | 'slug'
  | 'defaultCurrency'
  | 'defaultTimezone'
  | 'adminFirstName'
  | 'adminLastName'
  | 'adminEmail'
  | 'adminPassword';

type FormErrors = Partial<Record<FieldName, string>>;

export function LegacyPlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [capacityTenant, setCapacityTenant] = useState<Tenant | null>(null);

  const tenants = useQuery({ queryKey: ['platform-tenants'], queryFn: () => platformApi.listTenants() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApi.changeStatus(id, status),
    onSuccess: invalidate,
  });
  const changePlan = useMutation({
    mutationFn: ({ id, subscriptionPlan }: { id: string; subscriptionPlan: string }) => platformApi.changePlan(id, subscriptionPlan),
    onSuccess: invalidate,
  });
  const activeCount = tenants.data?.items.filter((tenant) => tenant.status === 'Active').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Tenants"
        description="Create tenant accounts, manage subscription plans, and set additional capacity without creating locations."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New tenant
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard icon={Building2} label="Total tenants" value={tenants.data?.items.length ?? '...'} detail="Provisioned operators" tone="blue" />
        <MetricCard icon={ShieldCheck} label="Active tenants" value={activeCount} detail="Currently enabled" tone="green" />
      </div>

      {tenants.isLoading && <LoadingState />}
      {tenants.isError && <ErrorState error={tenants.error} />}
      {tenants.data && tenants.data.items.length === 0 && <EmptyState>No tenants yet.</EmptyState>}

      {(changePlan.isError || changePlan.isSuccess) && (
        <Alert tone={changePlan.isError ? 'error' : 'success'}>
          {changePlan.isError ? 'Plan change could not be saved. Check the tenant capacity and location limits, then try again.' : 'Plan updated successfully.'}
        </Alert>
      )}

      {tenants.data && tenants.data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Change status</Th>
              <Th>Add-on capacity</Th>
            </tr>
          </THead>
          <TBody>
            {tenants.data.items.map((tenant) => (
              <tr key={tenant.id}>
                <Td className="font-medium text-slate-900">{tenant.name}</Td>
                <Td className="font-mono text-xs">{tenant.slug}</Td>
                <Td>
                  <Select
                    className="h-9 max-w-[10rem]"
                    aria-label={`Plan for ${tenant.name}`}
                    value={tenant.subscriptionPlan}
                    disabled={changePlan.isPending}
                    onChange={(event) => changePlan.mutate({ id: tenant.id, subscriptionPlan: event.target.value })}
                  >
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <option key={plan} value={plan}>{plan}</option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-slate-500">
                    {tenant.monthlyPrice ? `₱${tenant.monthlyPrice.toLocaleString()}/month` : 'Custom pricing'}
                  </p>
                </Td>
                <Td>
                  <Badge tone={statusTone(tenant.status)}>{tenant.status}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <Select
                      className="h-9 max-w-[10rem]"
                      value={tenant.status}
                      onChange={(event) => changeStatus.mutate({ id: tenant.id, status: event.target.value })}
                    >
                      {TENANT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </Select>
                  </div>
                </Td>
                <Td>
                  <Button type="button" variant="secondary" onClick={() => setCapacityTenant(tenant)}>
                    <Plus className="h-4 w-4" />
                    Manage
                  </Button>
                  <p className="mt-1 text-xs text-slate-500">
                    {tenant.additionalSlotCapacity > 0 ? `+${tenant.additionalSlotCapacity} slots` : 'None'}
                  </p>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      {creating && (
        <TenantOnboardingWizard
          onClose={() => setCreating(false)}
          onCreated={() => {
            invalidate();
          }}
        />
      )}
      {capacityTenant && <CapacityAddonModal tenant={capacityTenant} onClose={() => setCapacityTenant(null)} onSaved={invalidate} />}
    </div>
  );
}

function CapacityAddonModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [additionalCapacity, setAdditionalCapacity] = useState(tenant.additionalSlotCapacity);
  const save = useMutation({
    mutationFn: () => platformApi.updateCapacityAddon(tenant.id, additionalCapacity),
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });
  const baseCapacity = tenant.maximumSlotsPerLocation;
  const effectiveCapacity = tenant.effectiveMaximumSlotsPerLocation == null || baseCapacity == null
    ? null
    : baseCapacity + additionalCapacity;

  return (
    <Modal open onClose={onClose} title={`Manage capacity for ${tenant.name}`} size="md">
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
        <Alert tone="info">
          Add-on capacity increases the slot allowance for each location. It does not create a new location; create locations separately from the tenant administration workspace.
        </Alert>
        <div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current plan</p>
            <p className="mt-1 font-semibold text-slate-900">{tenant.subscriptionPlan}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Base capacity</p>
            <p className="mt-1 font-semibold text-slate-900">{baseCapacity == null ? 'Custom' : `${baseCapacity} slots per location`}</p>
          </div>
        </div>
        <FormField label="Additional capacity (slots per location)" htmlFor="addon-capacity">
          <Input
            id="addon-capacity"
            type="number"
            min={0}
            value={additionalCapacity}
            onChange={(event) => setAdditionalCapacity(Math.max(0, Number(event.target.value)))}
            required
          />
          <p className="text-sm text-slate-500">Set to 0 to remove the add-on.</p>
        </FormField>
        <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <span className="font-semibold">Effective capacity: </span>
          {effectiveCapacity == null ? 'Managed by custom plan' : `${effectiveCapacity} slots per location`}
        </div>
        {save.isError && <ErrorState error={save.error} />}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={save.isPending}>Save capacity</Button>
        </div>
      </form>
    </Modal>
  );
}

const emptyTenant: CreateTenantInput = {
  name: '',
  slug: '',
  subscriptionPlan: 'Growth',
  defaultCurrency: 'PHP',
  defaultTimezone: 'Asia/Manila',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
};

function TenantOnboardingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (tenant: Tenant) => void }) {
  const [form, setForm] = useState<CreateTenantInput>({ ...emptyTenant });
  const [step, setStep] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});
  const [tenantSlugEdited, setTenantSlugEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);
  const [createdAdminEmail, setCreatedAdminEmail] = useState('');

  const errors = useMemo(() => validateTenantOnboarding(form), [form]);
  const allValid = Object.keys(errors).length === 0;
  const currentStepValid = stepFields[step].every((field) => !errors[field]);

  const save = useMutation({
    mutationFn: () => platformApi.createTenant(toCreateTenantPayload(form)),
    onSuccess: (tenant) => {
      setCreatedTenant(tenant);
      setCreatedAdminEmail(form.adminEmail.trim().toLowerCase());
      onCreated(tenant);
    },
  });

  const set = (patch: Partial<CreateTenantInput>) => setForm((current) => ({ ...current, ...patch }));
  const errorFor = (field: FieldName) => (attemptedSteps[step] || attemptedSteps[3] ? errors[field] : undefined);

  function goNext() {
    if (!currentStepValid) {
      setAttemptedSteps((current) => ({ ...current, [step]: true }));
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function submit() {
    if (!allValid) {
      setAttemptedSteps({ 0: true, 1: true, 2: true, 3: true });
      const firstInvalidStep = steps.findIndex((_, index) => stepFields[index].some((field) => errors[field]));
      if (firstInvalidStep >= 0) setStep(firstInvalidStep);
      return;
    }
    save.mutate();
  }

  if (createdTenant) {
    return (
      <Modal open onClose={onClose} title="Tenant created" size="xl">
        <OnboardingSuccess tenant={createdTenant} adminEmail={createdAdminEmail} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} title="Tenant onboarding" size="xl">
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <StepIndicator currentStep={step} />

        <form
          className="min-w-0 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {step === 0 && (
            <CompanyStep
              form={form}
              errorFor={errorFor}
              onNameChange={(name) => {
                set({
                  name,
                  slug: tenantSlugEdited ? form.slug : slugify(name),
                });
              }}
              onSlugChange={(slug) => {
                setTenantSlugEdited(true);
                set({ slug: slugify(slug) });
              }}
              onPlanChange={(subscriptionPlan) => set({ subscriptionPlan })}
              onCurrencyChange={(defaultCurrency) => set({ defaultCurrency: defaultCurrency.toUpperCase() })}
              onTimezoneChange={(defaultTimezone) => {
                set({ defaultTimezone });
              }}
            />
          )}

          {step === 1 && (
            <AdminStep
              form={form}
              errorFor={errorFor}
              showPassword={showPassword}
              onFirstNameChange={(adminFirstName) => set({ adminFirstName })}
              onLastNameChange={(adminLastName) => set({ adminLastName })}
              onEmailChange={(adminEmail) => set({ adminEmail })}
              onPasswordChange={(adminPassword) => set({ adminPassword })}
              onGeneratePassword={() => set({ adminPassword: generateTemporaryPassword() })}
              onTogglePassword={() => setShowPassword((current) => !current)}
            />
          )}

          {step === 2 && <OperationsStep />}
          {step === 3 && <ReviewStep form={form} />}

          {save.isError && <ErrorState error={save.error} />}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <Button type="button" variant="secondary" onClick={step === 0 ? onClose : () => setStep((current) => current - 1)}>
              {step === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </>
              )}
            </Button>

            {step < steps.length - 1 ? (
              <Button type="button" onClick={goNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" loading={save.isPending} disabled={!allValid}>
                <CheckCircle2 className="h-4 w-4" />
                Create tenant
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:block lg:space-y-2" aria-label="Tenant onboarding steps">
      {steps.map((item, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        return (
          <li
            key={item.title}
            className={cn(
              'rounded-lg p-3 ring-1',
              active
                ? 'bg-brand-700 text-white ring-brand-700'
                : complete
                  ? 'bg-emerald-50 text-emerald-900 ring-emerald-200'
                  : 'bg-slate-50 text-slate-600 ring-slate-200',
            )}
            aria-current={active ? 'step' : undefined}
          >
            <p className="text-sm font-bold">{index + 1}. {item.title}</p>
            <p className={cn('mt-1 text-xs', active ? 'text-brand-50' : 'text-slate-500')}>{item.description}</p>
          </li>
        );
      })}
    </ol>
  );
}

function CompanyStep({
  form,
  errorFor,
  onNameChange,
  onSlugChange,
  onPlanChange,
  onCurrencyChange,
  onTimezoneChange,
}: {
  form: CreateTenantInput;
  errorFor: (field: FieldName) => string | undefined;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onPlanChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={Building2}
        title="Company setup"
        description="Create the operator profile used across platform billing, access, and public links."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Tenant name" htmlFor="tenant-name" error={errorFor('name')}>
          <Input id="tenant-name" value={form.name} onChange={(event) => onNameChange(event.target.value)} autoFocus />
        </FormField>
        <FormField label="Slug" htmlFor="tenant-slug" error={errorFor('slug')}>
          <Input id="tenant-slug" value={form.slug} onChange={(event) => onSlugChange(event.target.value)} placeholder="demo-parking" />
        </FormField>
        <FormField label="Subscription plan" htmlFor="tenant-plan">
          <Select id="tenant-plan" value={form.subscriptionPlan} onChange={(event) => onPlanChange(event.target.value)}>
            {SUBSCRIPTION_PLANS.map((plan) => (
              <option key={plan} value={plan}>
                {plan}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Default currency" htmlFor="tenant-currency" error={errorFor('defaultCurrency')}>
          <Select id="tenant-currency" value={form.defaultCurrency} onChange={(event) => onCurrencyChange(event.target.value)}>
            {currencyOptions.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Default timezone" htmlFor="tenant-timezone" error={errorFor('defaultTimezone')}>
          <Select id="tenant-timezone" value={form.defaultTimezone} onChange={(event) => onTimezoneChange(event.target.value)}>
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
    </section>
  );
}

function AdminStep({
  form,
  errorFor,
  showPassword,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onPasswordChange,
  onGeneratePassword,
  onTogglePassword,
}: {
  form: CreateTenantInput;
  errorFor: (field: FieldName) => string | undefined;
  showPassword: boolean;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onGeneratePassword: () => void;
  onTogglePassword: () => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={Users}
        title="First administrator"
        description="Create the tenant admin who will finish setup inside the Administration workspace."
      />
      <Alert tone="info">Use a temporary password and share it through your approved secure handoff process.</Alert>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="First name" htmlFor="admin-first-name" error={errorFor('adminFirstName')}>
          <Input id="admin-first-name" value={form.adminFirstName} onChange={(event) => onFirstNameChange(event.target.value)} />
        </FormField>
        <FormField label="Last name" htmlFor="admin-last-name" error={errorFor('adminLastName')}>
          <Input id="admin-last-name" value={form.adminLastName} onChange={(event) => onLastNameChange(event.target.value)} />
        </FormField>
      </div>
      <FormField label="Admin email" htmlFor="admin-email" error={errorFor('adminEmail')}>
        <Input id="admin-email" type="email" value={form.adminEmail} onChange={(event) => onEmailChange(event.target.value)} />
      </FormField>
      <FormField label="Temporary password" htmlFor="admin-password" error={errorFor('adminPassword')}>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Input
            id="admin-password"
            type={showPassword ? 'text' : 'password'}
            value={form.adminPassword}
            onChange={(event) => onPasswordChange(event.target.value)}
            autoComplete="new-password"
          />
          <Button type="button" variant="secondary" onClick={onTogglePassword}>
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPassword ? 'Hide' : 'Show'}
          </Button>
          <Button type="button" variant="secondary" onClick={onGeneratePassword}>
            <KeyRound className="h-4 w-4" />
            Generate
          </Button>
        </div>
      </FormField>
    </section>
  );
}

function OperationsStep() {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={ClipboardList}
        title="Starter operating setup"
        description="The tenant and first administrator will be created now. Location setup continues inside the tenant workspace."
      />
      <div className="grid gap-3">
        <NextSetupItem
          title="Create the first parking location"
          description="After the tenant admin signs in, create a location from Administration > Locations. The selected tier controls its capacity and location allowance."
          badge="Next action"
        />
        <NextSetupItem
          title="Create rate plan"
          description="Create the first rate plan from Administration > Rate plans, then assign it to the new location before live entries begin."
          badge="Next action"
        />
        <NextSetupItem
          title="Add guards and supervisors"
          description="Use Administration > Users to invite gate staff and assign them to a location."
          badge="Next action"
        />
        <NextSetupItem
          title="Validate gate workflow"
          description="Record a test vehicle entry and confirm the QR payment and exit validation flow."
          badge="Recommended"
        />
      </div>
    </section>
  );
}

function ReviewStep({ form }: { form: CreateTenantInput }) {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={CheckCircle2}
        title="Review and create"
        description="Confirm the required onboarding details before provisioning the tenant."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <ReviewPanel title="Company">
          <ReviewItem label="Tenant" value={form.name} />
          <ReviewItem label="Slug" value={form.slug} monospace />
          <ReviewItem label="Plan" value={form.subscriptionPlan} />
          <ReviewItem label="Defaults" value={`${form.defaultCurrency} / ${form.defaultTimezone}`} />
        </ReviewPanel>
        <ReviewPanel title="Administrator">
          <ReviewItem label="Name" value={`${form.adminFirstName} ${form.adminLastName}`.trim()} />
          <ReviewItem label="Email" value={form.adminEmail.trim().toLowerCase()} />
          <ReviewItem label="Credential" value="Temporary password set" />
        </ReviewPanel>
        <ReviewPanel title="Operational setup">
          <ReviewItem label="Location" value="Not created during onboarding" />
          <ReviewItem label="Next step" value="Create a location in the tenant workspace" />
          <ReviewItem label="Entry readiness" value="Requires an assigned active rate plan" />
        </ReviewPanel>
      </div>
    </section>
  );
}

function OnboardingSuccess({ tenant, adminEmail, onClose }: { tenant: Tenant; adminEmail: string; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-emerald-50 p-5 text-emerald-900 ring-1 ring-emerald-200">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h3 className="text-lg font-bold">Tenant onboarding started</h3>
            <p className="mt-1 text-sm leading-6">
              {tenant.name} was created with its paid membership tier and first administrator. No location was created yet.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReviewPanel title="Tenant">
          <ReviewItem label="Name" value={tenant.name} />
          <ReviewItem label="Slug" value={tenant.slug} monospace />
          <ReviewItem label="Plan" value={tenant.subscriptionPlan} />
        </ReviewPanel>
        <ReviewPanel title="First admin">
          <ReviewItem label="Email" value={adminEmail} />
          <ReviewItem label="Workspace" value="Administration" />
        </ReviewPanel>
        <ReviewPanel title="Next setup">
          <ReviewItem label="Location" value="Create in tenant workspace" />
          <ReviewItem label="Rate plan" value="Assign before accepting entries" />
          <ReviewItem label="Capacity" value="Controlled by the selected tier" />
        </ReviewPanel>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-950">Recommended next actions</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <NextSetupItem title="Open tenant workspace" description={`Sign in as ${adminEmail} to continue setup in Administration.`} badge="Next" />
          <NextSetupItem title="Create rate plan" description="Configure pricing before live vehicle entries begin." badge="Next" />
          <NextSetupItem title="Add users" description="Invite supervisors and guards, then assign working locations." badge="Next" />
          <NextSetupItem title="View platform tenants" description="Return to the platform tenant list and monitor the new account." badge="Now" />
        </div>
      </div>

      <div className="flex justify-end border-t border-slate-100 pt-4">
        <Button type="button" onClick={onClose}>
          View platform tenants
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}

function NextSetupItem({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      <Badge tone="blue">{badge}</Badge>
    </div>
  );
}

function ReviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200">
      <h4 className="text-sm font-bold text-slate-950">{title}</h4>
      <dl className="mt-3 space-y-3">{children}</dl>
    </section>
  );
}

function ReviewItem({ label, value, monospace = false }: { label: string; value: string; monospace?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn('mt-1 break-words text-sm font-semibold text-slate-900', monospace && 'font-mono text-xs')}>
        {value || 'Not set'}
      </dd>
    </div>
  );
}

function validateTenantOnboarding(form: CreateTenantInput): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Enter the tenant name.';
  if (!form.slug.trim()) errors.slug = 'Enter a tenant slug.';
  else if (!isValidSlug(form.slug)) errors.slug = 'Use lowercase letters, numbers, and hyphens.';
  if (!form.defaultCurrency.trim()) errors.defaultCurrency = 'Choose a currency.';
  else if (form.defaultCurrency.trim().length !== 3) errors.defaultCurrency = 'Use a 3-letter currency code.';
  if (!form.defaultTimezone.trim()) errors.defaultTimezone = 'Choose a default timezone.';

  if (!form.adminFirstName.trim()) errors.adminFirstName = 'Enter the administrator first name.';
  if (!form.adminLastName.trim()) errors.adminLastName = 'Enter the administrator last name.';
  if (!form.adminEmail.trim()) errors.adminEmail = 'Enter the administrator email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail.trim())) errors.adminEmail = 'Enter a valid email address.';
  if (!form.adminPassword) errors.adminPassword = 'Enter a temporary password.';
  else if (form.adminPassword.length < 10) errors.adminPassword = 'Use at least 10 characters.';

  return errors;
}

function toCreateTenantPayload(form: CreateTenantInput): CreateTenantInput {
  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    subscriptionPlan: form.subscriptionPlan,
    defaultCurrency: form.defaultCurrency.trim().toUpperCase(),
    defaultTimezone: form.defaultTimezone,
    adminFirstName: form.adminFirstName.trim(),
    adminLastName: form.adminLastName.trim(),
    adminEmail: form.adminEmail.trim().toLowerCase(),
    adminPassword: form.adminPassword,
  };
}

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function generateTemporaryPassword() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => characters[value % characters.length]).join('');
}

export function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [capacityTenant, setCapacityTenant] = useState<Tenant | null>(null);
  const [detailsTenant, setDetailsTenant] = useState<Tenant | null>(null);
  const [planTenant, setPlanTenant] = useState<Tenant | null>(null);
  const [statusTenant, setStatusTenant] = useState<Tenant | null>(null);
  const [auditTenant, setAuditTenant] = useState<Tenant | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('All plans');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<{ title: string; message: string; tone: 'success' | 'error' } | null>(null);
  const pageSize = 10;

  const tenants = useQuery({
    queryKey: ['platform-tenants', search],
    queryFn: () => platformApi.listTenants({ pageSize: 100, search: search.trim() || undefined }),
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
  const allTenants = tenants.data?.items ?? [];
  const filteredTenants = allTenants.filter((tenant) =>
    (planFilter === 'All plans' || tenant.subscriptionPlan === planFilter)
    && (statusFilter === 'All statuses' || tenant.status === statusFilter));
  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const visibleTenants = filteredTenants.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = allTenants.filter((tenant) => tenant.status === 'Active').length;
  const notify = (title: string, message: string, tone: 'success' | 'error' = 'success') => setToast({ title, message, tone });

  useEffect(() => setPage(1), [search, planFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform" title="Tenants" description="Review tenant accounts and use deliberate actions for plan, access, and capacity changes." actions={<Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New tenant</Button>} />
      <div className="grid gap-4 sm:grid-cols-2"><MetricCard icon={Building2} label="Total tenants" value={tenants.data?.totalCount ?? '...'} detail="Provisioned operators" tone="blue" /><MetricCard icon={ShieldCheck} label="Active tenants" value={activeCount} detail="Currently enabled" tone="green" /></div>
      {toast && <div className="flex items-start justify-between gap-4 rounded-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200" role="status"><div><p className={cn('font-semibold', toast.tone === 'success' ? 'text-emerald-800' : 'text-red-800')}>{toast.title}</p><p className="mt-1 text-sm text-slate-600">{toast.message}</p></div><button type="button" className="text-sm font-semibold text-slate-400 hover:text-slate-700" onClick={() => setToast(null)} aria-label="Dismiss notification">Dismiss</button></div>}
      {tenants.isLoading && <LoadingState />}
      {tenants.isError && <ErrorState error={tenants.error} />}
      {tenants.data && tenants.data.items.length === 0 && <EmptyState>No tenants yet.</EmptyState>}
      {tenants.data && tenants.data.items.length > 0 && <>
        <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input aria-label="Search tenants" className="pl-9" placeholder="Search tenants" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select aria-label="Filter by plan" className="sm:w-44" value={planFilter} onChange={(event) => setPlanFilter(event.target.value)}><option>All plans</option>{SUBSCRIPTION_PLANS.map((plan) => <option key={plan}>{plan}</option>)}</Select><Select aria-label="Filter by status" className="sm:w-44" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{TENANT_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select></div>
        {visibleTenants.length === 0 ? <EmptyState>No tenants match these filters.</EmptyState> : <Table><THead><tr><Th>Tenant</Th><Th>Plan</Th><Th>Status</Th><Th>Capacity</Th><Th className="text-right">Actions</Th></tr></THead><TBody>{visibleTenants.map((tenant) => <tr key={tenant.id}><Td><button type="button" className="text-left font-semibold text-brand-800 hover:text-brand-600 hover:underline" onClick={() => setDetailsTenant(tenant)}>{tenant.name}</button><p className="mt-1 text-xs text-slate-500">{tenant.activeLocationCount ?? 0} active {(tenant.activeLocationCount ?? 0) === 1 ? 'location' : 'locations'}</p></Td><Td><p className="font-semibold text-slate-900">{tenant.subscriptionPlan}</p><p className="mt-1 text-xs text-slate-500">{formatPrice(tenant.monthlyPrice)}</p></Td><Td><Badge tone={tenant.status === 'Suspended' ? 'red' : statusTone(tenant.status)}>{tenant.status}</Badge></Td><Td><p className="font-semibold text-slate-900">{tenant.additionalSlotCapacity > 0 ? `+${tenant.additionalSlotCapacity} slots/location` : 'Included capacity'}</p><p className="mt-1 text-xs text-slate-500">{tenant.effectiveMaximumSlotsPerLocation == null ? 'Custom plan' : `${tenant.effectiveMaximumSlotsPerLocation} slots/location total`}</p></Td><Td><div className="flex justify-end gap-2"><Button type="button" variant="secondary" size="sm" onClick={() => setDetailsTenant(tenant)}>Manage</Button><TenantActionsMenu tenant={tenant} onPlan={() => setPlanTenant(tenant)} onStatus={() => setStatusTenant(tenant)} onCapacity={() => setCapacityTenant(tenant)} onAudit={() => setAuditTenant(tenant)} /></div></Td></tr>)}</TBody></Table>}
        <div className="flex items-center justify-between text-sm text-slate-500"><span>Showing {visibleTenants.length} of {filteredTenants.length} tenants</span><div className="flex gap-2"><Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button><span className="flex items-center px-2">Page {page} of {totalPages}</span><Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button></div></div>
      </>}
      {creating && <TenantOnboardingWizard onClose={() => setCreating(false)} onCreated={invalidate} />}
      {capacityTenant && <CapacityAddonReviewModal tenant={capacityTenant} onClose={() => setCapacityTenant(null)} onSaved={() => { invalidate(); notify('Capacity updated', `${capacityTenant.name}'s additional capacity was updated.`); }} />}
      {planTenant && <PlanReviewModal tenant={planTenant} onClose={() => setPlanTenant(null)} onSaved={(from, to) => { invalidate(); setPlanTenant(null); notify('Plan updated', `${planTenant.name} was changed from ${from} to ${to}.`); }} />}
      {statusTenant && <StatusReviewModal tenant={statusTenant} onClose={() => setStatusTenant(null)} onSaved={(status) => { invalidate(); setStatusTenant(null); notify(status === 'Suspended' ? 'Tenant suspended' : 'Tenant activated', `${statusTenant.name} is now ${status.toLowerCase()}. Existing data was retained.`); }} />}
      {detailsTenant && <TenantDetailsModalV2 tenant={detailsTenant} onClose={() => setDetailsTenant(null)} onPlan={() => { setPlanTenant(detailsTenant); setDetailsTenant(null); }} onStatus={() => { setStatusTenant(detailsTenant); setDetailsTenant(null); }} onCapacity={() => { setCapacityTenant(detailsTenant); setDetailsTenant(null); }} onAudit={() => setAuditTenant(detailsTenant)} />}
      {auditTenant && <AuditHistoryModalV2 tenant={auditTenant} onClose={() => setAuditTenant(null)} />}
    </div>
  );
}

function TenantActionsMenu({ tenant, onPlan, onStatus, onCapacity, onAudit }: { tenant: Tenant; onPlan: () => void; onStatus: () => void; onCapacity: () => void; onAudit: () => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const action = (callback: () => void) => { setOpen(false); callback(); };
  const itemClass = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50';
  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;
      const menuWidth = 224;
      const menuHeight = menuRef.current?.offsetHeight ?? 200;
      const gap = 8;
      const openAbove = trigger.bottom + menuHeight + gap > window.innerHeight && trigger.top - menuHeight - gap >= 8;
      setPosition({
        top: openAbove ? trigger.top - menuHeight - gap : trigger.bottom + gap,
        left: Math.min(Math.max(8, trigger.right - menuWidth), window.innerWidth - menuWidth - 8),
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  const menu = open ? createPortal(
    <div ref={menuRef} className="max-h-[calc(100vh-1rem)] w-56 overflow-y-auto rounded-lg bg-white p-1 shadow-xl ring-1 ring-slate-200" style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 70 }} role="menu">
      <button className={itemClass} type="button" role="menuitem" onClick={() => action(onPlan)}>Change plan</button>
      <button className={itemClass} type="button" role="menuitem" onClick={() => action(onStatus)}>{tenant.status === 'Active' ? <><PauseCircle className="h-4 w-4" />Suspend tenant</> : <><PlayCircle className="h-4 w-4" />Activate tenant</>}</button>
      <button className={itemClass} type="button" role="menuitem" onClick={() => action(onCapacity)}>Manage capacity</button>
      <button className={itemClass} type="button" role="menuitem" onClick={() => action(onAudit)}><History className="h-4 w-4" />View audit history</button>
    </div>,
    document.body,
  ) : null;

  return <div ref={triggerRef}><Button type="button" variant="secondary" size="sm" aria-label={`Actions for ${tenant.name}`} aria-expanded={open} onClick={() => setOpen((current) => !current)}><MoreHorizontal className="h-4 w-4" /></Button>{menu}</div>;
}

function TenantDetailsModalV2({ tenant, onClose, onPlan, onStatus, onCapacity, onAudit }: { tenant: Tenant; onClose: () => void; onPlan: () => void; onStatus: () => void; onCapacity: () => void; onAudit: () => void }) {
  return <Modal open onClose={onClose} title={tenant.name} size="lg"><div className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><ReviewPanel title="Plan"><ReviewItem label="Current plan" value={tenant.subscriptionPlan} /><ReviewItem label="Monthly price" value={formatPrice(tenant.monthlyPrice)} /></ReviewPanel><ReviewPanel title="Operations"><ReviewItem label="Status" value={tenant.status} /><ReviewItem label="Locations" value={`${tenant.activeLocationCount ?? 0} active`} /></ReviewPanel><ReviewPanel title="Capacity"><ReviewItem label="Add-on" value={tenant.additionalSlotCapacity > 0 ? `+${tenant.additionalSlotCapacity} slots/location` : 'None'} /><ReviewItem label="Effective limit" value={tenant.effectiveMaximumSlotsPerLocation == null ? 'Custom plan' : `${tenant.effectiveMaximumSlotsPerLocation} slots/location`} /></ReviewPanel></div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={onAudit}><History className="h-4 w-4" />Audit history</Button><Button type="button" variant="secondary" onClick={onCapacity}>Manage capacity</Button><Button type="button" variant="secondary" onClick={onStatus}>{tenant.status === 'Active' ? 'Suspend tenant' : 'Activate tenant'}</Button><Button type="button" onClick={onPlan}>Change plan</Button></div></div></Modal>;
}

function PlanReviewModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: (from: string, to: string) => void }) {
  const [plan, setPlan] = useState('');
  const [reason, setReason] = useState('');
  const save = useMutation({ mutationFn: () => platformApi.changePlan(tenant.id, plan, reason), onSuccess: () => onSaved(tenant.subscriptionPlan, plan) });
  const nextPrice = plan ? planPriceV2(plan) : null;
  const nextLocations = plan ? planLocationsV2(plan) : null;
  const conflict = nextLocations != null && (tenant.activeLocationCount ?? 0) > nextLocations;
  return <Modal open onClose={onClose} title="Change subscription plan?"><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (plan && reason.trim() && !conflict) save.mutate(); }}><Alert tone="warning">You’re changing {tenant.name} from {tenant.subscriptionPlan} to {plan || 'a new plan'}. This may affect billing, location limits, and add-on capacity.</Alert><FormField label="New plan" htmlFor="review-plan"><Select id="review-plan" value={plan} onChange={(event) => setPlan(event.target.value)}><option value="">Select a plan</option>{SUBSCRIPTION_PLANS.filter((item) => item !== tenant.subscriptionPlan).map((item) => <option key={item}>{item}</option>)}</Select></FormField>{plan && <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200 sm:grid-cols-2"><ReviewItem label="Monthly price" value={`${formatPrice(tenant.monthlyPrice)} → ${formatPrice(nextPrice)}`} /><ReviewItem label="Included locations" value={`${tenant.maximumLocations ?? 'Custom'} → ${nextLocations ?? 'Custom'}`} /><ReviewItem label="Existing add-ons" value="No change" /><ReviewItem label="Effective" value="Immediately" /></div>}{conflict && <Alert tone="error">This tenant currently has {tenant.activeLocationCount} locations, but {plan} includes only {nextLocations}. Archive locations or choose a plan that covers them before downgrading.</Alert>}<FormField label="Reason for change" htmlFor="plan-reason-v2"><Textarea id="plan-reason-v2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record why this change was approved" required /></FormField>{save.isError && <ErrorState error={save.error} />}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!plan || !reason.trim() || conflict} loading={save.isPending}>Confirm plan change</Button></div></form></Modal>;
}

function StatusReviewModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: (status: string) => void }) {
  const targetStatus = tenant.status === 'Active' ? 'Suspended' : 'Active';
  const [reason, setReason] = useState('');
  const save = useMutation({ mutationFn: () => platformApi.changeStatus(tenant.id, targetStatus, reason), onSuccess: () => onSaved(targetStatus) });
  const suspending = targetStatus === 'Suspended';
  return <Modal open onClose={onClose} title={suspending ? `Suspend ${tenant.name}?` : `Activate ${tenant.name}?`}><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) save.mutate(); }}><Alert tone={suspending ? 'error' : 'info'}>{suspending ? 'Tenant users will lose access and new parking sessions cannot be created. Existing data will be retained.' : 'Activating this tenant will restore user access and parking operations.'}</Alert><div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 ring-1 ring-slate-200"><p className="font-semibold text-slate-900">Operational records retained</p><p className="mt-1">Existing sessions, payments, locations, and audit history are not deleted.</p></div><FormField label={suspending ? 'Reason for suspension' : 'Reason for activation'} htmlFor="status-reason-v2"><Textarea id="status-reason-v2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record why this access change was approved" required /></FormField>{save.isError && <ErrorState error={save.error} />}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={onClose}>{suspending ? 'Keep active' : 'Cancel'}</Button><Button type="submit" variant={suspending ? 'danger' : 'primary'} disabled={!reason.trim()} loading={save.isPending}>{suspending ? 'Suspend tenant' : 'Activate tenant'}</Button></div></form></Modal>;
}

function CapacityAddonReviewModal({ tenant, onClose, onSaved }: { tenant: Tenant; onClose: () => void; onSaved: () => void }) {
  const [additionalCapacity, setAdditionalCapacity] = useState(tenant.additionalSlotCapacity);
  const [reason, setReason] = useState('');
  const save = useMutation({ mutationFn: () => platformApi.updateCapacityAddon(tenant.id, additionalCapacity, reason), onSuccess: () => { onSaved(); onClose(); } });
  const baseCapacity = tenant.maximumSlotsPerLocation;
  const effectiveCapacity = tenant.effectiveMaximumSlotsPerLocation == null || baseCapacity == null ? null : baseCapacity + additionalCapacity;
  return <Modal open onClose={onClose} title={`Manage capacity for ${tenant.name}`} size="md"><form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (reason.trim()) save.mutate(); }}><Alert tone="info">Additional capacity applies to each location. It does not create a new location.</Alert><div className="grid gap-3 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200 sm:grid-cols-2"><ReviewItem label="Current plan" value={tenant.subscriptionPlan} /><ReviewItem label="Current add-on" value={`+${tenant.additionalSlotCapacity} slots/location`} /></div><FormField label="Additional capacity (slots per location)" htmlFor="addon-capacity-v2"><Input id="addon-capacity-v2" type="number" min={0} value={additionalCapacity} onChange={(event) => setAdditionalCapacity(Math.max(0, Number(event.target.value)))} required /><p className="text-sm text-slate-500">Set to 0 to remove the add-on.</p></FormField><div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-900"><span className="font-semibold">Effective capacity: </span>{effectiveCapacity == null ? 'Managed by custom plan' : `${effectiveCapacity} slots per location`}</div><FormField label="Reason for change" htmlFor="capacity-reason-v2"><Textarea id="capacity-reason-v2" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Record why this change was approved" required /></FormField>{save.isError && <ErrorState error={save.error} />}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!reason.trim()} loading={save.isPending}>Save capacity</Button></div></form></Modal>;
}

function AuditHistoryModalV2({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const history = useQuery({ queryKey: ['tenant-audit-history', tenant.id], queryFn: () => platformApi.getAuditHistory(tenant.id) });
  return <Modal open onClose={onClose} title={`Audit history · ${tenant.name}`} size="lg"><div className="space-y-4">{history.isLoading && <LoadingState />}{history.isError && <ErrorState error={history.error} />}{history.data?.length === 0 && <EmptyState>No audited tenant changes yet.</EmptyState>}{history.data?.map((entry) => <AuditEntryV2 key={entry.id} entry={entry} />)}</div></Modal>;
}

function AuditEntryV2({ entry }: { entry: TenantAuditLog }) {
  const oldValues = parseAuditValuesV2(entry.oldValuesJson);
  const newValues = parseAuditValuesV2(entry.newValuesJson);
  return <article className="rounded-lg bg-slate-50 p-4 ring-1 ring-slate-200"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold text-slate-900">{formatAuditActionV2(entry.action)}</p><p className="mt-1 text-xs text-slate-500">{entry.administrator} · {new Date(entry.createdAt).toLocaleString()}</p></div>{entry.reason && <Badge tone="blue">Reason recorded</Badge>}</div><div className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Previous</p><p className="mt-1 break-words text-slate-700">{formatAuditValuesV2(oldValues)}</p></div><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New</p><p className="mt-1 break-words text-slate-700">{formatAuditValuesV2(newValues)}</p></div></div>{entry.reason && <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Reason:</span> {entry.reason}</p>}</article>;
}

function formatAuditActionV2(action: string) { return action === 'tenant.plan_changed' ? 'Subscription plan changed' : action === 'tenant.status_changed' ? 'Tenant status changed' : action === 'tenant.capacity_addon_changed' ? 'Capacity add-on changed' : action; }
function parseAuditValuesV2(value?: string | null): Record<string, unknown> { try { return value ? JSON.parse(value) as Record<string, unknown> : {}; } catch { return {}; } }
function formatAuditValuesV2(values: Record<string, unknown>) { return Object.entries(values).map(([key, value]) => `${key}: ${value == null ? 'Not calculated' : String(value)}`).join(' · ') || 'No details'; }
function planPriceV2(plan: string) { return plan === 'Starter' ? 3000 : plan === 'Growth' ? 6000 : plan === 'Enterprise' ? 10000 : null; }
function planLocationsV2(plan: string) { return plan === 'Starter' ? 1 : plan === 'Growth' ? 2 : plan === 'Enterprise' ? 3 : null; }
function formatPrice(price?: number | null) { return price == null ? 'Custom pricing' : `₱${price.toLocaleString()}/month`; }
