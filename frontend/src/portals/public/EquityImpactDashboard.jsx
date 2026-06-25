// ─────────────────────────────────────────────────────────────
// CredChain — Equity Impact Dashboard (Section 5.3)
// Logged-out, public. The data-backed proof of the mission: share of hires
// from non-traditional / first-time-verified institutions, country spread of
// verified students, and issuer-diversity growth. (Mock aggregates.)
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Users, BadgeCheck, Globe2, Sparkles, Info } from 'lucide-react';
import PublicLayout from './PublicLayout';
import { EQUITY_STATS } from '../../mock/data';
import { Card, StatCard } from '../../components/ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function EquityImpactDashboard() {
  const s = EQUITY_STATS;
  const maxStudents = Math.max(...s.countries.map((c) => c.students));
  const maxIssuers = Math.max(...s.issuerDiversityGrowth.map((m) => m.issuers));

  return (
    <PublicLayout fullBleed>
      {/* Hero */}
      <div className="relative overflow-hidden bg-grad-brand py-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative px-4">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-extrabold tracking-tight text-white"
          >
            Equity Impact Dashboard
          </motion.h1>
          <p className="mt-3 text-lg text-white/80">Trust infrastructure that doesn’t care how famous your school is — measured, not claimed.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-auto -mt-10 grid max-w-5xl grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Verified students" value={s.verifiedStudents} format="compact" icon={Users} tone="brand" />
        <StatCard label="Verified hires" value={s.verifiedHires} format="compact" icon={BadgeCheck} tone="success" />
        <StatCard label="Hires from non-elite issuers" value={Math.round(s.nonTraditionalHireShare * 100)} format="percent" icon={Globe2} tone="violet" />
        <StatCard label="First-time-verified institutions" value={s.firstTimeVerifiedInstitutions} icon={Sparkles} tone="warning" />
      </div>

      <motion.div
        variants={stagger(0.08)}
        initial="initial"
        animate="animate"
        className="mx-auto mt-8 grid max-w-5xl gap-6 px-6 lg:grid-cols-2"
      >
        {/* Country spread */}
        <motion.section variants={staggerItem}>
          <Card padding="lg" className="h-full">
            <h2 className="text-lg font-bold tracking-tight text-content-primary">Verified students by country</h2>
            <div className="mt-5 space-y-3">
              {s.countries.map((c) => (
                <div key={c.code} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-content-secondary">{c.flag} {c.name}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${(c.students / maxStudents) * 100}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full rounded-full bg-grad-brand"
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs font-medium text-content-muted">{c.students.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

        {/* Issuer diversity growth */}
        <motion.section variants={staggerItem}>
          <Card padding="lg" className="h-full">
            <h2 className="text-lg font-bold tracking-tight text-content-primary">Issuer diversity growth</h2>
            <div className="mt-6 flex items-end gap-2" style={{ height: 140 }}>
              {s.issuerDiversityGrowth.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[10px] font-medium text-content-muted">{m.issuers}</span>
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${(m.issuers / maxIssuers) * 110}px` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full rounded-t-md bg-brand-500"
                  />
                  <span className="text-[10px] text-content-muted">{m.month}</span>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>
      </motion.div>

      <div className="mx-auto mt-6 max-w-5xl px-6 pb-12">
        <div className="flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-soft px-4 py-3 text-sm text-content-secondary dark:border-brand-500/30">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>A bootcamp in Lagos and a bootcamp in Manila go through the exact same trust framework. The architecture works for any country from day one.</p>
        </div>
      </div>
    </PublicLayout>
  );
}
