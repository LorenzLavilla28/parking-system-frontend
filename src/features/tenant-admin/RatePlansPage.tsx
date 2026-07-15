import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CircleDollarSign, Layers3, MapPin, Plus } from 'lucide-react';
import { adminApi, type RatePlan } from './api';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { MetricCard } from '@/components/ui/MetricCard';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, THead, TBody, Th, Td } from '@/components/ui/Table';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/states';
import { formatDateTime } from '@/lib/format';

export function RatePlansPage() {
  const navigate = useNavigate();
  const [versionsOf, setVersionsOf] = useState<RatePlan | null>(null);

  const plans = useQuery({ queryKey: ['admin-rate-plans'], queryFn: () => adminApi.listRatePlans() });
  const locationsById = useQuery({ queryKey: ['admin-locations'], queryFn: () => adminApi.listLocations() });

  const activePlanCount = plans.data?.items.filter((plan) => plan.status === 'Active').length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tenant administration"
        title="Rate plans"
        description="Configure customer-friendly parking prices with structured controls. Operators never need to edit pricing JSON."
        actions={
          <Button onClick={() => navigate('/admin/rate-plans/new')}>
            <Plus className="h-4 w-4" />
            New rate plan
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={CircleDollarSign} label="Active plans" value={activePlanCount} detail="Available for fee calculation" tone="green" />
        <MetricCard icon={Layers3} label="Total plans" value={plans.data?.items.length ?? '...'} detail="Across all locations" tone="blue" />
        <MetricCard
          icon={MapPin}
          label="Configured locations"
          value={locationsById.data?.items.length ?? '...'}
          detail="Ready for assignment"
          tone="slate"
        />
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
              <Th>Name</Th>
              <Th>Description</Th>
              <Th>Version</Th>
              <Th>Status</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </THead>
          <TBody>
            {plans.data.items.map((plan) => (
              <tr key={plan.id}>
                <Td className="font-medium text-slate-900">{plan.name}</Td>
                <Td className="max-w-md text-sm text-slate-600">{plan.description}</Td>
                <Td>v{plan.currentVersionNumber ?? '-'}</Td>
                <Td>
                  <Badge tone={plan.status === 'Active' ? 'green' : 'neutral'}>{plan.status}</Badge>
                </Td>
                <Td>
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                    {formatDateTime(plan.updatedAt)}
                  </span>
                </Td>
                <Td className="text-right">
                  <button className="text-sm font-medium text-brand-700 hover:underline" onClick={() => setVersionsOf(plan)}>
                    Versions
                  </button>
                </Td>
              </tr>
            ))}
          </TBody>
        </Table>
      )}

      {versionsOf && <VersionsModal plan={versionsOf} onClose={() => setVersionsOf(null)} />}
    </div>
  );
}

function VersionsModal({ plan, onClose }: { plan: RatePlan; onClose: () => void }) {
  const navigate = useNavigate();
  const versions = useQuery({ queryKey: ['rate-plan-versions', plan.id], queryFn: () => adminApi.listVersions(plan.id) });

  return (
    <Modal open onClose={onClose} title={`${plan.name} versions`} size="lg">
      {versions.isLoading && <LoadingState />}
      {versions.isError && <ErrorState error={versions.error} />}
      {versions.data?.length === 0 && <EmptyState>No versions have been created for this rate plan.</EmptyState>}
      {versions.data && (
        <ul className="space-y-2">
          {versions.data.map((version) => (
            <li key={version.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <span className="font-medium text-slate-800">v{version.versionNumber}</span>
              <span className="text-slate-500">
                {formatDateTime(version.effectiveFrom)} {version.effectiveTo ? '(superseded)' : '(current)'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex justify-end">
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            navigate(`/admin/rate-plans/${plan.id}/edit`);
          }}
        >
          New version
        </Button>
      </div>
    </Modal>
  );
}
