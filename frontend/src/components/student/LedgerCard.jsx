// ─────────────────────────────────────────────────────────────
// CredChain — Verified Ledger credential card
// Shows the live SVG badge, the full lifecycle audit trail (issued →
// accepted → revoked → disputed → resolved), a "View On-Chain Proof" button,
// and — when a credential is revoked — the student's "Dispute" appeal control
// (Section 5.1). Dispute state comes from the backend (credential.dispute).
// ─────────────────────────────────────────────────────────────

import { badgeUrl } from '../../services/api';
import { timeAgo } from '../../lib/format';

const STATUS_STYLE = {
  accepted: { ring: 'border-emerald-200', pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200', label: '✓ Verified' },
  revoked: { ring: 'border-red-200', pill: 'bg-red-50 text-red-700 border border-red-200', label: '✕ Revoked' },
  under_review: { ring: 'border-amber-200', pill: 'bg-amber-50 text-amber-700 border border-amber-200', label: '⏳ Under Review' },
};

export default function LedgerCard({ credential, onViewProof, onDispute }) {
  const dispute = credential.dispute || null;
  const underReview = dispute?.status === 'under_review';
  const effectiveStatus = underReview ? 'under_review' : credential.status;
  const style = STATUS_STYLE[effectiveStatus] || STATUS_STYLE.accepted;
  const onChain = Boolean(credential.solanaTxSignature || credential.txSignature);

  // Build the lifecycle trail.
  const trail = [{ label: 'Issued', at: credential.createdAt, done: true }];
  if (['accepted', 'revoked'].includes(credential.status) || dispute) {
    trail.push({ label: 'Accepted · anchored', at: credential.createdAt, done: true });
  }
  if (credential.status === 'revoked') {
    trail.push({ label: 'Revoked by issuer', at: credential.revokedAt, done: true, danger: true });
  }
  if (underReview) {
    trail.push({ label: 'Disputed → independent platform review', at: dispute.filedAt, done: true, warn: true });
  }
  if (dispute?.status === 'resolved_reinstated') {
    trail.push({ label: 'Dispute upheld → reinstated', at: dispute.resolvedAt, done: true });
  }
  if (dispute?.status === 'resolved_upheld') {
    trail.push({ label: 'Reviewed → revocation upheld', at: dispute.resolvedAt, done: true, danger: true });
  }

  const canDispute = credential.status === 'revoked' && (!dispute || dispute.status === 'none');

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover ${style.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-gray-900">{credential.title}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">{credential.issuer || 'Verified Issuer'}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.pill}`}>{style.label}</span>
      </div>

      <div className="mt-2">
        <img src={badgeUrl(credential.id)} alt="Live verification badge" className="h-6" />
      </div>

      <ol className="mt-3 space-y-2 border-l-2 border-gray-100 pl-3 text-xs">
        {trail.map((step, i) => (
          <li key={i} className="relative">
            <span className={`absolute -ml-[17px] mt-1 h-2 w-2 rounded-full ${step.danger ? 'bg-red-400' : step.warn ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-gray-700">{step.label}</span>
            {step.at && <span className="ml-1 text-[10px] text-gray-400">· {timeAgo(step.at)}</span>}
          </li>
        ))}
      </ol>

      {underReview && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <span className="shrink-0">⏳</span>
          <span>Frozen pending an independent platform-admin decision — not the issuer who revoked it.</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onViewProof(credential)}
          className="rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition-colors duration-150 hover:bg-blue-50 active:bg-blue-100"
        >
          View On-Chain Proof
        </button>
        {onChain && <span className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">On Solana ✓</span>}
        {canDispute && (
          <button
            type="button"
            onClick={() => onDispute(credential)}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-red-700 active:scale-[0.97] active:bg-red-800"
          >
            Dispute
          </button>
        )}
      </div>
    </div>
  );
}
