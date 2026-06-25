// ─────────────────────────────────────────────────────────────
// CredChain — Admin Dispute Review Queue (Section 5.1)
// The independent check: reinstate (revocation was wrong) or uphold it.
// Presentational — data + handlers come from the AdminPanel.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { timeAgo } from '../../lib/format';

export default function DisputeQueue({ disputes, onResolve }) {
  const [busyId, setBusyId] = useState(null);

  async function resolve(id, decision) {
    setBusyId(id);
    try {
      await onResolve(id, decision);
    } finally {
      setBusyId(null);
    }
  }

  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🎉</div>
        <p className="font-semibold tracking-tight text-gray-900">No disputes awaiting review</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">The queue is clear. New disputes will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disputes.map((d) => (
        <div key={String(d.id)} className="rounded-xl border border-gray-200 border-l-4 border-l-amber-400 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold tracking-tight text-gray-900">{d.title}</p>
              <p className="text-xs text-gray-500">Issued by {d.issuer} · disputed by {d.student}</p>
            </div>
            <span className="text-xs text-gray-400">{timeAgo(d.filedAt)}</span>
          </div>
          <p className="mt-2 rounded-lg border border-gray-200 bg-slate-50 px-3 py-2 text-sm text-gray-700">“{d.reason}”</p>
          <div className="mt-3 flex gap-2">
            <button type="button" disabled={busyId === d.id} onClick={() => resolve(d.id, 'reinstate')} className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50">
              Reinstate credential
            </button>
            <button type="button" disabled={busyId === d.id} onClick={() => resolve(d.id, 'uphold')} className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-700 active:scale-[0.97] disabled:opacity-50">
              Uphold revocation
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
