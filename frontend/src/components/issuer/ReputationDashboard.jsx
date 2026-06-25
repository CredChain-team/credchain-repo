// ─────────────────────────────────────────────────────────────
// CredChain — Issuer Reputation Dashboard (Section 4.3)
// Outcome data the issuer can market with ("Our 2026 cohort: 85% verified
// placement"). Drives institutional adoption — value back, not just admin
// overhead. Mock aggregates for the demo (Execution Plan step 4).
// ─────────────────────────────────────────────────────────────

import { ISSUER_REPUTATION } from '../../mock/data';

export default function ReputationDashboard() {
  const r = ISSUER_REPUTATION;
  const maxP = Math.max(...r.trend.map((t) => t.placements));

  return (
    <div>
      <div className="grid grid-cols-3 gap-4">
        <Metric label="Verified placement" value={`${Math.round(r.placementRate * 100)}%`} accent="border-blue-600" />
        <Metric label="Avg graduate CredScore" value={r.avgCredScoreOfGraduates} accent="border-emerald-500" />
        <Metric label="Avg time-to-hire" value={`${r.avgTimeToHireDays}d`} accent="border-amber-500" />
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
        <h3 className="text-sm font-semibold text-gray-900">Reputation Dashboard</h3>
        <p className="mt-0.5 text-xs text-gray-500">Your {r.cohort} cohort outcomes — yours to publish.</p>

        <p className="mt-4 text-xs text-gray-500">Placements / month</p>
        <div className="mt-2 flex items-end gap-2" style={{ height: 90 }}>
          {r.trend.map((t) => (
            <div key={t.month} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-blue-500" style={{ height: `${(t.placements / maxP) * 70}px` }} title={`${t.placements}`} />
              <span className="text-[10px] text-gray-400">{t.month}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-sm text-blue-800">
          “Our {r.cohort} cohort: {Math.round(r.placementRate * 100)}% verified placement on CredChain.” — ready to quote.
        </p>
        <div className="mt-3 break-all rounded-xl border border-blue-200 bg-white p-3 font-mono text-[13px] leading-relaxed text-blue-700">
          &lt;a href="https://credchain.io/registry"&gt;Verified on CredChain — {Math.round(r.placementRate * 100)}% placement&lt;/a&gt;
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div className={`rounded-2xl border border-gray-200 border-t-4 ${accent} bg-white p-5 shadow-sm`}>
      <p className="mt-3 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}
