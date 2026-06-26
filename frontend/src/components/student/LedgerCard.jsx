// ─────────────────────────────────────────────────────────────
// CredChain — Verified Ledger credential card
// Shows the live SVG badge, the full lifecycle audit trail (issued →
// accepted → revoked → disputed → resolved), a "View On-Chain Proof" button,
// and — when a credential is revoked — the student's "Dispute" appeal control
// (Section 5.1). Dispute state comes from the backend (credential.dispute).
// ─────────────────────────────────────────────────────────────

import { CheckCircle2, XCircle, Clock, Hexagon, ExternalLink } from 'lucide-react';
import { badgeUrl } from '../../services/api';
import { timeAgo } from '../../lib/format';
import { Card, Badge, Button } from '../ui';

const STATUS_STYLE = {
  accepted: { tone: 'success', label: 'Verified', icon: CheckCircle2 },
  revoked: { tone: 'danger', label: 'Removed', icon: XCircle },
  under_review: { tone: 'warning', label: 'Being reviewed', icon: Clock },
};

export default function LedgerCard({ credential, onViewProof, onDispute }) {
  const dispute = credential.dispute || null;
  const underReview = dispute?.status === 'under_review';
  const effectiveStatus = underReview ? 'under_review' : credential.status;
  const style = STATUS_STYLE[effectiveStatus] || STATUS_STYLE.accepted;
  const StatusIcon = style.icon;
  const onChain = Boolean(credential.solanaTxSignature || credential.txSignature);

  // Build the lifecycle trail.
  const trail = [{ label: 'Sent to you', at: credential.createdAt, done: true }];
  if (['accepted', 'revoked'].includes(credential.status) || dispute) {
    trail.push({ label: 'Accepted · verified & locked in', at: credential.createdAt, done: true });
  }
  if (credential.status === 'revoked') {
    trail.push({ label: 'Removed by the issuer', at: credential.revokedAt, done: true, danger: true });
  }
  if (underReview) {
    trail.push({ label: 'You asked CredChain to take another look', at: dispute.filedAt, done: true, warn: true });
  }
  if (dispute?.status === 'resolved_reinstated') {
    trail.push({ label: 'You were right → put back', at: dispute.resolvedAt, done: true });
  }
  if (dispute?.status === 'resolved_upheld') {
    trail.push({ label: 'Reviewed → stays removed', at: dispute.resolvedAt, done: true, danger: true });
  }

  const canDispute = credential.status === 'revoked' && (!dispute || dispute.status === 'none');

  return (
    <Card interactive padding="md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-content-primary">{credential.title}</p>
          <p className="mt-0.5 truncate text-xs text-content-muted">{credential.issuer || 'Verified issuer'}</p>
        </div>
        <Badge tone={style.tone} variant="soft" size="sm" icon={<StatusIcon />} className="shrink-0">
          {style.label}
        </Badge>
      </div>

      <div className="mt-3 inline-flex rounded-lg bg-bg-sunken px-2.5 py-1.5">
        <img src={badgeUrl(credential.id)} alt="Verified badge" className="h-6" />
      </div>

      <ol className="mt-3 space-y-2 border-l-2 border-border-subtle pl-3 text-xs">
        {trail.map((step, i) => (
          <li key={i} className="relative">
            <span className={`absolute -ml-[17px] mt-1 h-2 w-2 rounded-full ${step.danger ? 'bg-danger-500' : step.warn ? 'bg-warning-500' : 'bg-accent-500'}`} />
            <span className="text-content-secondary">{step.label}</span>
            {step.at && <span className="ml-1 text-[10px] text-content-muted">· {timeAgo(step.at)}</span>}
          </li>
        ))}
      </ol>

      {underReview && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning-500/30 bg-warning-500/10 px-3 py-2 text-xs text-warning-500">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>On hold while an independent CredChain reviewer decides — not the issuer who removed it.</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onViewProof(credential)} rightIcon={<ExternalLink className="h-3.5 w-3.5" />}>
          See the proof
        </Button>
        {onChain && (
          <Badge tone="brand" variant="soft" size="sm" icon={<Hexagon />}>Locked in</Badge>
        )}
        {canDispute && (
          <Button variant="danger" size="sm" onClick={() => onDispute(credential)}>
            This is wrong
          </Button>
        )}
      </div>
    </Card>
  );
}
