import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  CarFront,
  Check,
  CircleDollarSign,
  Eye,
  EyeOff,
  ParkingCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
} from 'lucide-react';
import { loginSchema, type LoginInput } from './schema';
import { useAuth, useLogin, homeRouteForRoles } from './hooks';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';

const benefits = [
  { icon: CarFront, label: 'Faster plate-based vehicle entry' },
  { icon: QrCode, label: 'Integrated QR and cash payments' },
  { icon: ShieldCheck, label: 'Real-time payment and exit validation' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const login = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

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
    <main className="auth-page app-surface min-h-full px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <div className="auth-layout mx-auto grid w-full max-w-[1240px] overflow-hidden rounded-[28px] shadow-[0_28px_80px_rgba(15,35,75,0.16)] lg:min-h-[700px] lg:grid-cols-[1.2fr_0.88fr] lg:gap-5 lg:overflow-visible lg:shadow-none">
        <section className="auth-brand-panel relative overflow-hidden px-6 py-7 text-white sm:px-10 sm:py-9 lg:rounded-[28px] lg:px-14 lg:py-12">
          <div className="parking-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
          <div className="relative z-10 flex h-full flex-col">
            <Link to="/" className="flex w-fit items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050a2c]">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#0057b8] shadow-lg shadow-black/10">
                <ParkingCircle className="h-7 w-7" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-lg font-bold tracking-tight">ParkingSaaS</span>
                <span className="block text-xs text-blue-100/75">Parking operations, organized</span>
              </span>
            </Link>

            <div className="mt-12 max-w-[620px] sm:mt-16 lg:mt-20">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Parking operations platform</p>
              <h1 className="mt-4 max-w-[600px] text-[clamp(2.5rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.04em]">
                Manage every entry, payment, and exit from one place.
              </h1>
              <p className="mt-5 max-w-[560px] text-base leading-7 text-blue-100/75 sm:text-lg">
                Give guards a faster workflow while administrators stay in control of locations, rates, payments, and daily activity.
              </p>
            </div>

            <div className="mt-8 hidden flex-wrap gap-x-6 gap-y-3 sm:flex sm:mt-10">
              {benefits.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-blue-50/90">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-300/15 text-cyan-300">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 hidden max-w-[660px] lg:mt-auto lg:block lg:pt-14">
              <ProductPreview />
            </div>
          </div>
        </section>

        <section className="auth-form-panel flex items-center bg-white px-6 py-9 sm:px-12 lg:my-14 lg:self-center lg:rounded-2xl lg:px-14 lg:py-10 lg:shadow-[0_18px_45px_rgba(15,35,75,0.12)]">
          <div className="mx-auto w-full max-w-[410px]">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-600">Staff workspace</p>
              <h2 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-slate-950">Welcome back</h2>
              <p className="mt-2 text-base leading-6 text-slate-500">Sign in to manage your parking operations.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}

              <FormField label="Work email" htmlFor="email" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@company.com"
                  invalid={!!errors.email}
                  {...register('email')}
                />
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="pr-12"
                    invalid={!!errors.password}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:text-brand-700"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>

              <div className="flex items-center justify-between gap-4 pt-0.5 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-brand-700 accent-brand-700 focus:ring-brand-500"
                  />
                  Remember me
                </label>
                <Link className="font-semibold text-brand-700 transition hover:text-brand-500" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" size="lg" fullWidth loading={login.isPending} className="mt-2 bg-[#0057b8] shadow-lg shadow-blue-900/15 hover:bg-[#004a9c]">
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-7 text-center text-sm leading-6 text-slate-500">
              Having trouble signing in?{' '}
              <span className="font-semibold text-slate-700">Contact your administrator.</span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="product-preview rounded-2xl border border-white/15 bg-[#f7fbff]/[0.09] p-3 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="rounded-xl bg-[#f7fbff] p-4 text-slate-900 shadow-xl shadow-black/10 sm:p-5">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e8f2ff] text-brand-700">
              <ScanLine className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold">Operations overview</p>
              <p className="text-[11px] text-slate-500">Main Street Parking</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Gate open
          </span>
        </div>

        <div className="mt-4 grid grid-cols-[1.15fr_0.85fr] gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Gate operations</p>
              <CarFront className="h-4 w-4 text-brand-600" />
            </div>
            <div className="mt-4 flex items-end gap-2">
              <div className="h-14 w-2 rounded-t bg-brand-200" />
              <div className="h-20 w-2 rounded-t bg-brand-400" />
              <div className="h-11 w-2 rounded-t bg-cyan-300" />
              <div className="h-24 w-2 rounded-t bg-brand-600" />
              <div className="h-16 w-2 rounded-t bg-brand-300" />
              <div className="ml-2 text-[11px] leading-4 text-slate-500">Entry flow<br /><span className="font-semibold text-slate-800">Moving smoothly</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Payment status</p>
            <div className="mt-4 space-y-2.5 text-[11px]">
              <StatusRow icon={CircleDollarSign} label="QR payments" status="Verified" />
              <StatusRow icon={ShieldCheck} label="Exit checks" status="Clear" />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-[#eef6ff] px-3 py-2.5 text-[11px]">
          <span className="flex items-center gap-2 font-semibold text-brand-900"><QrCode className="h-4 w-4 text-brand-600" /> Entry → Payment → Exit</span>
          <span className="text-slate-500">One connected workflow</span>
        </div>
      </div>
    </div>
  );
}

function StatusRow({ icon: Icon, label, status }: { icon: typeof CircleDollarSign; label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-slate-600"><Icon className="h-3.5 w-3.5 text-brand-500" />{label}</span>
      <span className="flex items-center gap-1 font-semibold text-emerald-700"><Check className="h-3 w-3" />{status}</span>
    </div>
  );
}
