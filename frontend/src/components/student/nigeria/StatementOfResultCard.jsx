// ─────────────────────────────────────────────────────────────
// CredChain — Instant Statement of Result ("ASUU-Bypasser") card
// The digital alternative to the 6–12-month paper transcript. The moment a
// Verified Issuer (registrar / dept head) confirms grades, the credential
// lands here with an immutable Solana stamp. We detect it from the student's
// verified ledger by title; absent one, we show what it WILL look like.
// ─────────────────────────────────────────────────────────────

import { shortHash } from '../../../lib/format';

const RESULT_RE = /(statement of result|transcript|result|grade|cgpa)/i;

export default function StatementOfResultCard({ verified = [] }) {
  const result = verified.find((c) => RESULT_RE.test(c.title || ''));

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 transition-shadow duration-200 hover:shadow-md">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-xl">📜</div>
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-emerald-900">Instant Statement of Result</h2>
        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">ASUU-Bypasser</span>
      </div>
      <p className="mt-0.5 text-xs text-emerald-700">🇳🇬 Nigeria · the digital transcript that doesn’t make you wait.</p>

      {result ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4">
          <p className="text-sm font-semibold text-gray-900">{result.title}</p>
          <p className="text-xs text-gray-500">{result.issuer || 'Registrar (Verified Issuer)'}</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-100 px-2.5 py-2 text-xs text-emerald-700">
            <span className="font-medium">Immutable · Solana stamped</span>
            {(result.solanaTxSignature || result.txSignature) && (
              <span className="font-mono text-emerald-700">{shortHash(result.solanaTxSignature || result.txSignature)}</span>
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">No 6–12 month wait — verifiable the moment grades are confirmed.</p>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-emerald-300 bg-white p-4 text-sm text-gray-600">
          When your department head or registrar (a Verified Issuer) confirms your grades, your statement of result
          appears here instantly with a permanent Solana stamp — replacing the months-long paper-transcript wait.
        </div>
      )}
    </section>
  );
}
