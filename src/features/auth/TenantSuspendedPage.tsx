import { Link } from 'react-router-dom';
import { LockKeyhole, ParkingCircle } from 'lucide-react';
import { PRODUCT_NAME } from '@/app/brand';
import { useAuth } from './hooks';
import { useLogout } from './hooks';

export function TenantSuspendedPage() {
  const { user } = useAuth();
  const logout = useLogout();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#edf3f9] px-4 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-900/10 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <LockKeyhole className="h-7 w-7" aria-hidden="true" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-brand-600">{PRODUCT_NAME}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Workspace suspended</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {user?.tenantName || 'This tenant'} membership is currently suspended. Staff access is unavailable until a platform administrator reactivates the workspace.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-700 px-4 text-sm font-bold text-white transition hover:bg-brand-800"
            onClick={() => logout.mutate()}
          >
            Sign out
          </button>
          <Link to="/" className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
            <ParkingCircle className="h-4 w-4" aria-hidden="true" />
            Return home
          </Link>
        </div>
      </section>
    </main>
  );
}
