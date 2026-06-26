import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ShieldCheck, Search, ArrowRight, GraduationCap, Building2, Briefcase,
  BadgeCheck, Wallet, Clock, FileCheck, Coins, Sparkles, CheckCircle2, Lock,
} from 'lucide-react';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import Badge from '../components/ui/Badge';
import { stagger, staggerItem } from '../theme/motion';

const STATS = [
  { value: '6,843', label: 'People verified' },
  { value: '₦42M+', label: 'Earned by students' },
  { value: 'Free', label: 'To get verified' },
  { value: 'Under 1s', label: 'To check a skill' },
];

// Plain-English "how it works" — no blockchain jargon.
const HOW = [
  { icon: GraduationCap, title: 'Get your skill verified', copy: 'Your school, bootcamp, or employer confirms a skill you have. It’s added to your profile in seconds.', color: '#2563EB' },
  { icon: Lock, title: 'It can never be faked', copy: 'Once verified, your skill is locked in and tamper-proof. No one can edit, fake, or take it away — and you own it for life.', color: '#1D4ED8' },
  { icon: Search, title: 'Get found and get paid', copy: 'Employers search for your skills, hire you, and pay you directly — even before you graduate.', color: '#10B981' },
];

const PORTALS = [
  { icon: GraduationCap, title: 'I’m a student', copy: 'Show what you can do, build a trusted profile, and start earning while you study.', to: '/register?role=student', cta: 'Start free' },
  { icon: Building2, title: 'I’m a school or employer', copy: 'Give your people verified proof of their skills — instantly, with no paperwork.', to: '/register?role=issuer', cta: 'Verify skills' },
  { icon: Briefcase, title: 'I’m hiring', copy: 'Search real, verified talent. Hire and pay in one place — no fake résumés.', to: '/register?role=employer', cta: 'Find talent' },
];

const PROBLEMS = [
  { icon: Clock, bad: 'Waiting months for a transcript', good: 'Your proof is ready the moment you earn it' },
  { icon: Wallet, bad: 'Payments that get rejected or delayed', good: 'Get paid directly, in seconds' },
  { icon: FileCheck, bad: 'A PDF certificate no one trusts', good: 'Proof anyone can check in under a second' },
  { icon: ShieldCheck, bad: 'Fake résumés and made-up skills', good: 'Every skill is checked and tamper-proof' },
  { icon: Coins, bad: 'No income until after you graduate', good: 'Earn from your very first verified skill' },
  { icon: Search, bad: 'Employers can’t find you', good: 'Show up in searches from day one' },
];

function Reveal({ children, delay = 0, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

function FloatingCredential() {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: -py * 10, y: px * 12 });
  };
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 150, damping: 18 }}
      style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
      className="relative mx-auto w-full max-w-sm"
    >
      <div className="animate-floaty rounded-2xl bg-grad-brand-deep p-6 text-white shadow-brand">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-white/70">Verified Skill</span>
          <BadgeCheck className="h-6 w-6" />
        </div>
        <h3 className="mt-6 text-2xl font-extrabold">React Developer</h3>
        <p className="mt-1 text-sm text-white/70">Verified by University of Nigeria · 2026</p>
        <div className="mt-6 flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur">
          <ShieldCheck className="h-4 w-4 text-emerald-300" />
          <span className="text-sm font-semibold text-white/90">Checked &amp; tamper-proof</span>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/70">Skill score</span>
          <span className="font-bold text-emerald-300">+120</span>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
        className="absolute -right-3 -top-3 flex items-center gap-1.5 rounded-full bg-accent-500 px-3 py-1.5 text-xs font-bold text-white shadow-verified"
      >
        <ShieldCheck className="h-4 w-4" /> Verified
      </motion.div>
    </motion.div>
  );
}

export default function LandingPage() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <div className="min-h-screen bg-bg-base text-content-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border-subtle bg-bg-base/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <span className="text-xl font-black tracking-tight"><span className="text-brand-600">Cred</span>Chain</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/registry" className="hidden text-sm font-semibold text-content-secondary transition-colors hover:text-content-primary sm:inline">Check a skill</Link>
            <ThemeToggle />
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />}>Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={heroRef} className="relative overflow-hidden bg-grad-hero">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 md:grid-cols-2 md:py-24">
          <motion.div style={{ y: heroY }} variants={stagger(0.08)} initial="initial" animate="animate">
            <motion.div variants={staggerItem}>
              <Badge tone="brand" variant="soft" dot icon={<Sparkles />}>Proof of your skills — that anyone can trust</Badge>
            </motion.div>
            <motion.h1 variants={staggerItem} className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Prove what you can do.{' '}
              <span className="text-brand-600">Get hired. Get paid.</span>
            </motion.h1>
            <motion.p variants={staggerItem} className="mt-5 max-w-xl text-lg leading-relaxed text-content-secondary">
              CredChain turns your real skills into verified proof that employers trust — so you can get
              discovered and start earning, even before you finish school. It’s free to join.
            </motion.p>
            <motion.div variants={staggerItem} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/register?role=student"><Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>Start free</Button></Link>
              <Link to="/register?role=employer"><Button size="lg" variant="secondary">I’m hiring</Button></Link>
            </motion.div>
            <motion.p variants={staggerItem} className="mt-4 text-sm text-content-muted">No credit card. Set up in 2 minutes.</motion.p>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }}>
            <FloatingCredential />
          </motion.div>
        </div>
      </section>

      {/* Stats — boxed */}
      <section className="mx-auto -mt-6 max-w-5xl px-6">
        <div className="grid grid-cols-2 gap-4 rounded-2xl bg-bg-elevated p-6 shadow-card md:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={i} delay={i * 0.08} className="text-center">
              <p className="tnum text-3xl font-black tracking-tight text-content-primary md:text-4xl">{s.value}</p>
              <p className="mt-1 text-sm font-medium text-content-secondary">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works — boxes */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <Reveal className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-brand-600">How it works</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight md:text-4xl">Three simple steps</h2>
          <p className="mx-auto mt-3 max-w-xl text-content-secondary">From skill, to verified, to hired — in plain and simple steps.</p>
        </Reveal>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {HOW.map((step, i) => (
            <Reveal key={i} delay={i * 0.12}>
              <div className="group h-full rounded-2xl bg-bg-elevated p-7 shadow-card transition-all hover:-translate-y-1.5 hover:shadow-card-hover">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: step.color }}>
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="mt-5 inline-block rounded-full bg-bg-sunken px-2.5 py-1 text-xs font-bold text-content-secondary">Step {i + 1}</span>
                <h3 className="mt-3 text-xl font-extrabold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-content-secondary">{step.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Portals — big friendly boxes */}
      <section className="bg-bg-elevated">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Pick what fits you</h2>
            <p className="mx-auto mt-3 max-w-xl text-content-secondary">Whether you’re learning, teaching, or hiring — there’s a place for you.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PORTALS.map((p, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <Link to={p.to} className="group block h-full">
                  <div className="h-full rounded-2xl border-2 border-border-subtle bg-bg-base p-7 transition-all hover:-translate-y-1.5 hover:border-brand-500 hover:shadow-brand">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-brand-600 transition-transform group-hover:scale-110">
                      <p.icon className="h-8 w-8" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold">{p.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-content-secondary">{p.copy}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600">
                      {p.cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Problems → solutions — boxed rows */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">The old way is broken. <span className="text-brand-600">We fixed it.</span></h2>
          <p className="mt-3 text-content-secondary">Here’s what changes when your skills are verified.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {PROBLEMS.map((p, i) => (
            <Reveal key={i} delay={(i % 2) * 0.08}>
              <div className="flex items-start gap-4 rounded-2xl bg-bg-elevated p-5 shadow-card">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-600">
                  <p.icon style={{ width: 20, height: 20 }} />
                </span>
                <div>
                  <p className="text-sm text-content-muted line-through">{p.bad}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm font-bold text-content-primary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" /> {p.good}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band — big blue box */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-grad-brand-deep px-8 py-16 text-center text-white shadow-brand">
            <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">Your skills deserve to be seen.</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Join free, get your first skill verified, and start building a profile employers trust.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register?role=student"><Button size="lg" variant="secondary" rightIcon={<ArrowRight className="h-5 w-5" />}>Start free</Button></Link>
              <Link to="/registry"><Button size="lg" variant="ghost" className="text-white hover:bg-white/10">Check someone’s skill</Button></Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-subtle bg-bg-elevated">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-content-muted md:flex-row">
          <span><span className="font-bold text-content-secondary">Cred</span>Chain — proof of skills you can trust</span>
          <div className="flex gap-5">
            <Link to="/registry" className="transition-colors hover:text-content-primary">Trusted schools &amp; employers</Link>
            <Link to="/impact" className="transition-colors hover:text-content-primary">Our impact</Link>
            <Link to="/verify/student/demo" className="transition-colors hover:text-content-primary">Check a skill</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
