// ─────────────────────────────────────────────────────────────
// CredChain — Admin Dispute Review Queue (Section 5.1)
// The independent check: reinstate (revocation was wrong) or uphold it.
// Presentational — data + handlers come from the AdminPanel.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PartyPopper, RotateCcw, ShieldX, Quote } from 'lucide-react';
import { timeAgo } from '../../lib/format';
import { Card, Badge, Button, EmptyState } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function DisputeQueue({ disputes, onResolve }) {
  const [busyId, setBusyId] = useState(null);

  async function resolve(id, decision) {
    setBusyId(id);
    try {
      await onResolve(id, decision);
    } finally {
      setBusyId(null);
    }
  }

  if (disputes.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={PartyPopper}
          title="No disputes awaiting review"
          description="The queue is clear. New disputes will appear here."
        />
      </Card>
    );
  }

  return (
    <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
      {disputes.map((d) => {
        // The queue is uniform but adjudicates two kinds: credential
        // revocations and reputation-backed vouches. Label + button copy adapt.
        const isVouch = d.type === 'vouch';
        return (
        <motion.div key={String(d.id)} variants={staggerItem}>
          <Card className="border-l-4 border-l-warning-500">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold tracking-tight text-content-primary">{d.title}</p>
                  <Badge tone={isVouch ? 'violet' : 'brand'} variant="soft" size="sm">
                    {isVouch ? 'Vouch' : 'Credential'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-content-secondary">
                  {isVouch ? 'Vouched by' : 'Issued by'} <span className="font-medium text-content-primary">{d.issuer}</span> · disputed by <span className="font-medium text-content-primary">{d.student}</span>
                  {isVouch && d.stakedPoints != null && (
                    <> · <span className="font-medium text-content-primary">{d.stakedPoints} pts</span> staked</>
                  )}
                </p>
              </div>
              <Badge tone="warning" variant="soft" size="sm">{timeAgo(d.filedAt)}</Badge>
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-border-subtle bg-bg-sunken px-3 py-2.5 text-sm text-content-secondary">
              <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-content-muted" />
              <span className="italic">{d.reason}</span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="primary"
                disabled={busyId === d.id}
                loading={busyId === d.id}
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={() => resolve(d.id, 'reinstate')}
              >
                {isVouch ? 'Reinstate vouch (return stake)' : 'Reinstate credential'}
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={busyId === d.id}
                leftIcon={<ShieldX className="h-4 w-4" />}
                onClick={() => resolve(d.id, 'uphold')}
              >
                {isVouch ? 'Uphold (forfeit stake)' : 'Uphold revocation'}
              </Button>
            </div>
          </Card>
        </motion.div>
        );
      })}
    </motion.div>
  );
}
