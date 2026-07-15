import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useLocation, Navigate, Link } from 'react-router-dom';
import { ArrowRight, CarFront, CircleDollarSign, ParkingCircle, ShieldCheck } from 'lucide-react';
import { loginSchema, type LoginInput } from './schema';
import { useAuth, useLogin, homeRouteForRoles } from './hooks';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/ui/FormField';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/lib/api/types';

const previewStats = [
  { label: 'Active sessions', value: '52', tone: 'bg-brand-50 text-brand-700' },
  { label: 'Paid exits', value: '590', tone: 'bg-emerald-50 text-emerald-700' },
  { label: 'Revenue today', value: 'P45.0k', tone: 'bg-amber-50 text-amber-700' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const login = useLogin();

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
    <div className="app-surface grid min-h-full place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <section className="hidden overflow-hidden rounded-2xl bg-slate-950 p-8 text-white shadow-2xl lg:block">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700">
              <ParkingCircle className="h-7 w-7" />
            </span>
            <div>
              <p className="text-lg font-bold">ParkingSaaS</p>
              <p className="text-sm text-slate-300">Multi-tenant parking operations</p>
            </div>
          </div>

          <div className="mt-12 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-300">Live gate-to-payment flow</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">One workspace for entry, payment, and exit validation.</h1>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Guards move quickly at the gate, admins keep rates under control, and customers get a simple payment path.
            </p>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {previewStats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-xs text-slate-300">{stat.label}</p>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-3">
            <FlowStep icon={CarFront} label="Vehicle entry" detail="Plate captured and QR ticket generated" />
            <FlowStep icon={CircleDollarSign} label="Customer payment" detail="PayMongo checkout and status polling" />
            <FlowStep icon={ShieldCheck} label="Exit validation" detail="Paid, overstay, cash, and override decisions" />
          </div>
        </section>

        <Card className="w-full p-7 shadow-xl ring-slate-200/90">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white">
              <ParkingCircle className="h-6 w-6" />
            </span>
            <div>
              <p className="font-bold text-slate-950">ParkingSaaS</p>
              <p className="text-xs text-slate-500">Staff operations</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Use your staff account to access the right workspace.</p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
            {error && <Alert tone="error">{error.detail ?? error.title}</Alert>}

            <FormField label="Email" htmlFor="email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="admin@demo.local"
                invalid={!!errors.email}
                {...register('email')}
              />
            </FormField>

            <FormField label="Password" htmlFor="password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                invalid={!!errors.password}
                {...register('password')}
              />
            </FormField>

            <Button type="submit" fullWidth loading={login.isPending}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link className="font-semibold text-brand-700 hover:text-brand-600" to="/forgot-password">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500 ring-1 ring-slate-200">
            Demo tenant admin: <span className="font-semibold text-slate-700">admin@demo.local</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function FlowStep({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof CarFront;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 p-4 ring-1 ring-white/10">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-slate-300">{detail}</p>
      </div>
    </div>
  );
}
