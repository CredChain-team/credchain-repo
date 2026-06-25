// ─────────────────────────────────────────────────────────────
// CredChain — Admin Overview
// At-a-glance platform health for the gatekeeper: issuers in the funnel,
// who's awaiting final Tier-4 vetting, and open disputes.
// ─────────────────────────────────────────────────────────────

export default function AdminOverview({ issuers, disputes, onGoTo }) {
  const total = issuers.length;
  const verified = issuers.filter((i) => i.isVerifiedIssuer).length;
  const awaitingVetting = issuers.filter((i) => i.verificationStatus === 'identity_checked').length;
  const flagged = issuers.filter((i) => (i.riskFlags || []).length > 0).length;
  const openDisputes = disputes.length;

  const cards = [
    { label: 'Verified issuers', value: verified, accent: true, tab: 'issuers' },
    { label: 'Awaiting Tier-4 vetting', value: awaitingVetting, warn: awaitingVetting > 0, tab: 'issuers' },
    { label: 'Issuers with risk flags', value: flagged, tab: 'issuers' },
    { label: 'Open disputes', value: openDisputes, warn: openDisputes > 0, tab: 'disputes' },
    { label: 'Total issuer applications', value: total, tab: 'issuers' },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.label}
            type="button"
            onClick={() => onGoTo?.(c.tab)}
            className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className={`text-2xl font-bold tracking-tight ${c.accent ? 'text-blue-600' : c.warn ? 'text-amber-600' : 'text-gray-900'}`}>{c.value}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-gray-500">{c.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-800">
        Your two levers as platform admin: <strong>vet issuers</strong> (the final cross-match that unlocks issuance) and
        <strong> resolve disputes</strong> (the independent check on revocations). Both are designed so one party can never
        be judge of its own case.
      </div>
    </div>
  );
}
