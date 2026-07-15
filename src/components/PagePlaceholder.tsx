import { Construction } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export function PagePlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Coming soon" title={title} description="This workspace is not available yet." />
      <Card className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <Construction className="h-5 w-5" />
        </span>
        <p className="text-sm text-slate-600">
          {description ?? 'This screen is not available yet.'}
        </p>
      </Card>
    </div>
  );
}
