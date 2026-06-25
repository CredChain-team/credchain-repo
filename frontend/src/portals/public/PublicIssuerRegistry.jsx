// ─────────────────────────────────────────────────────────────
// CredChain — Public Issuer Registry (Section 5.2)
// Logged-out, browsable. Anyone — a skeptical employer, a worried parent, a
// journalist — can check whether an institution is actually verified on
// CredChain and at what trust tier. (Mock list per Execution Plan step 4.)
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import PublicLayout from './PublicLayout';
import { PUBLIC_ISSUERS } from '../../mock/data';

const TIER_STYLE = {
  'T2 · Verified': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'T3 · Trusted': 'bg-emerald-50 text-emerald-800 border-emerald-300',
  'T1 · Provisional': 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function PublicIssuerRegistry() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PUBLIC_ISSUERS;
    return PUBLIC_ISSUERS.filter((i) =>
      [i.name, i.type, i.country, i.tier].join(' ').toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <PublicLayout fullBleed>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-700 py-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative px-4">
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Public Issuer Registry</h1>
          <p className="mt-3 text-lg text-blue-100">Every verified issuer and its current trust tier. No account needed.</p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, type, country…"
              className="w-full rounded-2xl border border-transparent bg-white px-5 py-3.5 text-sm text-gray-900 shadow-lg transition-all duration-150 placeholder:text-gray-400 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Issuer grid */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((i) => (
          <article
            key={i.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold tracking-tight text-gray-900">{i.name}</p>
                <p className="mt-0.5 text-xs text-gray-500">{i.type} · {i.country}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_STYLE[i.tier] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                {i.tier}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{i.issued.toLocaleString()}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Issued</p>
              </div>
              <div>
                <p className={`text-sm font-semibold ${i.disputesUpheld === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{i.disputesUpheld}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">Disputes upheld</p>
              </div>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-14 text-center animate-fade-in">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🔍</div>
            <p className="font-semibold tracking-tight text-gray-900">No issuers match “{q}”</p>
            <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">Try a different name, type, or country.</p>
          </div>
        )}
      </div>
      <p className="mx-auto max-w-6xl px-6 pb-10 text-xs text-gray-500">
        Trust tiers are earned over a clean track record — no upheld disputes, consistent issuance, positive outcomes. Fame is not a factor.
      </p>
    </PublicLayout>
  );
}
