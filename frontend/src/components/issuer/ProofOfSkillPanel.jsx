// ─────────────────────────────────────────────────────────────
// CredChain — Proof of Skill Auto-Issuer (Section 4.3)
// Webhook endpoints that auto-mint a credential when a hackathon project is
// merged or marked a winner (GitHub / external judging APIs). The endpoints
// are shown for integration; "Simulate winner" fires a real issuance so the
// auto-issue path is demonstrable end-to-end.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { issueVerifiedCredential } from '../../services/api';

export default function ProofOfSkillPanel({ onIssued }) {
  const [hook] = useState(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    return {
      github: `${base}/api/v1/issuer/proof/github`,
      judging: `${base}/api/v1/issuer/proof/judging`,
    };
  });
  const [project, setProject] = useState('');
  const [winnerEmail, setWinnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function copy(v) {
    if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
  }

  async function simulateWinner() {
    if (!project.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = { title: `Hackathon Winner — ${project.trim()}` };
      if (winnerEmail.trim()) payload.recipientEmail = winnerEmail.trim();
      const res = await issueVerifiedCredential(payload);
      if (onIssued && res.credential) onIssued(res.credential);
      setMsg({ type: 'ok', text: `Auto-issued “${res.credential.title}”.` });
      setProject('');
      setWinnerEmail('');
    } catch (err) {
      setMsg({
        type: 'err',
        text: err?.response?.status === 403
          ? 'Verify your issuer account to enable auto-issuance.'
          : err?.response?.data?.message || 'Auto-issue failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-gray-300 bg-white px-2.5 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <h3 className="text-sm font-semibold text-gray-900">Proof-of-Skill Auto-Issuer</h3>
      <p className="mt-1 text-xs text-gray-500">Hook these into GitHub / your judging platform to mint on merge or win.</p>

      <div className="mt-3 space-y-2">
        <WebhookRow label="GitHub merge webhook" url={hook.github} onCopy={copy} />
        <WebhookRow label="Judging API webhook" url={hook.judging} onCopy={copy} />
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-slate-50 p-3">
        <p className="text-xs font-medium text-gray-700">Simulate a winner (fires a real auto-issue)</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project / event name" className={inputClass} />
          <input value={winnerEmail} onChange={(e) => setWinnerEmail(e.target.value)} placeholder="Winner email (optional)" className={inputClass} />
        </div>
        <button
          type="button"
          onClick={simulateWinner}
          disabled={busy || !project.trim()}
          className="mt-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
        >
          {busy ? 'Issuing…' : 'Simulate winner → auto-issue'}
        </button>
        {msg && <p className={`mt-2 text-xs ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        This is the primary path for a self-taught, unaffiliated builder to earn a Verified Ledger credential — a confirmed, judged outcome is itself legitimate verification.
      </p>
    </div>
  );
}

function WebhookRow({ label, url, onCopy }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500">{label}</p>
      <div className="mt-1 flex gap-2">
        <input readOnly value={url} className="min-w-0 flex-1 truncate rounded-xl border border-gray-300 bg-slate-50 px-2.5 py-1.5 font-mono text-[13px] text-blue-700" />
        <button type="button" onClick={() => onCopy(url)} className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97]">copy</button>
      </div>
    </div>
  );
}
