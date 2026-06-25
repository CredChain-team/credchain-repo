// ─────────────────────────────────────────────────────────────
// CredChain — Low-Data "Offline Pass" Generator
// A lightweight, text-only profile view + a mock USSD-style shortcode for
// verification on minimal data / basic networks (e.g. *347*88*MATRIC#).
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SignalLow, ChevronDown } from 'lucide-react';
import { Card, Button } from '../../ui';
import { fadeUp } from '../../../theme/motion';

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
    <motion.div {...fadeUp}>
      <Card>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-sunken text-content-secondary">
              <SignalLow className="h-5 w-5" />
            </span>
            <h2 className="text-sm font-semibold tracking-tight text-content-primary">Low-Data Offline Pass</h2>
          </div>
          <ChevronDown className={`h-5 w-5 text-content-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-content-muted">USSD shortcode (works without data)</p>
                  <p className="mt-1 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">{ussd}</p>
                </div>
                <div>
                  <p className="text-xs text-content-muted">Text-only profile (SMS / basic phone)</p>
                  <pre className="mt-1 overflow-auto rounded-xl border border-border-subtle bg-bg-sunken p-3 font-mono text-[13px] leading-relaxed text-content-secondary">{textProfile}</pre>
                </div>
                <Button type="button" variant="secondary" fullWidth className="rounded-xl">
                  Generate Text-Only Profile
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
