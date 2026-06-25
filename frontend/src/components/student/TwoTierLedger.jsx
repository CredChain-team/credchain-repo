// ─────────────────────────────────────────────────────────────
// CredChain — Two-Tier Trust ledgers (Section 4.1)
// Verified Ledger (issuer-anchored, incl. revoked/disputed) on top; the
// honestly-labelled Sandbox Ledger (self-asserted skills) below, visually
// distinguished. Never presented as equal trust weight.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import LedgerCard from './LedgerCard';

export default function TwoTierLedger({ verified, revoked, sandbox, onViewProof, onDispute, onAddSandbox }) {
  const [form, setForm] = useState({ skillName: '', source: 'Self-taught', link: '' });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);

  // Verified ledger shows accepted + revoked together so the audit trail and
  // dispute path are visible (revoked isn't hidden — transparency).
  const ledger = [...verified, ...revoked];

  async function submitSandbox(e) {
    e.preventDefault();
    if (!form.skillName.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      await onAddSandbox(form);
      setForm({ skillName: '', source: 'Self-taught', link: '' });
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not add skill.');
    } finally {
      setAdding(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-5">
      {/* Verified */}
      <section>
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">Verified Ledger</h2>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">{ledger.length}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Issuer-vouched, anchored to Solana. Full lifecycle shown.</p>
        <div className="mt-3 space-y-3">
          {ledger.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🏦</div>
              <p className="font-semibold tracking-tight text-gray-900">No verified credentials yet</p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">Accept a credential from your pending queue to populate your Verified Ledger.</p>
            </div>
          )}
          {ledger.map((c) => (
            <LedgerCard
              key={c.id}
              credential={c}
              onViewProof={onViewProof}
              onDispute={onDispute}
            />
          ))}
        </div>
      </section>

      {/* Sandbox */}
      <section className="mt-2 rounded-2xl border border-dashed border-gray-200 bg-slate-50/80 p-4">
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">Sandbox</h2>
          <span className="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">{sandbox.length}</span>
        </div>
        <p className="mt-1 text-xs text-gray-500">Self-asserted — honestly labelled, never disguised as verified.</p>

        <div className="mt-3 space-y-2">
          {sandbox.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-3 shadow-card">
              <p className="text-sm font-medium text-gray-900">{s.skillName}</p>
              <p className="mt-0.5 text-xs text-gray-500">{s.source}{s.link ? ` · ${s.link}` : ''}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submitSandbox} className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-600">Add a self-taught skill / project</p>
          <input
            value={form.skillName}
            onChange={(e) => setForm((f) => ({ ...f, skillName: e.target.value }))}
            placeholder="e.g. Rust, or 'Personal project: ledger-db'"
            className={inputClass}
          />
          <div className="flex gap-2">
            <select
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              className="rounded-xl border border-gray-300 bg-white px-2 py-2.5 text-sm text-gray-900 transition-all duration-150 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option>Self-taught</option>
              <option>GitHub</option>
              <option>Coursera</option>
              <option>YouTube</option>
              <option>Other</option>
            </select>
            <input
              value={form.link}
              onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="link (optional)"
              className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97] disabled:opacity-50"
            >
              {adding ? '…' : 'Add'}
            </button>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
        </form>
      </section>
    </div>
  );
}
