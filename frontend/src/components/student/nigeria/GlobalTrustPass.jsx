// ─────────────────────────────────────────────────────────────
// CredChain — Global Trust Pass (Anti-Bias Anchor)
// Combines the verified academic record with an OFF-CHAIN national-ID
// verification HASH. Built GENERICALLY (nationalIdVerificationHash +
// countryCode) — the Country Module supplies the ID type (NIN for Nigeria,
// passport/national-ID elsewhere). The raw ID never leaves the browser or is
// stored; only its SHA-256 hash is kept. Displays "Verified for Global Hire".
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { getCountryModule } from '../../../config/countryModules';

const KEY = 'credchain_trustpass';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function GlobalTrustPass({ countryCode = 'NG', hasVerified }) {
  const mod = getCountryModule(countryCode);
  const [raw, setRaw] = useState('');
  const [pass, setPass] = useState(null); // { nationalIdVerificationHash, countryCode, at }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && saved.countryCode === countryCode) setPass(saved);
    } catch { /* ignore */ }
  }, [countryCode]);

  async function verify(e) {
    e.preventDefault();
    if (!raw.trim()) return;
    setBusy(true);
    try {
      const hash = await sha256Hex(`${countryCode}:${raw.trim()}`);
      const record = { nationalIdVerificationHash: hash, countryCode, at: new Date().toISOString() };
      try { localStorage.setItem(KEY, JSON.stringify(record)); } catch { /* ignore */ }
      setPass(record);
      setRaw(''); // never retain the raw id
    } finally {
      setBusy(false);
    }
  }

  const active = pass && hasVerified;

  return (
    <section className="rounded-2xl border border-blue-200 bg-white p-5 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">🌍</div>
      <h2 className="text-sm font-semibold tracking-tight text-gray-900">Global Trust Pass</h2>

      {active ? (
        <div className="mt-3">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
            ✓ Verified for Global Hire
          </span>
          <p className="text-sm leading-relaxed text-gray-600">
            Academic record + {mod.nationalId?.type || 'national-ID'} verification, anchored. Your country or school’s
            fame is irrelevant — this is portable, checkable proof.
          </p>
          <p className="mt-3 break-all font-mono text-[10px] text-blue-600">
            {mod.flag} {countryCode} · id-hash {pass.nationalIdVerificationHash.slice(0, 24)}…
          </p>
        </div>
      ) : (
        <form onSubmit={verify} className="mt-3">
          <p className="text-sm leading-relaxed text-gray-600">
            Add your {mod.nationalId?.idLabel || 'national ID'} to unlock the anti-bias anchor. Only a hash is stored — never the raw number.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder={mod.nationalId?.placeholder || 'national ID / passport'}
              className="w-full flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-all duration-150 placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={busy}
              className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? '…' : 'Verify'}
            </button>
          </div>
          {!hasVerified && pass && (
            <p className="mt-2 text-xs text-amber-600">ID hashed ✓ — add a verified academic credential to fully activate the pass.</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            {mod.nationalId?.type || 'National ID'}
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">privacy-preserving</span>
          </div>
        </form>
      )}
    </section>
  );
}
