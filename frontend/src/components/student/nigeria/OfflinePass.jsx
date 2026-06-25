// ─────────────────────────────────────────────────────────────
// CredChain — Low-Data "Offline Pass" Generator
// A lightweight, text-only profile view + a mock USSD-style shortcode for
// verification on minimal data / basic networks (e.g. *347*88*MATRIC#).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

export default function OfflinePass({ user, verified = [] }) {
  const [open, setOpen] = useState(false);
  // Short numeric code derived from the credchainId for the USSD string.
  const code = (user?.credchainId || 'cc_000000').replace(/\D/g, '').slice(-6).padStart(6, '0');
  const ussd = `*347*88*${code}#`;

  const textProfile =
`CREDCHAIN VERIFY
Name: ${user?.name || '—'}
ID: ${user?.credchainId || '—'}
Verified credentials: ${verified.length}
${verified.slice(0, 5).map((c) => `- ${c.title} [${(c.solanaTxSignature || c.txSignature) ? 'on-chain' : 'verified'}]`).join('\n')}
Check: credchain / ${ussd}`;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">📶</span>
          <h2 className="text-sm font-semibold tracking-tight text-gray-900">Low-Data Offline Pass</h2>
        </div>
        <span className={`inline-block text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 animate-fade-in">
          <div>
            <p className="text-xs text-gray-500">USSD shortcode (works without data)</p>
            <p className="mt-1 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-blue-700">{ussd}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Text-only profile (SMS / basic phone)</p>
            <pre className="mt-1 overflow-auto rounded-xl border border-gray-200 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-gray-700">{textProfile}</pre>
          </div>
          <button
            type="button"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all duration-150 hover:bg-gray-50 active:scale-[0.97]"
          >
            Generate Text-Only Profile
          </button>
        </div>
      )}
    </section>
  );
}
