import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  CarFront,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  MapPin,
  ParkingCircle,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import { PRODUCT_NAME, PRODUCT_TAGLINE } from '@/app/brand';

const workflow = [
  {
    step: '01',
    icon: ScanLine,
    title: 'Record every arrival',
    text: 'Capture the plate, vehicle details, and entry time in one guard-friendly flow.',
  },
  {
    step: '02',
    icon: CircleDollarSign,
    title: 'Collect with confidence',
    text: 'Keep QR and cash payments connected to the right parking session.',
  },
  {
    step: '03',
    icon: ShieldCheck,
    title: 'Clear every exit',
    text: 'Confirm payment and exceptions before the vehicle leaves the property.',
  },
];

const capabilities = [
  'Real-time gate activity',
  'QR and cash payment tracking',
  'Multi-location administration',
];

export function LandingPage() {
  return (
    <div className="landing-page min-h-[100dvh] overflow-hidden bg-[#f5f8fc] text-slate-950">
      <header className="relative z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-[72px] sm:px-8 lg:px-10" aria-label="Main navigation">
          <BrandMark />
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <a href="#workflow" className="transition hover:text-brand-700">How it works</a>
            <a href="#teams" className="transition hover:text-brand-700">For your team</a>
            <a href="#platform" className="transition hover:text-brand-700">Platform</a>
          </div>
          <Link
            to="/login"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#075ea8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#064d89] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Staff sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main>
        <section id="platform" className="relative border-b border-slate-200/80 bg-white">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -right-32 -top-36 h-[30rem] w-[30rem] rounded-full bg-cyan-100/60 blur-3xl" />
            <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-blue-100/70 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16 lg:px-10 lg:pb-24 lg:pt-24">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">
                <Sparkles className="h-3.5 w-3.5" /> One clear operating system
              </div>
              <h1 className="mt-6 text-[clamp(3rem,6vw,5rem)] font-bold leading-[0.98] tracking-[-0.06em] text-[#07172f]">
                Keep every parking operation moving.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 sm:text-xl">
                {PRODUCT_NAME} gives guards a faster lane and managers a live view of every entry, payment, and exit.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#075ea8] px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/15 transition hover:-translate-y-0.5 hover:bg-[#064d89]">
                  Open your workspace <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#workflow" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 transition hover:border-brand-200 hover:text-brand-700">
                  See the workflow
                </a>
              </div>
              <div className="mt-8 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                {capabilities.map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> {item}
                  </span>
                ))}
              </div>
            </div>

            <OperationsPreview />
          </div>
        </section>

        <section className="border-b border-slate-200/80 bg-[#07172f] text-white">
          <div className="mx-auto grid max-w-7xl divide-y divide-white/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-10">
            <ProofPoint value="One view" label="for gate activity and payments" />
            <ProofPoint value="Any location" label="managed from the same workspace" />
            <ProofPoint value="Every shift" label="with a clear operational trail" />
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:gap-16">
            <div className="max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Entry to exit</p>
              <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] text-[#07172f] sm:text-5xl">One workflow your whole team can follow.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">Remove handoffs, disconnected records, and guesswork from the moments that matter most.</p>
            </div>
            <div className="grid gap-4">
              {workflow.map(({ step, icon: Icon, title, text }) => (
                <article key={step} className="group grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon className="h-6 w-6" /></span>
                  <div><h3 className="text-lg font-bold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{text}</p></div>
                  <span className="text-sm font-bold tracking-[0.12em] text-slate-300 group-hover:text-brand-500">{step}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="teams" className="border-y border-slate-200/80 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:py-28">
            <div className="rounded-[28px] bg-[#eaf4ff] p-6 sm:p-8">
              <div className="rounded-2xl bg-white p-5 shadow-[0_18px_50px_rgba(15,35,75,0.12)] sm:p-6">
                <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Live shift</p><h3 className="mt-1 text-xl font-bold">Riverside Parking</h3></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Gate online</span></div>
                <div className="mt-6 grid grid-cols-3 gap-3"><MiniMetric icon={CarFront} value="24" label="Inside" /><MiniMetric icon={Clock3} value="06m" label="Avg. stay" /><MiniMetric icon={QrCode} value="18" label="Paid" /></div>
                <div className="mt-5 space-y-3"><ActivityRow plate="NCR 2481" state="Payment verified" /><ActivityRow plate="ABC 9073" state="Entry recorded" /><ActivityRow plate="PBP 1024" state="Ready for exit" /></div>
              </div>
            </div>
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-600">Built around real shifts</p>
              <h2 className="mt-4 text-4xl font-bold leading-tight tracking-[-0.045em] text-[#07172f] sm:text-5xl">Simple at the gate. Powerful behind it.</h2>
              <p className="mt-5 text-base leading-7 text-slate-600">Give each person exactly what they need—without forcing guards to navigate an admin system or managers to piece together the day.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <TeamBenefit icon={UsersRound} title="For gate teams" text="Fast entry, payment checks, and clear exit decisions." />
                <TeamBenefit icon={BarChart3} title="For operators" text="Locations, rates, people, payments, and reporting in one place." />
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
          <div className="relative mx-auto flex max-w-7xl flex-col justify-between gap-8 overflow-hidden rounded-[28px] bg-[#07172f] px-7 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:px-14 lg:py-12">
            <div className="parking-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{PRODUCT_TAGLINE}</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Give your team a clearer way to run the lot.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100">Already onboarded? Your workspace is ready when you are.</p></div>
            <Link to="/login" className="relative inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#07172f] shadow-lg transition hover:bg-blue-50">Sign in to {PRODUCT_NAME} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10"><BrandMark compact /><p>© {new Date().getFullYear()} {PRODUCT_NAME}. {PRODUCT_TAGLINE}</p></div>
      </footer>
    </div>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return <Link to="/" className="flex w-fit items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"><span className={`flex items-center justify-center rounded-xl bg-[#07172f] text-white shadow-sm ${compact ? 'h-8 w-8' : 'h-9 w-9'}`}><ParkingCircle className={compact ? 'h-4 w-4' : 'h-5 w-5'} /></span><span><span className="block text-sm font-extrabold leading-4 tracking-tight text-[#07172f] sm:text-base">{PRODUCT_NAME}</span>{!compact && <span className="hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">{PRODUCT_TAGLINE}</span>}</span></Link>;
}

function OperationsPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      <div className="absolute -inset-3 rounded-[32px] bg-gradient-to-br from-brand-100 via-cyan-50 to-white blur-sm" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-[#07172f] p-3 shadow-[0_30px_90px_rgba(7,23,47,0.24)] sm:p-4">
        <div className="parking-grid pointer-events-none absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative rounded-2xl bg-[#f8fbff] p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><MapPin className="h-5 w-5" /></span><div><p className="text-sm font-bold">Operations overview</p><p className="text-xs text-slate-500">All active locations</p></div></div><span className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live</span></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard icon={CarFront} value="148" label="Entries today" /><MetricCard icon={CircleDollarSign} value="₱42.8k" label="Collected" /><MetricCard icon={Clock3} value="01:24" label="Avg. stay" /><MetricCard icon={ShieldCheck} value="97%" label="Clear exits" /></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Traffic today</p><p className="mt-1 text-sm font-bold">Steady across three locations</p></div><BarChart3 className="h-5 w-5 text-brand-600" /></div><div className="mt-6 flex h-24 items-end gap-2"><Bar height="38%" /><Bar height="58%" /><Bar height="48%" /><Bar height="78%" active /><Bar height="68%" /><Bar height="88%" active /><Bar height="62%" /></div></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">Latest activity</p><div className="mt-4 space-y-4"><Status icon={ScanLine} label="Entry captured" value="NCR 2481" /><Status icon={QrCode} label="QR payment" value="Verified" /><Status icon={ShieldCheck} label="Exit cleared" value="Just now" /></div></div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-brand-50 px-4 py-3 text-xs"><span className="font-bold text-brand-900">Entry → Payment → Exit</span><span className="text-slate-500">One connected operational record</span></div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label }: { icon: typeof CarFront; value: string; label: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-3"><Icon className="h-4 w-4 text-brand-600" /><p className="mt-3 text-lg font-extrabold tracking-tight text-slate-950">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>;
}

function Bar({ height, active = false }: { height: string; active?: boolean }) {
  return <span className={`flex-1 rounded-t-md ${active ? 'bg-brand-600' : 'bg-brand-100'}`} style={{ height }} />;
}

function Status({ icon: Icon, label, value }: { icon: typeof ScanLine; label: string; value: string }) {
  return <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon className="h-4 w-4" /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="truncate text-xs font-bold text-slate-900">{value}</p></div><Check className="ml-auto h-4 w-4 text-emerald-600" /></div>;
}

function ProofPoint({ value, label }: { value: string; label: string }) {
  return <div className="px-4 py-7 text-center sm:px-8 sm:py-8"><p className="text-xl font-extrabold tracking-tight">{value}</p><p className="mt-1 text-sm text-blue-100/75">{label}</p></div>;
}

function MiniMetric({ icon: Icon, value, label }: { icon: typeof CarFront; value: string; label: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><Icon className="h-4 w-4 text-brand-600" /><p className="mt-3 text-lg font-extrabold">{value}</p><p className="text-[11px] text-slate-500">{label}</p></div>;
}

function ActivityRow({ plate, state }: { plate: string; state: string }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><CarFront className="h-4 w-4" /></span><div><p className="text-xs font-bold text-slate-900">{plate}</p><p className="text-[11px] text-slate-500">{state}</p></div><CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" /></div>;
}

function TeamBenefit({ icon: Icon, title, text }: { icon: typeof UsersRound; title: string; text: string }) {
  return <div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>;
}
