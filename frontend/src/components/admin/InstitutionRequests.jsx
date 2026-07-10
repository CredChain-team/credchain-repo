// ─────────────────────────────────────────────────────────────
// CredChain — Admin: Institution demand queue
// The other side of "Request your institution": a ranked list of schools /
// employers students have asked for, most-wanted first. Admins mark each as
// reviewing / onboarded / declined. Presentational — data + handler come from
// the AdminPanel.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Inbox, Users, ExternalLink, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { timeAgo } from '../../lib/format';
import { Card, Badge, Button, EmptyState } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

const STATUS_TONE = {
  pending: 'warning',
  reviewing: 'info',
  onboarded: 'success',
  declined: 'neutral',
};

export default function InstitutionRequests({ requests, onResolve }) {
  const [busyId, setBusyId] = useState(null);

  async function act(id, status) {
    setBusyId(id);
    try {
      await onResolve(id, status);
    } finally {
      setBusyId(null);
    }
  }

  if (!requests.length) {
    return (
      <Card>
        <EmptyState
          icon={Inbox}
          title="No institution requests yet"
          description="When students ask for a school or employer that isn't listed, the demand shows up here — ranked by how many students want it."
        />
      </Card>
    );
  }

  return (
    <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
      {requests.map((r) => {
        const done = r.status === 'onboarded' || r.status === 'declined';
        return (
          <motion.div key={String(r.id)} variants={staggerItem}>
            <Card className="border-l-4 border-l-brand-400">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold tracking-tight text-content-primary">{r.displayName}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-content-secondary">
                      <span className="inline-flex items-center gap-1 font-medium text-content-primary">
                        <Users className="h-3.5 w-3.5" /> {r.requestCount} student{r.requestCount === 1 ? '' : 's'} want this
                      </span>
                      {r.website && (
                        <a
                          href={/^https?:\/\//.test(r.website) ? r.website : `https://${r.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                        >
                          {r.website} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <span className="text-content-muted">· last asked {timeAgo(r.lastRequestedAt)}</span>
                    </p>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[r.status] || 'neutral'} variant="soft" size="sm">{r.status}</Badge>
              </div>

              {!done && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {r.status !== 'reviewing' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busyId === r.id}
                      leftIcon={<Eye className="h-4 w-4" />}
                      onClick={() => act(r.id, 'reviewing')}
                    >
                      Mark reviewing
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="success"
                    disabled={busyId === r.id}
                    loading={busyId === r.id}
                    leftIcon={<CheckCircle2 className="h-4 w-4" />}
                    onClick={() => act(r.id, 'onboarded')}
                  >
                    Mark onboarded
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === r.id}
                    leftIcon={<XCircle className="h-4 w-4" />}
                    onClick={() => act(r.id, 'declined')}
                  >
                    Decline
                  </Button>
                </div>
              )}
            </Card>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
