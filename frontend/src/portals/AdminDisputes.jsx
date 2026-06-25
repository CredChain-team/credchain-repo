// ─────────────────────────────────────────────────────────────
// CredChain — Platform-Admin Dispute Review Queue (Section 5.1)
// The INDEPENDENT check: disputes land here, not back with the issuer who
// revoked. Admin reinstates (revocation was wrong) or upholds the revocation.
// API is gated to ADMIN_EMAILS; non-admins see a clear notice.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldAlert, PartyPopper, RotateCcw, ShieldX, Quote, CheckCircle2, XCircle } from 'lucide-react';
import PortalLayout from './PortalLayout';
import { listDisputes, resolveDispute } from '../services/api';
import { timeAgo } from '../lib/format';
import { Card, Badge, Button, EmptyState } from '../components/ui';
import { fadeUp, stagger, staggerItem } from '../theme/motion';

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | forbidden | error
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState(null);

  async function load() {
    try {
      const data = await listDisputes();
      setDisputes(data?.disputes || []);
      setState('ready');
    } catch (err) {
      setState(err?.response?.status === 403 ? 'forbidden' : 'error');
    }
  }

  useEffect(() => { load(); }, []);

  async function resolve(id, decision) {
    setBusyId(id);
    setMsg(null);
    try {
      const res = await resolveDispute(id, decision);
      setMsg({ type: 'ok', text: res?.message || 'Resolved.' });
      setDisputes((prev) => prev.filter((d) => String(d.id) !== String(id)));
    } catch (err) {
      setMsg({ type: 'err', text: err?.response?.data?.message || 'Could not resolve.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalLayout title="Dispute Review Queue" subtitle="Independent platform-admin review — not the issuer who revoked.">
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          <span className="text-sm text-content-secondary">Loading queue…</span>
        </div>
      )}

      {state === 'forbidden' && (
        <Card padding="lg" className="border-warning-500/30 bg-warning-500/[0.06]">
          <div className="flex items-start gap-3 text-sm leading-relaxed text-content-secondary">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning-500" />
            <p>
              This queue is restricted to platform admins (the <code className="rounded bg-bg-sunken px-1 font-mono text-[13px]">ADMIN_EMAILS</code> allowlist). Sign in with an admin account to review disputes.
            </p>
          </div>
        </Card>
      )}

      {state === 'error' && (
        <Card padding="lg" className="text-center text-danger-500">Failed to load the dispute queue.</Card>
      )}

      {state === 'ready' && (
        <>
          <AnimatePresence mode="wait">
            {msg && (
              <motion.div
                key={msg.text}
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
                  msg.type === 'ok'
                    ? 'border-accent-500/30 bg-accent-500/[0.08] text-accent-600 dark:text-accent-400'
                    : 'border-danger-500/30 bg-danger-500/[0.08] text-danger-500'
                }`}
              >
                <span className="mt-0.5 shrink-0">{msg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}</span>
                <span>{msg.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {disputes.length === 0 ? (
            <Card>
              <EmptyState
                icon={PartyPopper}
                title="No disputes awaiting review"
                description="The queue is clear. New disputes will appear here."
              />
            </Card>
          ) : (
            <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-3">
              {disputes.map((d) => (
                <motion.div key={d.id} variants={staggerItem}>
                  <Card className="border-l-4 border-l-warning-500">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold tracking-tight text-content-primary">{d.title}</p>
                        <p className="mt-0.5 text-xs text-content-secondary">
                          Issued by <span className="font-medium text-content-primary">{d.issuer}</span> · disputed by <span className="font-medium text-content-primary">{d.student}</span>
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
                        Reinstate credential
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busyId === d.id}
                        leftIcon={<ShieldX className="h-4 w-4" />}
                        onClick={() => resolve(d.id, 'uphold')}
                      >
                        Uphold revocation
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}
    </PortalLayout>
  );
}
