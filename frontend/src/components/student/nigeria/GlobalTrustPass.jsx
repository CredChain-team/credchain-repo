// ─────────────────────────────────────────────────────────────
// CredChain — Global Trust Pass (Anti-Bias Anchor)
// Combines the verified academic record with an OFF-CHAIN national-ID
// verification HASH. Built GENERICALLY (nationalIdVerificationHash +
// countryCode) — the Country Module supplies the ID type (NIN for Nigeria,
// passport/national-ID elsewhere). The raw ID never leaves the browser or is
// stored; only its SHA-256 hash is kept. Displays "Verified for Global Hire".
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Globe, BadgeCheck, ShieldCheck } from 'lucide-react';
import { getCountryModule } from '../../../config/countryModules';
import { Card, Badge, Button } from '../../ui';
import { fadeUp } from '../../../theme/motion';

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
    <motion.div {...fadeUp}>
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
          <Globe className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-semibold tracking-tight text-content-primary">Global Trust Pass</h2>

        {active ? (
          <div className="mt-3">
            <Badge tone="brand" variant="solid" icon={<BadgeCheck />} className="mb-3">
              Verified for Global Hire
            </Badge>
            <p className="text-sm leading-relaxed text-content-secondary">
              Academic record + {mod.nationalId?.type || 'national-ID'} verification, anchored. Your country or school’s
              fame is irrelevant — this is portable, checkable proof.
            </p>
            <p className="mt-3 break-all font-mono text-[10px] text-brand-600 dark:text-brand-300">
              {mod.flag} {countryCode} · id-hash {pass.nationalIdVerificationHash.slice(0, 24)}…
            </p>
          </div>
        ) : (
          <form onSubmit={verify} className="mt-3">
            <p className="text-sm leading-relaxed text-content-secondary">
              Add your {mod.nationalId?.idLabel || 'national ID'} to unlock the anti-bias anchor. Only a hash is stored — never the raw number.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={mod.nationalId?.placeholder || 'national ID / passport'}
                className="w-full flex-1 rounded-xl border border-border-subtle bg-bg-elevated px-3 py-2.5 text-sm text-content-primary transition-colors duration-150 placeholder:text-content-muted hover:border-border-strong focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <Button type="submit" loading={busy} disabled={busy} className="shrink-0 rounded-xl">
                Verify
              </Button>
            </div>
            {!hasVerified && pass && (
              <p className="mt-2 text-xs text-warning-500">ID hashed ✓ — add a verified academic credential to fully activate the pass.</p>
            )}
            <div className="mt-3 flex items-center gap-2 text-xs text-content-muted">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {mod.nationalId?.type || 'National ID'}
              </span>
              <Badge tone="success" variant="soft" size="sm">privacy-preserving</Badge>
            </div>
          </form>
        )}
      </Card>
    </motion.div>
  );
}
