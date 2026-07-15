import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { platformApi, type CreateTenantInput, type Tenant, SUBSCRIPTION_PLANS, TENANT_STATUSES } from './api';
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
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/states';
import { cn } from '@/components/ui/cn';

const statusTone = (status: string) => (status === 'Active' ? 'green' : status === 'Suspended' ? 'amber' : 'neutral');

const currencyOptions = ['PHP', 'USD', 'SGD'];
const timezoneOptions = ['Asia/Manila', 'Asia/Singapore', 'UTC'];

const steps = [
  { title: 'Company', description: 'Tenant profile' },
  { title: 'Administrator', description: 'First admin' },
  { title: 'Location', description: 'First branch' },
  { title: 'Operations', description: 'Starter setup' },
  { title: 'Review', description: 'Confirm details' },
] as const;

const stepFields: Record<number, FieldName[]> = {
  0: ['name', 'slug', 'defaultCurrency', 'defaultTimezone'],
  1: ['adminFirstName', 'adminLastName', 'adminEmail', 'adminPassword'],
  2: ['locationName', 'locationSlug', 'locationTimezone', 'exitGraceMinutes'],
  3: [],
  4: [],
};

type FieldName =
  | 'name'
  | 'slug'
  | 'defaultCurrency'
  | 'defaultTimezone'
  | 'adminFirstName'
  | 'adminLastName'
  | 'adminEmail'
  | 'adminPassword'
  | 'locationName'
  | 'locationSlug'
  | 'locationTimezone'
  | 'exitGraceMinutes';

type FormErrors = Partial<Record<FieldName, string>>;

export function PlatformTenantsPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const tenants = useQuery({ queryKey: ['platform-tenants'], queryFn: () => platformApi.listTenants() });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['platform-tenants'] });
  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => platformApi.changeStatus(id, status),
    onSuccess: invalidate,
  });
  const activeCount = tenants.data?.items.filter((tenant) => tenant.status === 'Active').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="Tenants"
        description="Onboard operators, create their first administrator, and prepare the first parking location."
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

      {tenants.data && tenants.data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Plan</Th>
              <Th>Status</Th>
              <Th>Change status</Th>
            </tr>
          </THead>
          <TBody>
            {tenants.data.items.map((tenant) => (
              <tr key={tenant.id}>
                <Td className="font-medium text-slate-900">{tenant.name}</Td>
                <Td className="font-mono text-xs">{tenant.slug}</Td>
                <Td>{tenant.subscriptionPlan}</Td>
                <Td>
                  <Badge tone={statusTone(tenant.status)}>{tenant.status}</Badge>
                </Td>
                <Td>
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
    </div>
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
  firstLocation: {
    name: '',
    slug: '',
    address: '',
    timezone: 'Asia/Manila',
    exitGraceMinutes: 15,
    allowCashPayment: true,
  },
};

function TenantOnboardingWizard({ onClose, onCreated }: { onClose: () => void; onCreated: (tenant: Tenant) => void }) {
  const [form, setForm] = useState<CreateTenantInput>({ ...emptyTenant, firstLocation: { ...emptyTenant.firstLocation } });
  const [step, setStep] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<Record<number, boolean>>({});
  const [tenantSlugEdited, setTenantSlugEdited] = useState(false);
  const [locationSlugEdited, setLocationSlugEdited] = useState(false);
  const [locationTimezoneEdited, setLocationTimezoneEdited] = useState(false);
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
  const setLocation = (patch: Partial<CreateTenantInput['firstLocation']>) =>
    setForm((current) => ({ ...current, firstLocation: { ...current.firstLocation, ...patch } }));
  const errorFor = (field: FieldName) => (attemptedSteps[step] || attemptedSteps[4] ? errors[field] : undefined);

  function goNext() {
    if (!currentStepValid) {
      setAttemptedSteps((current) => ({ ...current, [step]: true }));
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function submit() {
    if (!allValid) {
      setAttemptedSteps({ 0: true, 1: true, 2: true, 3: true, 4: true });
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
                setForm((current) => ({
                  ...current,
                  defaultTimezone,
                  firstLocation: {
                    ...current.firstLocation,
                    timezone: locationTimezoneEdited ? current.firstLocation.timezone : defaultTimezone,
                  },
                }));
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

          {step === 2 && (
            <LocationStep
              form={form}
              errorFor={errorFor}
              onNameChange={(name) => {
                setLocation({
                  name,
                  slug: locationSlugEdited ? form.firstLocation.slug : slugify(name),
                });
              }}
              onSlugChange={(slug) => {
                setLocationSlugEdited(true);
                setLocation({ slug: slugify(slug) });
              }}
              onAddressChange={(address) => setLocation({ address })}
              onTimezoneChange={(timezone) => {
                setLocationTimezoneEdited(true);
                setLocation({ timezone });
              }}
              onExitGraceChange={(exitGraceMinutes) => setLocation({ exitGraceMinutes })}
              onAllowCashChange={(allowCashPayment) => setLocation({ allowCashPayment })}
            />
          )}

          {step === 3 && <OperationsStep />}
          {step === 4 && <ReviewStep form={form} />}

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

function LocationStep({
  form,
  errorFor,
  onNameChange,
  onSlugChange,
  onAddressChange,
  onTimezoneChange,
  onExitGraceChange,
  onAllowCashChange,
}: {
  form: CreateTenantInput;
  errorFor: (field: FieldName) => string | undefined;
  onNameChange: (value: string) => void;
  onSlugChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onExitGraceChange: (value: number) => void;
  onAllowCashChange: (value: boolean) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={MapPin}
        title="First parking location"
        description="Create the first branch so the tenant can start configuring rates and gate users."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location name" htmlFor="location-name" error={errorFor('locationName')}>
          <Input id="location-name" value={form.firstLocation.name} onChange={(event) => onNameChange(event.target.value)} />
        </FormField>
        <FormField label="Location slug" htmlFor="location-slug" error={errorFor('locationSlug')}>
          <Input id="location-slug" value={form.firstLocation.slug} onChange={(event) => onSlugChange(event.target.value)} placeholder="main-branch" />
        </FormField>
      </div>
      <FormField label="Address" htmlFor="location-address">
        <Input id="location-address" value={form.firstLocation.address ?? ''} onChange={(event) => onAddressChange(event.target.value)} placeholder="Street address or mall level" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Timezone" htmlFor="location-timezone" error={errorFor('locationTimezone')}>
          <Select id="location-timezone" value={form.firstLocation.timezone} onChange={(event) => onTimezoneChange(event.target.value)}>
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone}>
                {timezone}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Exit grace minutes" htmlFor="exit-grace" error={errorFor('exitGraceMinutes')}>
          <Input
            id="exit-grace"
            type="number"
            min={0}
            max={120}
            value={form.firstLocation.exitGraceMinutes}
            onChange={(event) => onExitGraceChange(Number(event.target.value))}
          />
        </FormField>
      </div>
      <label className="flex min-h-11 items-start gap-3 rounded-lg bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={form.firstLocation.allowCashPayment}
          onChange={(event) => onAllowCashChange(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
        />
        <span>
          <span className="block font-bold text-slate-950">Allow cash payment at this location</span>
          <span className="block leading-6 text-slate-600">Guards can record approved cash payments for exit workflows.</span>
        </span>
      </label>
    </section>
  );
}

function OperationsStep() {
  return (
    <section className="space-y-4">
      <SectionTitle
        icon={ClipboardList}
        title="Starter operating setup"
        description="The tenant, first admin, and first location will be created now. These items are the next setup steps."
      />
      <div className="grid gap-3">
        <NextSetupItem
          title="Create rate plan"
          description="After the tenant admin signs in, create the first rate plan from Administration > Rate plans."
          badge="Next action"
        />
        <NextSetupItem
          title="Add guards and supervisors"
          description="Use Administration > Users to invite gate staff and assign them to the first location."
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
        <ReviewPanel title="First location">
          <ReviewItem label="Location" value={form.firstLocation.name} />
          <ReviewItem label="Slug" value={form.firstLocation.slug} monospace />
          <ReviewItem label="Timezone" value={form.firstLocation.timezone} />
          <ReviewItem label="Cash payments" value={form.firstLocation.allowCashPayment ? 'Allowed' : 'Not allowed'} />
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
              {tenant.name} was created with its first administrator and first parking location.
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
        <ReviewPanel title="First location">
          <ReviewItem label="Name" value={tenant.firstLocation?.name ?? 'Created'} />
          <ReviewItem label="Slug" value={tenant.firstLocation?.slug ?? 'Ready for setup'} monospace />
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

  if (!form.firstLocation.name.trim()) errors.locationName = 'Enter the location name.';
  if (!form.firstLocation.slug.trim()) errors.locationSlug = 'Enter a location slug.';
  else if (!isValidSlug(form.firstLocation.slug)) errors.locationSlug = 'Use lowercase letters, numbers, and hyphens.';
  if (!form.firstLocation.timezone.trim()) errors.locationTimezone = 'Choose a location timezone.';
  if (Number.isNaN(form.firstLocation.exitGraceMinutes)) errors.exitGraceMinutes = 'Enter exit grace minutes.';
  else if (form.firstLocation.exitGraceMinutes < 0 || form.firstLocation.exitGraceMinutes > 120) {
    errors.exitGraceMinutes = 'Use 0 to 120 minutes.';
  }

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
    firstLocation: {
      name: form.firstLocation.name.trim(),
      slug: form.firstLocation.slug.trim(),
      address: form.firstLocation.address?.trim() || null,
      timezone: form.firstLocation.timezone,
      exitGraceMinutes: form.firstLocation.exitGraceMinutes,
      allowCashPayment: form.firstLocation.allowCashPayment,
    },
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
