import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { ArrowRight, CarFront, Check, CircleDollarSign, Eye, EyeOff, ParkingCircle, QrCode, ShieldCheck } from 'lucide-react';
import { loginSchema, type LoginInput } from './schema';
import { useAuth, useLogin, homeRouteForRoles } from './hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/app/brand';

const benefits = [
  { icon: CarFront, title: 'Faster gate work', text: 'Record entries in a few clear steps.' },
  { icon: QrCode, title: 'Connected payments', text: 'Keep QR and cash activity together.' },
  { icon: ShieldCheck, title: 'Confident exits', text: 'Validate every vehicle before release.' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (isAuthenticated && user) {
    return <Navigate to={user.mustChangePassword ? '/change-password' : homeRouteForRoles(user.roles)} replace />;
  }

  const onSubmit = (values: LoginInput) => {
    login.mutate(values, {
      onSuccess: (session) => {
        const from = (location.state as { from?: string } | null)?.from;
        navigate(session.user.mustChangePassword ? '/change-password' : (from ?? homeRouteForRoles(session.user.roles)), { replace: true });
      },
    });
  };

  const error = login.error instanceof ApiError ? login.error : null;

  return (
    <main className="auth-page flex min-h-[100dvh] items-center justify-center overflow-x-hidden bg-[#edf3f9] px-4 py-4 sm:px-6 lg:px-8">
      <div className="grid w-full max-w-[1160px] overflow-hidden rounded-[28px] bg-white shadow-[0_28px_90px_rgba(15,35,75,0.17)] lg:h-[calc(100dvh-2rem)] lg:min-h-[600px] lg:max-h-[820px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="auth-brand-panel relative hidden overflow-hidden p-10 text-white lg:flex xl:p-12">
          <div className="parking-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative z-10 flex min-h-0 w-full flex-col">
            <BrandLink light />
            <div className="mt-12 max-w-[500px] xl:mt-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Staff operations workspace</p>
              <h1 className="mt-4 text-[clamp(2.6rem,4vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.05em]">Start the shift with everything in view.</h1>
              <p className="mt-5 max-w-[470px] text-base leading-7 text-blue-100/80">Move from entry to payment to exit with one reliable record for every vehicle.</p>
            </div>

            <div className="mt-8 grid grid-cols-3 gap-3">
              {benefits.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <p className="mt-3 text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100/70">{text}</p>
                </div>
              ))}
            </div>

            <div className="login-shift-snapshot mt-auto pt-8">
              <ShiftSnapshot />
            </div>
          </div>
        </section>

        <section className="flex min-h-0 items-center overflow-y-auto bg-white px-6 py-8 sm:px-12 lg:px-14 lg:py-10 xl:px-16">
          <div className="mx-auto w-full max-w-[410px]">
            <div className="mb-8 lg:hidden"><BrandLink /></div>
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Secure staff access</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-4xl">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">Sign in to continue to your assigned workspace.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
              {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}

              <FormField label="Work email" htmlFor="email" error={errors.email?.message}>
                <Input id="email" type="email" autoComplete="username" placeholder="you@company.com" invalid={!!errors.email} {...register('email')} />
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" className="pr-12" invalid={!!errors.password} {...register('password')} />
                  <button type="button" className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:text-brand-700" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between gap-4 pt-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700 focus:ring-brand-500" />Remember me</label>
                <Link className="font-bold text-brand-700 transition hover:text-brand-500" to="/forgot-password">Forgot password?</Link>
              </div>

              <Button type="submit" size="lg" fullWidth loading={login.isPending} className="mt-2 bg-[#075ea8] shadow-lg shadow-blue-950/15 hover:bg-[#064d89]">Sign in <ArrowRight className="h-4 w-4" /></Button>
            </form>

            <div className="mt-7 border-t border-slate-100 pt-6 text-center text-sm leading-6 text-slate-500">
              Need help accessing your account? <span className="font-semibold text-slate-700">Contact your administrator.</span>
            </div>
            <Link to="/" className="mt-4 flex items-center justify-center text-xs font-semibold text-slate-400 transition hover:text-brand-700">← Back to {PRODUCT_NAME}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function BrandLink({ light = false }: { light?: boolean }) {
  return <Link to="/" className="flex w-fit items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${light ? 'bg-white text-[#075ea8]' : 'bg-[#07172f] text-white'}`}><ParkingCircle className="h-6 w-6" /></span><span><span className={`block text-base font-extrabold tracking-tight ${light ? 'text-white' : 'text-[#07172f]'}`}>{PRODUCT_NAME}</span><span className={`block text-[11px] ${light ? 'text-blue-100/75' : 'text-slate-500'}`}>{PRODUCT_TAGLINE}</span></span></Link>;
}

function ShiftSnapshot() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm">
      <div className="rounded-xl bg-white p-4 text-slate-950 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Current shift</p><p className="mt-1 text-sm font-bold">Main Street Parking</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Gate online</span></div>
        <div className="mt-4 grid grid-cols-3 gap-2"><SnapshotMetric icon={CarFront} value="24" label="Inside" /><SnapshotMetric icon={CircleDollarSign} value="₱8.4k" label="Collected" /><SnapshotMetric icon={ShieldCheck} value="18" label="Cleared" /></div>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-[11px]"><span className="flex items-center gap-2 font-bold text-brand-900"><QrCode className="h-3.5 w-3.5 text-brand-600" /> Entry → Payment → Exit</span><span className="flex items-center gap-1 font-semibold text-emerald-700"><Check className="h-3 w-3" />Synced</span></div>
      </div>
    </div>
  );
}

function SnapshotMetric({ icon: Icon, value, label }: { icon: typeof CarFront; value: string; label: string }) {
  return <div className="rounded-lg bg-slate-50 p-2.5"><Icon className="h-3.5 w-3.5 text-brand-600" /><p className="mt-2 text-sm font-extrabold">{value}</p><p className="text-[10px] text-slate-500">{label}</p></div>;
}
