import { Link } from 'react-router-dom';
import { ArrowRight, CarFront, CheckCircle2, CircleDollarSign, ParkingCircle, ScanLine, ShieldCheck } from 'lucide-react';

const benefits = [
  {
    icon: CarFront,
    title: 'Faster at the gate',
    text: 'Capture plates and start sessions in a few clear steps, so queues keep moving.',
  },
  {
    icon: CircleDollarSign,
    title: 'Payments in one view',
    text: 'Bring QR and cash payments together with the session they belong to.',
  },
  {
    icon: ShieldCheck,
    title: 'Confident exits',
    text: 'Validate payment and exceptions before a vehicle leaves the lot.',
  },
];

export function LandingPage() {
  return (
    <div className="landing-page app-surface min-h-full overflow-hidden text-slate-900">
      <header className="relative z-20 border-b border-slate-200/70 bg-white/75 backdrop-blur-xl">
        <nav className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-white shadow-sm"><ParkingCircle className="h-5 w-5" /></span>
            <span className="text-lg font-bold tracking-tight text-brand-900">ParkingSaaS</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-semibold text-slate-500 md:flex">
            <a href="#product" className="transition hover:text-brand-700">Product</a>
            <a href="#workflow" className="transition hover:text-brand-700">How it works</a>
            <a href="#contact" className="transition hover:text-brand-700">Contact</a>
          </div>
          <Link to="/login" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0057b8] px-4 text-sm font-semibold text-white shadow-md shadow-blue-900/10 transition hover:bg-[#004a9c] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>
      </header>

      <main>
        <section id="product" className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-24">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">Parking operations platform</p>
            <h1 className="mt-5 text-5xl font-bold leading-[1.02] tracking-[-0.05em] text-brand-950 sm:text-6xl">Make every parking operation feel effortless.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">A connected workspace for the people at the gate and the teams behind the lot.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/login" className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#0057b8] px-5 text-sm font-bold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#004a9c]">Access your workspace <ArrowRight className="h-4 w-4" /></Link>
              <a href="#workflow" className="inline-flex h-12 items-center rounded-xl px-2 text-sm font-bold text-brand-700 transition hover:text-brand-500">See how it works</a>
            </div>
            <div className="mt-9 flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Built for daily parking operations</div>
          </div>
          <LandingPreview />
        </section>

        <section id="workflow" className="border-y border-slate-200/70 bg-white/60">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-20">
            <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-brand-600">One connected workflow</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.04em] text-brand-950 sm:text-4xl">Everything your team needs to keep the lot moving.</h2></div>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {benefits.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
          <div className="flex flex-col justify-between gap-8 rounded-3xl bg-brand-950 px-7 py-10 text-white sm:px-10 lg:flex-row lg:items-center lg:px-14">
            <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">Ready when you are</p><h2 className="mt-3 text-3xl font-bold tracking-[-0.04em]">Bring your parking operation into focus.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-blue-100/70">Talk with your ParkingSaaS representative about the right setup for your locations and teams.</p></div>
            <Link to="/login" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-brand-900 transition hover:bg-blue-50">Sign in to your workspace <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function LandingPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[620px] rounded-[28px] bg-brand-950 p-3 shadow-[0_24px_70px_rgba(2,9,54,0.22)] sm:p-4">
      <div className="parking-grid absolute inset-0 rounded-[28px] opacity-30" aria-hidden="true" />
      <div className="relative rounded-2xl bg-[#f7fbff] p-4 sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><ParkingCircle className="h-5 w-5" /></span><div><p className="text-sm font-bold">Operations overview</p><p className="text-xs text-slate-400">All locations</p></div></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Connected</span></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-[1.2fr_0.8fr]"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Activity flow</p><p className="mt-1 text-sm font-bold text-slate-800">Entry → Payment → Exit</p></div><CarFront className="h-5 w-5 text-brand-500" /></div><div className="mt-7 flex h-20 items-end gap-2 border-b border-slate-100 pb-0"><span className="h-9 flex-1 rounded-t bg-brand-200" /><span className="h-14 flex-1 rounded-t bg-brand-400" /><span className="h-11 flex-1 rounded-t bg-cyan-300" /><span className="h-20 flex-1 rounded-t bg-brand-600" /><span className="h-16 flex-1 rounded-t bg-brand-300" /><span className="h-12 flex-1 rounded-t bg-brand-400" /></div><div className="mt-3 flex justify-between text-[10px] text-slate-400"><span>Morning</span><span>Afternoon</span><span>Evening</span></div></div><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Control centre</p><div className="mt-5 space-y-4"><MiniStatus label="Plate capture" status="Ready" icon={ScanLine} /><MiniStatus label="QR payments" status="Verified" icon={CircleDollarSign} /><MiniStatus label="Exit validation" status="Clear" icon={ShieldCheck} /></div></div></div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 px-4 py-3 text-xs"><span className="font-semibold text-brand-900">A clearer way to run the lot</span><span className="text-slate-500">Designed for guards and administrators</span></div>
      </div>
    </div>
  );
}

function MiniStatus({ label, status, icon: Icon }: { label: string; status: string; icon: typeof ScanLine }) {
  return <div className="flex items-center justify-between gap-2 text-xs"><span className="flex items-center gap-2 text-slate-600"><Icon className="h-4 w-4 text-brand-500" />{label}</span><span className="font-semibold text-emerald-700">{status}</span></div>;
}
