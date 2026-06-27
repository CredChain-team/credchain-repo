// ─────────────────────────────────────────────────────────────
// CredChain — Two-Step Approval Queue (Section 4.1)
// Incoming credentials land here. Accept hashes + writes to Solana via the
// backend; Reject drops it. The student decides what gets permanently
// anchored — "your data, your control".
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Inbox, CheckCircle2, XCircle, BellRing } from 'lucide-react';
import { timeAgo } from '../../lib/format';
import { Badge, Button } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function PendingQueue({ pending, onAccept, onReject }) {
  const [busyId, setBusyId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  async function act(id, fn, verb) {
    setBusyId(id);
    setFeedback(null);
    try {
      const res = await fn(id);
      setFeedback({ type: 'ok', text: res?.message || `Credential ${verb}.` });
    } catch (err) {
      setFeedback({ type: 'err', text: err?.response?.data?.message || `Could not ${verb} the credential.` });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-bg-brand-soft p-5 shadow-card dark:border-brand-500/30 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-brand-600">
          <BellRing className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-content-primary">Waiting for your approval</h3>
            <Badge tone="brand" variant="solid" size="sm">{pending.length}</Badge>
          </div>
          <p className="mt-1 mb-4 text-xs text-content-secondary">Accept to verify and lock it in for good · Reject to remove it. You decide what stays.</p>
        </div>
      </div>

      {feedback && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'ok'
              ? 'border-accent-500/30 bg-accent-500/10 text-accent-600 dark:text-accent-400'
              : 'border-danger-500/30 bg-danger-500/10 text-danger-500'
          }`}
        >
          {feedback.type === 'ok' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {pending.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Inbox className="h-7 w-7 text-content-muted" />
          <p className="max-w-sm text-sm text-content-secondary">
            Nothing waiting right now. When a school or employer sends you a verified skill, it shows up here for you to approve.
          </p>
        </div>
      ) : (
        <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-2">
          {pending.map((c) => (
            <motion.div
              key={c.id}
              variants={staggerItem}
              className="rounded-xl border border-border-subtle border-l-4 border-l-brand-500 bg-bg-elevated p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-content-primary">{c.title}</p>
                <p className="mt-0.5 truncate text-xs text-content-muted">{c.issuer || 'Verified issuer'} · {timeAgo(c.createdAt)}</p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" loading={busyId === c.id} onClick={() => act(c.id, onAccept, 'accepted')}>
                  Accept
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === c.id} onClick={() => act(c.id, onReject, 'rejected')} className="border-danger-500/40 text-danger-500 hover:bg-danger-500/10">
                  Reject
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
