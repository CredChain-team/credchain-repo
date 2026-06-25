// ─────────────────────────────────────────────────────────────
// CredChain — Issuer: mint a single credential (System 7)
// POST /api/v1/issuer/credentials (verified issuers only). The student then
// Accepts it in their queue, which anchors it on Solana. Surfaces the
// not-yet-verified 403 cleanly.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { issueVerifiedCredential } from '../../services/api';
import { shortHash } from '../../lib/format';

export default function IssueCredentialPanel({ onIssued }) {
  const [form, setForm] = useState({ title: '', recipientEmail: '', studentId: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload = { title: form.title.trim() };
      if (form.recipientEmail.trim()) payload.recipientEmail = form.recipientEmail.trim();
      if (form.studentId.trim()) payload.studentId = form.studentId.trim();
      const res = await issueVerifiedCredential(payload);
      setResult(res.credential);
      if (onIssued && res.credential) onIssued(res.credential);
      setForm({ title: '', recipientEmail: '', studentId: '' });
    } catch (err) {
      const status = err?.response?.status;
      setError(
        status === 403
          ? 'Your issuer account isn’t fully vetted yet — finish the verification funnel (and the admin Tier-4 cross-match) to mint credentials.'
          : err?.response?.data?.message || 'Could not issue the credential.'
      );
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-semibold text-gray-900">Issue a credential</h3>
      <p className="mt-1 text-xs text-gray-500">Lands in the recipient’s pending queue; they accept to anchor it on Solana.</p>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Credential title (e.g. B.Sc Computer Science)"
          className={inputClass}
        />
        <input
          value={form.recipientEmail}
          onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
          placeholder="Recipient email (links to their account)"
          className={inputClass}
        />
        <input
          value={form.studentId}
          onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
          placeholder="Student user ID (optional)"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? 'Issuing…' : 'Issue credential'}
        </button>
      </form>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in">
          <span className="mt-0.5 shrink-0">✕</span>
          <span>{error}</span>
        </div>
      )}
      {result && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 animate-fade-in">
          <span className="mt-0.5 shrink-0">✓</span>
          <span>Issued “{result.title}” — fingerprint <span className="font-mono text-[13px]">{shortHash(result.sha256Hash)}</span>. Awaiting acceptance.</span>
        </div>
      )}
    </div>
  );
}
