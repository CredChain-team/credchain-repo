import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CHAIN_STEPS = [
  { icon: '📚', label: 'Course completed',     sub: '200 Level · UNN',             color: '#818cf8' },
  { icon: '✅', label: 'Credential verified',  sub: 'Coursera API · no upload',    color: '#2563eb' },
  { icon: '⬡',  label: 'Anchored on Solana',   sub: 'tx: 3xK9...m2Pw · permanent', color: '#06b6d4' },
  { icon: '🔍', label: 'Found by employer',    sub: '"React · Practitioner · NG"',  color: '#10b981' },
  { icon: '💰', label: 'Paid ₦250,000',        sub: 'SOL escrow · confirmed',       color: '#34d399' },
];

const STATS = [
  { value: '6,843',  label: 'Students Verified'      },
  { value: '₦42M+',  label: 'Earned by Students'     },
  { value: '$0.00',  label: 'Gas per Credential*'    },
  { value: '<1s',    label: 'Employer Search Speed'  },
];

const FOR_WHOM = [
  {
    icon: '📚', who: '200-level student',
    headline: 'You\'re in school. Start earning now.',
    copy: 'Verify a skill. Get found by employers searching CredChain. Apply for a company bounty. Earn before your lecturer marks your exam. Graduate with a CredScore and 30 confirmed paid deliveries on Solana.',
    cta: 'Start as a student', to: '/register?role=student',
  },
  {
    icon: '🪖', who: 'NYSC corps member',
    headline: 'Your service year should count.',
    copy: 'Add your PPA work to your verified ledger. Companies search CredChain for corps members with in-demand skills. Leave service with a professional record and real earnings — not just a green card.',
    cta: 'Join as NYSC member', to: '/register?role=student',
  },
  {
    icon: '🏛️', who: 'University or bootcamp',
    headline: 'Your graduates deserve instant proof.',
    copy: 'Mint verified credentials directly to students. No transcript delay. No fraud. Immutable Solana record the day results are confirmed. And your graduates appear instantly in employer searches.',
    cta: 'Become a verified issuer', to: '/register?role=issuer',
  },
  {
    icon: '💼', who: 'Company hiring talent',
    headline: 'Search. Find. Hire. Pay on Solana.',
    copy: 'Search 6,843 verified profiles by skill, tier, CredScore, and delivery history. Find a React Practitioner in Lagos in under one second. Invite them to a bounty. Payment on Solana — no invoice, no FX delay.',
    cta: 'Search talent', to: '/register?role=employer',
  },
];

const PROBLEMS = [
  { icon: '⏳', bad: '6–12 month transcript delay',       good: 'Instant on-chain Statement of Result'         },
  { icon: '🏦', bad: 'International payment rejected',     good: 'SOL to any wallet in under 1 second'          },
  { icon: '📄', bad: 'PDF certificate nobody verifies',    good: 'SHA-256 anchored, verifiable anywhere in <1s'  },
  { icon: '🪖', bad: 'NYSC mobilization errors',           good: 'NYSC pre-validation tracker in-app'           },
  { icon: '💸', bad: 'No income until after graduation',   good: 'Earn from year one — skill is the application' },
  { icon: '🔍', bad: 'Employers can\'t find you',          good: 'Searchable talent profile from day one'        },
];

export default function LandingPage() {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    if (visibleSteps >= CHAIN_STEPS.length) return;
    const t = setTimeout(() => setVisibleSteps(v => v + 1), 600);
    return () => clearTimeout(t);
  }, [visibleSteps]);

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-2xl font-black tracking-tight">
          <span className="text-[#2563eb]">Cred</span>Chain
        </span>
        <div className="flex items-center gap-3">
          <Link to="/registry" className="hidden text-sm text-slate-400 hover:text-white sm:inline transition-colors">Verify</Link>
          <Link to="/impact"   className="hidden text-sm text-slate-400 hover:text-white sm:inline transition-colors">Impact</Link>
          <Link to="/login"    className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-blue-500 hover:text-white">
            Sign in
          </Link>
          <Link to="/register" className="rounded-xl bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-colors hover:bg-blue-700">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-16 pb-10 text-center md:px-12 md:pt-24">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-950/60 px-4 py-1.5 text-xs font-medium text-blue-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
          Built on Solana · For students in school right now
        </div>

        <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl lg:text-7xl">
          Don't wait to graduate
          <br />
          <span className="bg-gradient-to-r from-[#2563eb] via-[#06b6d4] to-[#10b981] bg-clip-text text-transparent">
            to prove what you can do.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
          A 200-level student in Nigeria verifies a skill on CredChain.
          An employer searches <em>"Node.js Practitioner"</em> and finds them.
          They earn ₦250,000 before their semester exams.
          The credential is on Solana. The payment is real. The record builds until graduation — and beyond.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register?role=student"
            className="rounded-2xl bg-[#2563eb] px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-[0.97]">
            Start building my record →
          </Link>
          <Link to="/register?role=employer"
            className="rounded-2xl border border-slate-700 px-8 py-3.5 text-base font-semibold text-slate-300 transition-all hover:border-blue-500 hover:text-white">
            I'm hiring verified talent
          </Link>
        </div>
      </section>

      {/* Animated trust chain — now 5 steps including employer finding the student */}
      <section className="px-6 py-10 md:px-12">
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
          From class to found to paid — every step on Solana
        </p>
        <div className="mx-auto flex max-w-4xl items-center justify-center flex-wrap gap-1">
          {CHAIN_STEPS.map((step, i) => (
            <div key={i} className="flex items-center">
              <div className={`flex flex-col items-center transition-all duration-500 ${i < visibleSteps ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                  style={{ backgroundColor: step.color + '22', border: `1px solid ${step.color}44` }}>
                  {step.icon}
                </div>
                <p className="mt-2 text-center text-[11px] font-semibold leading-tight text-white max-w-[80px]">{step.label}</p>
                <p className="text-center text-[10px] leading-tight text-slate-500 max-w-[80px]">{step.sub}</p>
              </div>
              {i < CHAIN_STEPS.length - 1 && (
                <div className={`mx-1 h-px w-6 transition-all duration-500 ${i + 1 < visibleSteps ? 'bg-blue-600 opacity-100' : 'opacity-50 bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-slate-800 bg-slate-900/50 px-6 py-10 md:px-12">
        <div className="mx-auto grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-3xl font-black tracking-tight text-white">{s.value}</p>
              <p className="mt-1 text-xs text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-center text-[10px] text-slate-600">*via Solana Bubblegum state compression</p>
      </section>

      {/* Two-sided economy callout */}
      <section className="px-6 py-12 md:px-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 to-[#0f2040] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-3">The economy layer</p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">
            Not just storage. A two-sided marketplace.
          </h2>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-2xl mb-2">📚</p>
              <p className="font-bold text-white">Students discover bounties</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">See tasks from real companies, apply with verified credentials, earn SOL.</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
              <p className="text-2xl mb-2">💼</p>
              <p className="font-bold text-white">Employers search talent</p>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">Filter by skill, tier, CredScore, and delivery history. Hire before graduation.</p>
            </div>
          </div>
          <Link to="/register"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#2563eb] px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors">
            Join the marketplace →
          </Link>
        </div>
      </section>

      {/* For whom — 4 cards */}
      <section className="px-6 py-12 md:px-12">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-2 text-center text-3xl font-black tracking-tight md:text-4xl">Built for every stage</h2>
          <p className="mb-10 text-center text-slate-400">Not just graduates. Everyone with skill and no proof.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {FOR_WHOM.map((item, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.who}</span>
                </div>
                <h3 className="text-lg font-black text-white leading-tight">{item.headline}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed flex-1">{item.copy}</p>
                <Link to={item.to} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  {item.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 problems solved */}
      <section className="bg-slate-900/40 px-6 py-14 md:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-2 text-center text-3xl font-black md:text-4xl">
            Six problems. <span className="text-[#2563eb]">All solved.</span>
          </h2>
          <p className="mb-10 text-center text-slate-400">Nigeria first. Every emerging market next.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {PROBLEMS.map((p, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-[#0f1e35] p-4 flex items-start gap-3">
                <span className="text-xl mt-0.5">{p.icon}</span>
                <div>
                  <p className="text-sm text-slate-400 line-through">{p.bad}</p>
                  <p className="text-sm font-semibold text-white mt-0.5">→ {p.good}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Solana */}
      <section className="bg-gradient-to-r from-[#1e3a5f] to-[#0f2040] px-6 py-14 md:px-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-blue-400">Why Solana</p>
          <h2 className="text-2xl font-black leading-tight md:text-3xl">
            10,000 credentials on Ethereum: <span className="text-red-400">thousands in gas</span>.
            <br />
            On Solana via Bubblegum compression: <span className="text-[#34d399]">under $2 total</span>.
          </h2>
          <p className="mt-4 text-slate-400">
            A micro-task worth ₦80,000 is pointless with $20 gas fees. On Solana, it's a fraction of a cent.
            That's not a performance improvement — it's the difference between a product that exists and one that doesn't.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-16 text-center md:px-12">
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">
          Your proof of skill shouldn't wait four years.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-slate-400">
          Start in year one. Build while you study. Get discovered by employers searching CredChain.
          Graduate with a verified record that does all the talking.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/register?role=student"
            className="rounded-2xl bg-[#2563eb] px-8 py-4 text-base font-bold text-white shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-0.5 hover:bg-blue-700">
            Start building my record →
          </Link>
          <Link to="/register?role=employer"
            className="rounded-2xl border border-slate-700 px-8 py-4 text-base font-semibold text-slate-300 transition-all hover:border-blue-500 hover:text-white">
            I'm hiring verified talent
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-6 md:px-12">
        <div className="flex flex-col items-center justify-between gap-3 text-xs text-slate-600 md:flex-row">
          <span><span className="font-bold text-slate-400">Cred</span>Chain — Trust infrastructure for the global skill economy</span>
          <div className="flex gap-4">
            <Link to="/registry"           className="hover:text-slate-400 transition-colors">Issuer Registry</Link>
            <Link to="/impact"             className="hover:text-slate-400 transition-colors">Equity Impact</Link>
            <Link to="/verify/student/demo" className="hover:text-slate-400 transition-colors">Verify a Credential</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
