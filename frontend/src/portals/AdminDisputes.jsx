// ─────────────────────────────────────────────────────────────
// CredChain — Platform-Admin Dispute Review Queue (Section 5.1)
// The INDEPENDENT check: disputes land here, not back with the issuer who
// revoked. Admin reinstates (revocation was wrong) or upholds the revocation.
// API is gated to ADMIN_EMAILS; non-admins see a clear notice.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import PortalLayout from './PortalLayout';
import { listDisputes, resolveDispute } from '../services/api';
import { timeAgo } from '../lib/format';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | forbidden | error
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const data = await listDisputes();
      setDisputes(data?.disputes || []);
      setState('ready');
    } catch (err) {
      setState(err?.response?.status === 403 ? 'forbidden' : 'error');
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id, decision) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await resolveDispute(id, decision);
      setMsg({ type: 'ok', text: res?.message || 'Resolved.' });
      setDisputes((prev) => prev.filter((d) => String(d.id) !== String(id)));
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Could not resolve.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalLayout title="Dispute Review Queue" subtitle="Independent platform-admin review — not the issuer who revoked.">
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Loading queue…</span>
        </div>
      )}
      {state === 'forbidden' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm leading-relaxed text-amber-800">
          This queue is restricted to platform admins (the <code className="font-mono text-[13px]">ADMIN_EMAILS</code> allowlist). Sign in with an admin account to review disputes.
        </div>
      )}
      {state === 'error' && <p className="text-red-600">Failed to load the dispute queue.</p>}

      {state === 'ready' && (
        <>
          {msg && (
            <div
              className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
                msg.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? '✓' : '✕'}</span>
              <span>{msg.text}</span>
            </div>
          )}
          {disputes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🎉</div>
              <p className="font-semibold tracking-tight text-gray-900">No disputes awaiting review</p>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">The queue is clear. New disputes will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div key={d.id} className="rounded-xl border border-gray-200 border-l-4 border-l-amber-400 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
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
          )}
        </>
      )}
    </PortalLayout>
  );
}
