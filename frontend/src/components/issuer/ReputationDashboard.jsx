// ─────────────────────────────────────────────────────────────
// CredChain — Issuer Reputation Dashboard (Section 4.3)
// Outcome data the issuer can market with ("Our 2026 cohort: 85% verified
// placement"). Drives institutional adoption — value back, not just admin
// overhead. Mock aggregates for the demo (Execution Plan step 4).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Gauge, Clock, BarChart3, Megaphone, Copy, Check } from 'lucide-react';
import { ISSUER_REPUTATION } from '../../mock/data';
import { Card, StatCard, TrustTier, Button } from '../ui';
import { fadeUp, stagger, staggerItem } from '../../theme/motion';

export default function ReputationDashboard() {
  const r = ISSUER_REPUTATION;
  const maxP = Math.max(...r.trend.map((t) => t.placements));
  const [copied, setCopied] = useState(false);

  const embed = `<a href="https://credchain.io/registry">Verified on CredChain — ${Math.round(r.placementRate * 100)}% placement</a>`;
  const copyEmbed = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(embed).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div variants={stagger(0.06)} initial="initial" animate="animate" className="space-y-6">
      <motion.div variants={staggerItem} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Verified placement" value={Math.round(r.placementRate * 100)} format="percent" icon={TrendingUp} tone="brand" />
        <StatCard label="Avg graduate CredScore" value={r.avgCredScoreOfGraduates} icon={Gauge} tone="success" />
        <StatCard label="Avg time-to-hire" value={r.avgTimeToHireDays} suffix="d" icon={Clock} tone="warning" />
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-600">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-content-primary">Reputation Dashboard</h3>
                <p className="mt-0.5 text-xs text-content-secondary">Your {r.cohort} cohort outcomes — yours to publish.</p>
              </div>
            </div>
            <TrustTier tier="trusted" />
          </div>

          <p className="mt-5 text-xs font-medium text-content-secondary">Placements / month</p>
          <div className="mt-3 flex items-end gap-3" style={{ height: 110 }}>
            {r.trend.map((t, i) => (
              <div key={t.month} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[11px] font-semibold tabular-nums text-content-secondary">{t.placements}</span>
                <motion.div
                  className="w-full rounded-t-md bg-brand-500"
                  initial={{ height: 0 }}
                  animate={{ height: `${(t.placements / maxP) * 80}px` }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  title={`${t.placements}`}
                />
                <span className="text-[10px] text-content-muted">{t.month}</span>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem}>
        <Card className="border-brand-300/50 bg-brand-soft">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-semibold text-content-primary">Marketing-ready quote</p>
          </div>
          <p className="mt-2 text-sm text-content-secondary">
            “Our {r.cohort} cohort: {Math.round(r.placementRate * 100)}% verified placement on CredChain.” — ready to quote.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-md border border-border-subtle bg-bg-elevated px-3 py-2.5 font-mono text-[13px] text-brand-600 dark:text-brand-300">
              {embed}
            </code>
            <Button type="button" variant="outline" size="sm" onClick={copyEmbed} leftIcon={copied ? <Check className="h-4 w-4 text-accent-500" /> : <Copy className="h-4 w-4" />}>
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
