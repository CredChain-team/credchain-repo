/**
 * CredChain — CredScore Gauge v2
 * 270° animated SVG arc. All 4 formula components visible.
 * Academic-status aware tips. Tier chips on contributions.
 */
import { useEffect, useState } from 'react';
import {
  SCORE_MIN, SCORE_MAX, scoreBand, improvementTips,
  TIER_CONFIG, ACADEMIC_STATUS_LABEL,
} from '../../lib/credScore';

export default function CredScoreGauge({
  score, breakdown, contributions = [], academicStatus = 'in_school'
}) {
  const band     = scoreBand(score);
  const fraction = Math.max(0, Math.min(1, (score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)));

  const radius    = 78;
  const circum    = 2 * Math.PI * radius;
  const arcPortion = 0.75;
  const fullArc   = circum * arcPortion;

  const [drawn, setDrawn]           = useState(0);
  const [shownScore, setShownScore] = useState(SCORE_MIN);

  useEffect(() => {
    const t = setTimeout(() => setDrawn(fraction), 100);
    return () => clearTimeout(t);
  }, [fraction]);

  useEffect(() => {
    let raf;
    const start = performance.now();
    const from  = shownScore;
    const dur   = 1000;
    const tick  = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setShownScore(Math.round(from + (score - from) * e));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const tips = improvementTips(breakdown || {}, academicStatus);
  const bd   = breakdown || {};

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-gray-900">CredScore™</h3>
          <p className="text-[11px] text-gray-400">Evidence-only · 300–850 range</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${band.bg} ${band.text}`}>
            {band.label}
          </span>
          {academicStatus && (
            <span className="text-[10px] text-gray-400">{ACADEMIC_STATUS_LABEL[academicStatus]}</span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4">
        {/* Arc */}
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 200 200" className="h-full w-full -rotate-[135deg]">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="16"
              strokeLinecap="round" strokeDasharray={`${fullArc} ${circum}`} />
            <circle cx="100" cy="100" r={radius} fill="none" stroke={band.color} strokeWidth="16"
              strokeLinecap="round" strokeDasharray={`${fullArc * drawn} ${circum}`}
              style={{
                transition: 'stroke-dasharray 1100ms cubic-bezier(0.34,1.56,0.64,1)',
                filter: `drop-shadow(0 2px 8px ${band.color}66)`,
              }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-extrabold tracking-tighter text-gray-900"
              style={{ fontVariantNumeric: 'tabular-nums' }}>
              {shownScore}
            </span>
            <span className="text-[10px] text-gray-400">{SCORE_MIN}–{SCORE_MAX}</span>
          </div>
        </div>

        {/* Bars */}
        <div className="flex-1 space-y-2">
          <ComponentBar label="Pathway weight"  value={bd.pathwayScore   || 0} max={200} color="#818cf8"
            tip={`${bd.pathwayScore ?? 0}/200 — from your credential evidence quality`} />
          <ComponentBar label="Delivery score"  value={bd.deliveryScore  || 0} max={300} color="#22d3ee"
            tip={`${bd.deliveryScore ?? 0}/300 — each confirmed paid task = +15 pts`} />
          <ComponentBar label="Tenure bonus"    value={bd.tenureBonus    || 0} max={100} color="#34d399"
            tip={`${bd.tenureBonus ?? 0}/100 — +10 every quarter you stay active`} />
          {(bd.disputePenalty || 0) > 0 && (
            <ComponentBar label="Dispute penalty" value={bd.disputePenalty} max={200} color="#f87171"
              tip={`−${bd.disputePenalty} from disputes ruled against you`} negative />
          )}
        </div>
      </div>

      {/* Contribution tier chips */}
      {contributions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {contributions.map((c, i) => {
            const tier = TIER_CONFIG[c.tier] || TIER_CONFIG.learner;
            return (
              <span key={i}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-700">
                <span>{tier.icon}</span>
                <span className="font-medium">{tier.label}</span>
                {c.onChain && <span className="text-[10px] text-blue-500">⬡</span>}
              </span>
            );
          })}
        </div>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-blue-600 hover:text-blue-700">
          How to raise your score ▾
        </summary>
        <ul className="mt-2 space-y-1">
          {tips.map((tip, i) => (
            <li key={i} className="flex gap-2 text-[11px] text-gray-600">
              <span className="text-blue-400">→</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </details>

      <p className="mt-2 text-[10px] text-gray-400">
        Country, school name, and year of study never affect this score.
      </p>
    </div>
  );
}

function ComponentBar({ label, value, max, color, tip, negative = false }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div title={tip}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="text-[11px] font-semibold text-gray-700">{negative ? '−' : ''}{value}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}
