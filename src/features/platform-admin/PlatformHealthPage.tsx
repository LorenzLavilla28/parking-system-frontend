import { useQuery } from '@tanstack/react-query';
import { Database, Server } from 'lucide-react';
import { platformApi } from './api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { LoadingState } from '@/components/ui/states';

export function PlatformHealthPage() {
  const health = useQuery({
    queryKey: ['platform-health'],
    queryFn: platformApi.health,
    refetchInterval: 15_000,
    retry: false,
  });

  const apiUp = health.data?.status === 'ready';
  const dbUp = health.data?.database === 'up';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="System health"
        description="Live readiness for the API and database backing the parking platform."
      />
      {health.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-slate-700">
              <Server className="h-5 w-5 text-brand-700" />
              API
            </span>
            <Badge tone={apiUp ? 'green' : 'red'}>{apiUp ? 'Operational' : 'Unreachable'}</Badge>
          </Card>
          <Card className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-slate-700">
              <Database className="h-5 w-5 text-emerald-700" />
              Database
            </span>
            <Badge tone={dbUp ? 'green' : 'red'}>{dbUp ? 'Connected' : 'Down'}</Badge>
          </Card>
        </div>
      )}
      <p className="text-xs text-slate-400">
        Auto-refreshes every 15s.
      </p>
    </div>
  );
}
