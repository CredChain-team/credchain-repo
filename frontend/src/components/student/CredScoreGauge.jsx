/**
 * CredChain — CredScore Gauge v3
 * Uses the design-system RadialScore. All 4 formula components shown as
 * mini-bars. Academic-status aware tips. Tier chips on contributions.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ArrowRight, Hexagon } from 'lucide-react';
import {
  SCORE_MIN, SCORE_MAX, scoreBand, improvementTips,
  TIER_CONFIG, ACADEMIC_STATUS_LABEL,
} from '../../lib/credScore';
import { Card, RadialScore } from '../ui';
import { fadeUp } from '../../theme/motion';

export default function CredScoreGauge({
  score, breakdown, contributions = [], academicStatus = 'in_school'
}) {
  const band = scoreBand(score);
  const [open, setOpen] = useState(false);

  const tips = improvementTips(breakdown || {}, academicStatus);
  const bd = breakdown || {};

  return (
    <Card padding="lg" className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
            <Hexagon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-content-primary">CredScore™</h3>
            <p className="text-[11px] text-content-muted">Your skill score — proof of what you can do</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className="rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ color: band.color, background: `${band.color}1f` }}
          >
            {band.label}
          </span>
          {academicStatus && (
            <span className="text-[10px] text-content-muted">{ACADEMIC_STATUS_LABEL[academicStatus]}</span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        {/* Radial with soft colored glow */}
        <div className="relative shrink-0">
          <div
            className="pointer-events-none absolute inset-3 rounded-full opacity-20 blur-2xl"
            style={{ backgroundColor: band.color }}
          />
          <RadialScore
            score={score}
            max={SCORE_MAX}
            size={172}
            stroke={15}
            label={`${SCORE_MIN}–${SCORE_MAX}`}
            sublabel={band.label}
            className="relative"
          />
        </div>

        {/* Bars */}
        <div className="w-full flex-1 space-y-3">
          <ComponentBar label="Pathway weight" value={bd.pathwayScore || 0} max={200} color="#6366F1"
            desc="from your verified-skill quality" />
          <ComponentBar label="Delivery score" value={bd.deliveryScore || 0} max={300} color="#06B6D4"
            desc="each paid task done = +15 pts" />
          <ComponentBar label="Tenure bonus" value={bd.tenureBonus || 0} max={100} color="#10B981"
            desc="+10 every 3 months you stay active" />
          {(bd.disputePenalty || 0) > 0 && (
            <ComponentBar label="Penalty" value={bd.disputePenalty} max={200} color="#F43F5E"
              desc="from disputes ruled against you" negative />
          )}
        </div>
      </div>

      {/* Contribution tier chips */}
      {contributions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {contributions.map((c, i) => {
            const tier = TIER_CONFIG[c.tier] || TIER_CONFIG.learner;
            return (
              <span key={i}
                className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-sunken px-2 py-0.5 text-[11px] text-content-secondary">
                <span>{tier.icon}</span>
                <span className="font-medium">{tier.label}</span>
                {c.onChain && <Hexagon className="h-3 w-3 text-brand-500" />}
              </span>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          How to raise my score
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <motion.ul variants={fadeUp} initial="initial" animate="animate" className="mt-2 space-y-1.5">
            {tips.map((tip, i) => (
              <li key={i} className="flex gap-2 text-[11px] text-content-secondary">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-400" />
                <span>{tip}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </div>

      <p className="mt-3 text-[10px] text-content-muted">
        Your country, school name, and year of study never change this score — only what you can do.
      </p>
    </Card>
  );
}

function ComponentBar({ label, value, max, color, desc, negative = false }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold text-content-secondary">{label}</span>
          <span className="hidden text-[10px] text-content-muted group-hover:inline">{desc}</span>
        </span>
        <span className="tabular-nums text-xs font-bold text-content-primary">
          {negative ? '−' : ''}{value}<span className="font-normal text-content-muted">/{max}</span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-sunken">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}
