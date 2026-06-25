// ─────────────────────────────────────────────────────────────
// CredChain — Instant Statement of Result ("ASUU-Bypasser") card
// The digital alternative to the 6–12-month paper transcript. The moment a
// Verified Issuer (registrar / dept head) confirms grades, the credential
// lands here with an immutable Solana stamp. We detect it from the student's
// verified ledger by title; absent one, we show what it WILL look like.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { ScrollText, Clock } from 'lucide-react';
import { shortHash } from '../../../lib/format';
import { Card, Badge } from '../../ui';
import { fadeUp } from '../../../theme/motion';

const RESULT_RE = /(statement of result|transcript|result|grade|cgpa)/i;

export default function StatementOfResultCard({ verified = [] }) {
  const result = verified.find((c) => RESULT_RE.test(c.title || ''));

  return (
    <motion.div {...fadeUp}>
      <Card className="border-accent-500/30 bg-accent-500/[0.06] transition-shadow duration-200 hover:shadow-md">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500/15 text-accent-600 dark:text-accent-400">
          <ScrollText className="h-5 w-5" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-content-primary">Instant Statement of Result</h2>
          <Badge tone="success" variant="solid" size="sm" className="uppercase tracking-wide">ASUU-Bypasser</Badge>
        </div>
        <p className="mt-0.5 text-xs text-content-secondary">🇳🇬 Nigeria · the digital transcript that doesn’t make you wait.</p>

        {result ? (
          <div className="mt-3 rounded-xl border border-border-subtle bg-bg-elevated p-4">
            <p className="text-sm font-semibold text-content-primary">{result.title}</p>
            <p className="text-xs text-content-muted">{result.issuer || 'Registrar (Verified Issuer)'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-accent-500/12 px-2.5 py-2 text-xs text-accent-600 dark:text-accent-400">
              <span className="font-medium">Immutable · Solana stamped</span>
              {(result.solanaTxSignature || result.txSignature) && (
                <span className="font-mono">{shortHash(result.solanaTxSignature || result.txSignature)}</span>
              )}
            </div>
            <p className="mt-2 text-xs text-content-muted">No 6–12 month wait — verifiable the moment grades are confirmed.</p>
          </div>
        ) : (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-dashed border-accent-500/40 bg-bg-elevated p-4 text-sm text-content-secondary">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" />
            <span>
              When your department head or registrar (a Verified Issuer) confirms your grades, your statement of result
              appears here instantly with a permanent Solana stamp — replacing the months-long paper-transcript wait.
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
