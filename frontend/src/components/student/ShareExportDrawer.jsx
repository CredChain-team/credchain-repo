// ─────────────────────────────────────────────────────────────
// CredChain — Portable Share & Export drawer (Section 4.1)
//   • Copyable public verification link  (/verify/student/:credchainId)
//   • Mock QR code (deterministic grid — no external service / dependency)
//   • One-click LinkedIn export (pre-fills "Licenses & Certifications")
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

// Deterministic 21×21 "QR-like" grid from a string — a believable mock.
function MockQR({ value, size = 132 }) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = 21;
  const cell = size / n;
  const rects = [];
  let state = h >>> 0;
  const next = () => {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      const finder =
        (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
      const on = finder
        ? !((x === 0 || x === 6 || y === 0 || y === 6) === false && !(x >= 2 && x <= 4 && y >= 2 && y <= 4))
        : next() > 0.55;
      if (on) rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#1e3a8a" />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white p-1">
      {rects}
    </svg>
  );
}

export default function ShareExportDrawer({ user, verified = [] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/verify/student/${user?.credchainId || ''}`;

  function copy() {
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  function linkedInExport(c) {
    // LinkedIn "Add licenses & certifications" deep link, pre-filled.
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: c.title,
      organizationName: c.issuer || 'CredChain Verified Issuer',
      certUrl: link,
      certId: c.id || '',
    });
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank', 'noopener');
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Share &amp; Export</h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition-colors duration-150 hover:bg-blue-50"
        >
          <span className={`inline-block transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>⌄</span>
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4 animate-fade-in">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Public verification link</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="min-w-0 flex-1 cursor-default select-all truncate rounded-xl border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm text-gray-900"
              />
              <button
                type="button"
                onClick={copy}
                className="shrink-0 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97]"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">Scan at a career fair (Magic Link / Digital Trust Wallet):</p>
            <div className="mt-2 flex items-center justify-center rounded-xl border border-gray-200 bg-slate-50 p-6">
              <MockQR value={link} />
            </div>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">One-click LinkedIn export</p>
            <p className="mt-1 text-xs text-gray-500">Pre-fills LinkedIn’s “Licenses &amp; Certifications”.</p>
            <div className="mt-2 space-y-2">
              {verified.length === 0 && <p className="text-sm text-gray-400">No verified credentials to export yet.</p>}
              {verified.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => linkedInExport(c)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl bg-[#0A66C2] px-4 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#004182] active:bg-[#003177] active:scale-[0.98]"
                >
                  <span className="truncate">{c.title}</span>
                  <span className="ml-2 shrink-0">in ↗</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
