// ─────────────────────────────────────────────────────────────
// CredChain — On-Chain Revocation Registry (System 7, Section 7)
// Danger zone. Appends ":REVOKED" to the original hash and mints a fresh
// Solana Memo as a tamper-proof revocation record. Lists credentials minted
// this session (plus a manual ID field). Students can still DISPUTE a
// revocation from their vault — this isn't the issuer's unilateral last word.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { revokeCredential } from '../../services/api';
import { shortHash } from '../../lib/format';

export default function RevocationRegistry({ issued = [], onRevoked }) {
  const [manualId, setManualId] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  async function revoke(id) {
    if (!id) return;
    const ok = window.confirm('Revoke this credential? This appends :REVOKED on-chain. The student can dispute it.');
    if (!ok) return;
    setBusyId(id);
    setMsg(null);
    try {
      const res = await revokeCredential(id);
      setMsg({ type: 'ok', text: res?.message || 'Credential revoked.' });
      if (onRevoked) onRevoked(id);
    } catch (err) {
      const status = err?.response?.status;
      setMsg({
        type: 'err',
        text: status === 403 ? 'Only the verified issuer who minted a credential can revoke it.'
          : status === 404 ? 'No credential found with that ID.'
          : status === 409 ? 'That credential is already revoked.'
          : err?.response?.data?.message || 'Revocation failed.',
      });
    } finally {
      setBusyId(null);
    }
  }

  const active = issued.filter((c) => c.status !== 'revoked');

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">
        <span>⚠</span>
        <span>Danger zone — revoking appends <code className="font-mono text-[13px]">:REVOKED</code> on-chain. Students can still dispute.</span>
      </div>

      {msg && (
        <div
          className={`mx-5 mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
            msg.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? '✓' : '✕'}</span>
          <span>{msg.text}</span>
        </div>
      )}

      <div className="divide-y divide-gray-50">
        {active.length === 0 && (
          <p className="px-5 py-6 text-center text-sm text-gray-400">Credentials you issue this session appear here for revocation.</p>
        )}
        {active.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors duration-150 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{c.title}</p>
              <p className="truncate font-mono text-[13px] text-gray-400">{shortHash(c.sha256Hash || c.id)}</p>
            </div>
            <button
              type="button"
              disabled={busyId === c.id}
              onClick={() => revoke(c.id)}
              className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 active:bg-red-100 active:scale-[0.97] disabled:opacity-50"
            >
              {busyId === c.id ? '…' : 'Revoke'}
            </button>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 px-5 py-4">
        <p className="text-xs text-gray-500">Revoke by credential ID</p>
        <div className="mt-2 flex gap-2">
          <input
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="credential _id"
            className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            onClick={() => revoke(manualId.trim())}
            disabled={!manualId.trim()}
            className="shrink-0 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 transition-all duration-150 hover:bg-red-50 active:scale-[0.97] disabled:opacity-50"
          >
            Revoke
          </button>
        </div>
      </div>
    </div>
  );
}
