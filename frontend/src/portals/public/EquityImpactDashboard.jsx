// ─────────────────────────────────────────────────────────────
// CredChain — Equity Impact Dashboard (Section 5.3)
// Logged-out, public. The data-backed proof of the mission: share of hires
// from non-traditional / first-time-verified institutions, country spread of
// verified students, and issuer-diversity growth. (Mock aggregates.)
// ─────────────────────────────────────────────────────────────

import PublicLayout from './PublicLayout';
import { EQUITY_STATS } from '../../mock/data';

export default function EquityImpactDashboard() {
  const s = EQUITY_STATS;
  const maxStudents = Math.max(...s.countries.map((c) => c.students));
  const maxIssuers = Math.max(...s.issuerDiversityGrowth.map((m) => m.issuers));

  return (
    <PublicLayout fullBleed>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Equity Impact Dashboard</h1>
          <p className="mt-3 text-lg text-blue-100">Trust infrastructure that doesn’t care how famous your school is — measured, not claimed.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="mx-auto -mt-8 grid max-w-5xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
        <Big label="Verified students" value={s.verifiedStudents.toLocaleString()} />
        <Big label="Verified hires" value={s.verifiedHires.toLocaleString()} />
        <Big label="Hires from non-elite issuers" value={`${Math.round(s.nonTraditionalHireShare * 100)}%`} />
        <Big label="First-time-verified institutions" value={s.firstTimeVerifiedInstitutions} />
      </div>

      <div className="mx-auto mt-6 grid max-w-5xl gap-6 px-6 lg:grid-cols-2">
        {/* Country spread */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Verified students by country</h2>
          <div className="mt-4 space-y-2">
            {s.countries.map((c) => (
              <div key={c.code} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-sm text-gray-700">{c.flag} {c.name}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-600" style={{ width: `${(c.students / maxStudents) * 100}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs text-gray-400">{c.students.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Issuer diversity growth */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Issuer diversity growth</h2>
          <div className="mt-6 flex items-end gap-2" style={{ height: 140 }}>
            {s.issuerDiversityGrowth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[10px] text-gray-400">{m.issuers}</span>
                <div className="w-full rounded-t bg-sky-500" style={{ height: `${(m.issuers / maxIssuers) * 110}px` }} />
                <span className="text-[10px] text-gray-400">{m.month}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mx-auto mt-6 max-w-5xl px-6 pb-10">
        <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          A bootcamp in Lagos and a bootcamp in Manila go through the exact same trust framework. The architecture works for any country from day one.
        </p>
      </div>
    </PublicLayout>
  );
}

function Big({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 border-t-4 border-t-blue-600 bg-white p-5 text-center shadow-card">
      <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
    </div>
  );
}
