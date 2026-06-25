// ─────────────────────────────────────────────────────────────
// CredChain — Two-Step Approval Queue (Section 4.1)
// Incoming credentials land here. Accept hashes + writes to Solana via the
// backend; Reject drops it. The student decides what gets permanently
// anchored — "your data, your control".
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { timeAgo } from '../../lib/format';

export default function PendingQueue({ pending, onAccept, onReject }) {
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  async function act(id, fn, verb) {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fn(id);
      setFeedback({ type: 'ok', text: res?.message || `Credential ${verb}.` });
    } catch (err) {
      setFeedback({ type: 'err', text: err?.response?.data?.message || `Could not ${verb} the credential.` });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-blue-900">Pending Approval Queue</h3>
        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">{pending.length}</span>
      </div>
      <p className="-mt-3 mb-4 text-xs text-blue-700/70">Accept to anchor on Solana · Reject to discard. You control what becomes permanent.</p>

      {feedback && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm animate-fade-in ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className="mt-0.5 shrink-0">{feedback.type === 'ok' ? '✓' : '✕'}</span>
          <span>{feedback.text}</span>
        </div>
      )}

      <div className="space-y-2">
        {pending.length === 0 && (
          <p className="py-4 text-center text-sm text-blue-500">
            No pending credentials. When a verified issuer sends you one, it appears here for approval.
          </p>
        )}
        {pending.map((c) => (
          <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-card transition-shadow hover:shadow-card-hover animate-slide-up">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{c.title}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500">{c.issuer || 'Verified Issuer'} · {timeAgo(c.createdAt)}</p>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => act(c.id, onAccept, 'accepted')}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
              >
                {busyId === c.id ? '…' : 'Accept'}
              </button>
              <button
                type="button"
                disabled={busyId === c.id}
                onClick={() => act(c.id, onReject, 'rejected')}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 transition-colors duration-150 hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
