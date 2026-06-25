// ─────────────────────────────────────────────────────────────
// CredChain — Portable Share & Export drawer (Section 4.1)
//   • Copyable public verification link  (/verify/student/:credchainId)
//   • Mock QR code (deterministic grid — no external service / dependency)
//   • One-click LinkedIn export (pre-fills "Licenses & Certifications")
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Copy, Check, ExternalLink, QrCode } from 'lucide-react';
import { Card, Button, EmptyState } from '../ui';

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
      if (on) rects.push(<rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#4F46E5" />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-md bg-white p-1">
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
    <Card padding="lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-content-primary">Share &amp; Export</h3>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-md p-2 text-content-secondary transition-colors hover:bg-bg-sunken hover:text-content-primary"
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-5 border-t border-border-subtle pt-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-content-muted">Public verification link</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className="min-w-0 flex-1 cursor-default select-all truncate rounded-md border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm text-content-primary"
                  />
                  <Button
                    size="sm"
                    onClick={copy}
                    variant={copied ? 'success' : 'primary'}
                    leftIcon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-content-secondary">
                  <QrCode className="h-3.5 w-3.5" /> Scan at a career fair (Magic Link / Digital Trust Wallet):
                </p>
                <div className="mt-2 flex items-center justify-center rounded-md border border-border-subtle bg-bg-sunken p-6">
                  <MockQR value={link} />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-content-muted">One-click LinkedIn export</p>
                <p className="mt-1 text-xs text-content-secondary">Pre-fills LinkedIn’s “Licenses &amp; Certifications”.</p>
                <div className="mt-2 space-y-2">
                  {verified.length === 0 ? (
                    <EmptyState
                      title="No credentials to export yet"
                      description="Verified credentials will appear here, ready to push to LinkedIn."
                    />
                  ) : (
                    verified.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => linkedInExport(c)}
                        className="flex w-full items-center justify-between gap-2 rounded-md bg-[#0A66C2] px-4 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-[#004182] active:scale-[0.98]"
                      >
                        <span className="truncate">{c.title}</span>
                        <ExternalLink className="ml-2 h-4 w-4 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
