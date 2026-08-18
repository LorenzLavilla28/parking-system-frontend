import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Copy, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { buttonClasses } from '@/components/ui/Button';
import { useAuth, homeRouteForRoles } from './hooks';
import { ChangePasswordForm } from './ChangePasswordForm';

export function ProfilePage() {
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#security') {
      window.setTimeout(() => document.getElementById('security')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    }
  }, [location.hash]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Account & security"
        description="Review your account details and manage your sign-in security."
        actions={<Link to={homeRouteForRoles(user.roles)} className={buttonClasses({ variant: 'secondary' })}><ArrowLeft className="h-4 w-4" /> Back to workspace</Link>}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-lg font-bold text-brand-800 ring-1 ring-brand-100">
              {initials(user.fullName || user.email)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-bold text-slate-950">{user.fullName || 'Account user'}</h2>
              <p className="mt-1 break-all text-sm text-slate-600">{user.email}</p>
            </div>
          </div>

          <dl className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <ProfileItem icon={ShieldCheck} label="Organization" value={user.tenantName || 'Platform account'} />
            <ProfileItem icon={UserRound} label="Account status" value="Active" />
          </dl>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Roles</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {user.roles.map((role) => <Badge key={role} tone="blue">{roleLabel(role)}</Badge>)}
            </div>
          </div>

          <details className="mt-6 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Technical details</summary>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
              <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account ID</p><p className="mt-1 truncate font-mono text-xs text-slate-700" title={user.id}>{user.id}</p></div>
              <CopyValue value={user.id} />
            </div>
          </details>
        </Card>

        <Card id="security" className="scroll-mt-24">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100"><KeyRound className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-950">Security</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Change the password used to sign in to your account.</p>
            </div>
          </div>
          <div className="pt-5">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button type="button" onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1400); }).catch(() => setCopied(false)); }} className="shrink-0 rounded-md p-2 text-slate-500 hover:bg-white hover:text-slate-900" title="Copy account ID" aria-label="Copy account ID">{copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button>;
}

function ProfileItem({ icon: Icon, label, value, mono = false }: { icon: typeof Mail; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className={`mt-1 break-all text-sm font-semibold text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
      </div>
    </div>
  );
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'A';
}

function roleLabel(role: string) {
  return role.replace('PlatformAdministrator', 'Platform Admin').replace('TenantAdministrator', 'Tenant Admin');
}
