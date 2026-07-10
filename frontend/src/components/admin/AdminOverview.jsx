// ─────────────────────────────────────────────────────────────
// CredChain — Admin Overview
// At-a-glance platform health for the gatekeeper: issuers in the funnel,
// who's awaiting final Tier-4 vetting, and open disputes.
// ─────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import { BadgeCheck, Hourglass, AlertTriangle, Gavel, Info, Inbox } from 'lucide-react';
import { StatCard, Card } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function AdminOverview({ issuers, disputes, requests = [], onGoTo }) {
  const verified = issuers.filter((i) => i.isVerifiedIssuer).length;
  const awaitingVetting = issuers.filter((i) => i.verificationStatus === 'identity_checked').length;
  const flagged = issuers.filter((i) => (i.riskFlags || []).length > 0).length;
  const openDisputes = disputes.length;
  const openRequests = requests.filter((r) => r.status === 'pending').length;

  const cards = [
    { label: 'Verified issuers', value: verified, icon: BadgeCheck, tone: 'brand', tab: 'issuers' },
    { label: 'Awaiting Tier-4 vetting', value: awaitingVetting, icon: Hourglass, tone: awaitingVetting > 0 ? 'warning' : 'brand', tab: 'issuers' },
    { label: 'Issuers with risk flags', value: flagged, icon: AlertTriangle, tone: flagged > 0 ? 'danger' : 'brand', tab: 'issuers' },
    { label: 'Open disputes', value: openDisputes, icon: Gavel, tone: openDisputes > 0 ? 'warning' : 'brand', tab: 'disputes' },
    { label: 'Institution requests', value: openRequests, icon: Inbox, tone: openRequests > 0 ? 'violet' : 'brand', tab: 'institutions' },
  ];

  return (
    <div>
      <motion.div
        variants={stagger(0.05)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
      >
        {cards.map((c) => (
          <motion.button
            key={c.label}
            variants={staggerItem}
            type="button"
            onClick={() => onGoTo?.(c.tab)}
            whileHover={{ y: -2 }}
            className="rounded-lg text-left transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <StatCard label={c.label} value={c.value} icon={c.icon} tone={c.tone} />
          </motion.button>
        ))}
      </motion.div>

      <Card className="mt-5 border-brand-200 bg-brand-soft dark:border-brand-500/30">
        <div className="flex items-start gap-3 text-sm leading-relaxed text-content-secondary">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
          <p>
            Your two levers as platform admin: <strong className="text-content-primary">vet issuers</strong> (the final cross-match that unlocks issuance) and{' '}
            <strong className="text-content-primary">resolve disputes</strong> (the independent check on revocations). Both are designed so one party can never be judge of its own case.
          </p>
        </div>
      </Card>
    </div>
  );
}
