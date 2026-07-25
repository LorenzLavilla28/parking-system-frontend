import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CalendarClock, History, MapPin, MoreHorizontal, Pencil, Plus } from 'lucide-react';
import { adminApi, type RatePlan } from './api';
import { describeRateRules, parseRateRulesJson } from './pricingRules';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/format';

export function RatePlansPage() {
  const navigate = useNavigate();
  const [historyOf, setHistoryOf] = useState<RatePlan | null>(null);
  const [detailsOf, setDetailsOf] = useState<RatePlan | null>(null);

  const plans = useQuery({ queryKey: ['admin-rate-plans'], queryFn: () => adminApi.listRatePlans() });
  const locations = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });
  const locationItems = locations.data?.items ?? [];
  const assignedLocationCount = (planId: string) =>
    locationItems.filter((location) => location.activeRatePlanId === planId && location.status === 'Active').length;
  const activePlanCount = plans.data?.items.filter((plan) => plan.status === 'Active').length ?? 0;
  const assignedLocationTotal = plans.data?.items.reduce((total, plan) => total + assignedLocationCount(plan.id), 0) ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Tenant administration"
        title="Rate plans"
        description="Configure customer-facing parking prices. Published revisions protect the pricing history of active sessions."
        actions={
          <Button onClick={() => navigate('/admin/rate-plans/new')}>
            <Plus className="h-4 w-4" />
            New rate plan
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <CompactFigure label="Active plans" value={activePlanCount} detail="Available for new sessions" />
        <CompactFigure label="Total plans" value={plans.data?.items.length ?? '...'} detail="Including archived plans" />
        <CompactFigure label="Locations using a rate plan" value={locations.isLoading ? '...' : assignedLocationTotal} detail="Active assignments" />
      </div>

      {plans.isLoading && <LoadingState />}
      {plans.isError && <ErrorState error={plans.error} />}
      {plans.data && plans.data.items.length === 0 && (
        <EmptyState>No rate plans yet. Create one to start calculating parking fees.</EmptyState>
      )}

      {plans.data && plans.data.items.length > 0 && (
        <Table>
          <THead>
            <tr>
              <Th>Rate plan</Th>
              <Th>Pricing summary</Th>
              <Th>Locations</Th>
              <Th>Status</Th>
              <Th>Last updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <TBody>
            {plans.data.items.map((plan) => (
              <RatePlanRow
                key={plan.id}
                plan={plan}
                assignedLocations={assignedLocationCount(plan.id)}
                onDetails={() => setDetailsOf(plan)}
                onHistory={() => setHistoryOf(plan)}
              />
            ))}
          </TBody>
        </Table>
      )}

      {historyOf && <ChangeHistoryModal plan={historyOf} onClose={() => setHistoryOf(null)} />}
      {detailsOf && <RatePlanDetailsModal plan={detailsOf} assignedLocations={assignedLocationCount(detailsOf.id)} onClose={() => setDetailsOf(null)} />}
    </div>
  );
}

function CompactFigure({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-lg bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-xl font-semibold tracking-tight text-slate-950">{value}</p>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function RatePlanRow({
  plan,
  assignedLocations,
  onDetails,
  onHistory,
}: {
  plan: RatePlan;
  assignedLocations: number;
  onDetails: () => void;
  onHistory: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const archive = useMutation({
    mutationFn: () => adminApi.archiveRatePlan(plan.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-rate-plans'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-locations'] }),
      ]);
      setMenuOpen(false);
    },
  });

  const pricingSummary = plan.currentRulesJson
    ? describeRateRules(parseRateRulesJson(plan.currentRulesJson))
    : plan.description;
  const statusTone = plan.status === 'Active' ? 'green' : plan.status === 'Draft' ? 'blue' : 'neutral';

  const archivePlan = () => {
    if (plan.status === 'Archived') return;
    if (window.confirm(`Archive “${plan.name}”? Locations using it will need another active rate plan.`)) archive.mutate();
  };

  return (
    <tr className="group">
      <Td>
        <button
          type="button"
          className="text-left font-semibold text-brand-800 hover:text-brand-600 hover:underline"
          onClick={() => navigate(`/admin/rate-plans/${plan.id}/edit`)}
        >
          {plan.name}
        </button>
        <p className="mt-1 text-xs text-slate-500">Current pricing · Revision {plan.currentVersionNumber ?? '-'}</p>
      </Td>
      <Td className="max-w-md text-sm text-slate-600">{pricingSummary}</Td>
      <Td>
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <MapPin className="h-3.5 w-3.5 text-slate-400" />
          {assignedLocations} {assignedLocations === 1 ? 'location' : 'locations'}
        </span>
      </Td>
      <Td>
        <Badge tone={statusTone}>{plan.status}</Badge>
      </Td>
      <Td>
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
          <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
          {formatDateTime(plan.updatedAt)}
        </span>
      </Td>
      <Td className="text-right">
        <div className="relative inline-flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/rate-plans/${plan.id}/edit`)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit rate plan
          </Button>
          <button
            type="button"
            aria-label={`More actions for ${plan.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full right-0 z-20 mb-2 w-52 rounded-lg bg-white p-1 text-left shadow-lg ring-1 ring-slate-200">
              <MenuAction icon={MapPin} onClick={() => { setMenuOpen(false); onDetails(); }}>
                View details
              </MenuAction>
              <MenuAction icon={Pencil} onClick={() => navigate(`/admin/rate-plans/new?duplicate=${plan.id}`)}>
                Duplicate rate plan
              </MenuAction>
              <MenuAction icon={History} onClick={() => { setMenuOpen(false); onHistory(); }}>
                View change history
              </MenuAction>
              <MenuAction icon={MapPin} onClick={() => { setMenuOpen(false); navigate('/admin/locations'); }}>
                Assign to locations
              </MenuAction>
              {plan.status !== 'Archived' && (
                <MenuAction icon={Archive} danger onClick={archivePlan} disabled={archive.isPending}>
                  Archive rate plan
                </MenuAction>
              )}
            </div>
          )}
        </div>
      </Td>
    </tr>
  );
}

function RatePlanDetailsModal({
  plan,
  assignedLocations,
  onClose,
}: {
  plan: RatePlan;
  assignedLocations: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const pricingSummary = plan.currentRulesJson
    ? describeRateRules(parseRateRulesJson(plan.currentRulesJson))
    : plan.description;

  return (
    <Modal open onClose={onClose} title={`${plan.name} details`}>
      <dl className="grid gap-3 sm:grid-cols-2">
        <DetailItem label="Description" value={plan.description} />
        <DetailItem label="Status" value={plan.status} />
        <DetailItem label="Pricing" value={pricingSummary} />
        <DetailItem label="Locations using this plan" value={`${assignedLocations}`} />
        <DetailItem label="Current revision" value={`Revision ${plan.currentVersionNumber ?? '-'}`} />
        <DetailItem label="Last updated" value={formatDateTime(plan.updatedAt)} />
      </dl>
      <div className="mt-5 flex justify-end">
        <Button
          onClick={() => {
            onClose();
            navigate(`/admin/rate-plans/${plan.id}/edit`);
          }}
        >
          <Pencil className="h-4 w-4" />
          Edit rate plan
        </Button>
      </div>
    </Modal>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-900">{value}</dd>
    </div>
  );
}

function MenuAction({
  icon: Icon,
  children,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: typeof History;
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-60 ${danger ? 'text-red-700' : 'text-slate-700'}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function ChangeHistoryModal({ plan, onClose }: { plan: RatePlan; onClose: () => void }) {
  const navigate = useNavigate();
  const versions = useQuery({ queryKey: ['rate-plan-versions', plan.id], queryFn: () => adminApi.listVersions(plan.id) });

  return (
    <Modal open onClose={onClose} title={`${plan.name} change history`} size="lg">
      <p className="mb-4 text-sm leading-6 text-slate-600">
        Published pricing revisions are immutable. Existing parking sessions keep the revision that was active when they entered; new sessions use the current revision.
      </p>
      {versions.isLoading && <LoadingState />}
      {versions.isError && <ErrorState error={versions.error} />}
      {versions.data?.length === 0 && <EmptyState>No pricing revisions have been published for this rate plan.</EmptyState>}
      {versions.data && (
        <ul className="space-y-2">
          {versions.data.map((version) => (
            <li key={version.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200">
              <span className="font-medium text-slate-800">Revision {version.versionNumber}</span>
              <span className="text-slate-500">
                {formatDateTime(version.effectiveFrom)} {version.effectiveTo ? '(superseded)' : '(current)'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            navigate(`/admin/rate-plans/${plan.id}/edit`);
          }}
        >
          Edit rate plan
        </Button>
      </div>
    </Modal>
  );
}
