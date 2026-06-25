// ─────────────────────────────────────────────────────────────
// CredChain — Trust-First Talent Feed (Section 4.2)
// Real students from /api/v1/employer/talent-feed. CredScore is computed
// client-side from verifiable evidence only (no bias proxies). "Hide
// Unverified" drops sandbox claims; "Who Issued This?" chips link to the
// Public Issuer Registry; per-candidate Verification Report export.
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { computeCredScore } from '../../lib/credScore';
import { downloadJson, printReport } from '../../lib/verificationReport';

function reportCandidate(student, score) {
  return {
    id: student.id,
    name: student.name,
    country: '',
    credScore: score,
    globalTrustPass: false,
    verified: (student.verified || []).map((v) => ({ title: v.title, issuer: v.issuer, tier: 'Verified issuer', onChain: v.onChain })),
    sandbox: student.sandbox || [],
  };
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

export default function TalentFeed({ students, hideUnverified, onToggleHide, onMessage, employerName, loading }) {
  return (
    <section>
      {/* Filter bar */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-card">
          <button
            type="button"
            onClick={onToggleHide}
            aria-pressed={hideUnverified}
            className={`relative inline-flex h-6 w-10 cursor-pointer rounded-full transition-colors duration-200 ${hideUnverified ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${hideUnverified ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-gray-900">Hide unverified skills</span>
        </div>
      </div>
      {hideUnverified && (
        <p className="-mt-2 mb-4 text-xs text-blue-600">Strict mode: showing only issuer-backed, Solana-anchored credentials.</p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading candidates…</span>
        </div>
      )}
      {!loading && students.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">👥</div>
          <p className="font-semibold tracking-tight text-gray-900">No candidates yet</p>
          <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">No students with verifiable credentials yet. Check back soon.</p>
        </div>
      )}

      <div className="space-y-4">
        {students.map((s) => {
          const { score } = computeCredScore(s.verified);
          return (
            <article
              key={s.id}
              className="group cursor-pointer rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-lg font-bold text-blue-700">
                    {initials(s.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight text-gray-900">{s.name}</p>
                    <p className="mt-0.5 font-mono text-[13px] text-gray-400">{s.credchainId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold tracking-tight text-blue-600">{score}</p>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">CredScore</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.verified.length === 0 && <p className="text-xs text-gray-400">No verified credentials yet.</p>}
                {s.verified.map((v) => (
                  <span key={v.id} className="inline-flex items-center gap-1.5">
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      ✓ {v.title}{v.onChain && <span className="ml-1 text-[10px]">on-chain</span>}
                    </span>
                    <Link
                      to="/registry"
                      title="Who issued this? View the Public Issuer Registry"
                      className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700 opacity-0 transition-opacity duration-150 hover:bg-blue-100 group-hover:opacity-100"
                    >
                      {v.issuer} ↗
                    </Link>
                  </span>
                ))}
              </div>

              {!hideUnverified && s.sandbox?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.sandbox.map((skill, i) => (
                    <span key={i} className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-[10px] text-gray-600">⚗ {skill}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onMessage(s, s.verified[0])}
                  className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97]"
                >
                  Message (1 credit)
                </button>
                <button
                  type="button"
                  onClick={() => printReport(reportCandidate(s, score), employerName)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97]"
                >
                  Export report (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => downloadJson(reportCandidate(s, score), employerName)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97]"
                >
                  JSON
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
