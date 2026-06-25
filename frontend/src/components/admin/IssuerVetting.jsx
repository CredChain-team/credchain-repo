// ─────────────────────────────────────────────────────────────
// CredChain — Admin Issuer Vetting console (Tier-4 registry cross-match)
// The final gate: issuers that reached 'identity_checked' wait here. Approving
// runs the registry cross-match → status 'active' + isVerifiedIssuer=true,
// which unlocks credential issuance. Risk flags are surfaced for judgement.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Building2, Check, X, AlertTriangle } from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '../ui';

const STATUS_TONE = {
  applied: 'neutral',
  domain_verified: 'info',
  identity_checked: 'warning',
  active: 'success',
};

export default function IssuerVetting({ issuers, onVet }) {
  const [busyId, setBusyId] = useState(null);

  async function vet(userId, matched) {
    if (!matched && !window.confirm('Reject this issuer? They will not be able to issue credentials.')) return;
    setBusyId(userId);
    try {
      await onVet(userId, matched);
    } finally {
      setBusyId(null);
    }
  }

  if (issuers.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Building2}
          title="No issuer applications yet"
          description="Applications from the onboarding funnel will appear here for vetting."
        />
      </Card>
    );
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border-subtle bg-bg-sunken text-xs uppercase tracking-wide text-content-muted">
          <tr>
            <th className="px-4 py-3 font-semibold">Issuer</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">Type · Domain</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Signals</th>
            <th className="px-4 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {issuers.map((i) => (
            <tr key={String(i.userId)} className="align-top transition-colors duration-150 hover:bg-bg-sunken">
              <td className="px-4 py-3">
                <p className="font-semibold text-content-primary">{i.name}</p>
                <p className="text-xs text-content-secondary">{i.email}</p>
              </td>
              <td className="hidden px-4 py-3 text-content-secondary sm:table-cell">
                <p className="capitalize">{i.institutionType}</p>
                <p className="text-xs text-content-muted">{i.lockedDomain || '—'}</p>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={STATUS_TONE[i.verificationStatus] || 'neutral'} variant="soft" size="sm">
                    {i.verificationStatus}
                  </Badge>
                  {i.isVerifiedIssuer && <Badge tone="success" variant="soft" size="sm" icon={<Check />}>active</Badge>}
                </div>
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <p className="text-xs text-content-secondary">KYC: {i.kycStatus}{i.domainAgeMonths != null ? ` · domain ${i.domainAgeMonths}mo` : ''}</p>
                {(i.riskFlags || []).length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {i.riskFlags.map((f) => (
                      <Badge key={f} tone="warning" variant="outline" size="sm" icon={<AlertTriangle />}>{f}</Badge>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {i.verificationStatus === 'identity_checked' ? (
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="primary" disabled={busyId === i.userId} loading={busyId === i.userId} leftIcon={<Check className="h-4 w-4" />} onClick={() => vet(i.userId, true)}>Approve</Button>
                    <Button size="sm" variant="danger" disabled={busyId === i.userId} leftIcon={<X className="h-4 w-4" />} onClick={() => vet(i.userId, false)}>Reject</Button>
                  </div>
                ) : i.isVerifiedIssuer ? (
                  <span className="text-xs font-medium text-accent-600">Verified</span>
                ) : (
                  <span className="text-xs text-content-muted">Awaiting prior tiers</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
