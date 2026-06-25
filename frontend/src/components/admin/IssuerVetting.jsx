// ─────────────────────────────────────────────────────────────
// CredChain — Admin Issuer Vetting console (Tier-4 registry cross-match)
// The final gate: issuers that reached 'identity_checked' wait here. Approving
// runs the registry cross-match → status 'active' + isVerifiedIssuer=true,
// which unlocks credential issuance. Risk flags are surfaced for judgement.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';

const STATUS_STYLE = {
  applied: 'bg-gray-100 text-gray-600 border-gray-200',
  domain_verified: 'bg-blue-50 text-blue-700 border-blue-200',
  identity_checked: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
      <div className="flex flex-col items-center justify-center py-14 text-center animate-fade-in">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">🏛️</div>
        <p className="font-semibold tracking-tight text-gray-900">No issuer applications yet</p>
        <p className="mt-1 max-w-xs text-sm leading-relaxed text-gray-400">Applications from the onboarding funnel will appear here for vetting.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3">Issuer</th>
            <th className="hidden px-4 py-3 sm:table-cell">Type · Domain</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 md:table-cell">Signals</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {issuers.map((i) => (
            <tr key={String(i.userId)} className="align-top transition-colors duration-150 hover:bg-slate-50">
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{i.name}</p>
                <p className="text-xs text-gray-500">{i.email}</p>
              </td>
              <td className="hidden px-4 py-3 text-gray-600 sm:table-cell">
                <p className="capitalize">{i.institutionType}</p>
                <p className="text-xs text-gray-400">{i.lockedDomain || '—'}</p>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[i.verificationStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  {i.verificationStatus}
                </span>
                {i.isVerifiedIssuer && <span className="ml-1 text-[10px] text-emerald-600">✓ active</span>}
              </td>
              <td className="hidden px-4 py-3 md:table-cell">
                <p className="text-xs text-gray-600">KYC: {i.kycStatus}{i.domainAgeMonths != null ? ` · domain ${i.domainAgeMonths}mo` : ''}</p>
                {(i.riskFlags || []).length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {i.riskFlags.map((f) => <span key={f} className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] text-amber-700">{f}</span>)}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                {i.verificationStatus === 'identity_checked' ? (
                  <div className="flex justify-end gap-2">
                    <button type="button" disabled={busyId === i.userId} onClick={() => vet(i.userId, true)} className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 active:scale-[0.97] disabled:opacity-50">Approve</button>
                    <button type="button" disabled={busyId === i.userId} onClick={() => vet(i.userId, false)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-150 hover:bg-red-700 active:scale-[0.97] disabled:opacity-50">Reject</button>
                  </div>
                ) : i.isVerifiedIssuer ? (
                  <span className="text-xs text-emerald-600">Verified</span>
                ) : (
                  <span className="text-xs text-gray-400">Awaiting prior tiers</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
