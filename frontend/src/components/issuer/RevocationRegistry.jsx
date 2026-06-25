// ─────────────────────────────────────────────────────────────
// CredChain — On-Chain Revocation Registry (System 7, Section 7)
// Danger zone. Appends ":REVOKED" to the original hash and mints a fresh
// Solana Memo as a tamper-proof revocation record. Lists credentials minted
// this session (plus a manual ID field). Students can still DISPUTE a
// revocation from their vault — this isn't the issuer's unilateral last word.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Ban, FileWarning } from 'lucide-react';
import { revokeCredential } from '../../services/api';
import { shortHash } from '../../lib/format';
import { Card, Button, Badge, Modal, Input, EmptyState, useToast } from '../ui';
import { fadeUp, stagger, staggerItem } from '../../theme/motion';

export default function RevocationRegistry({ issued = [], onRevoked }) {
  const toast = useToast();
  const [manualId, setManualId] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null); // { id, title } pending confirmation

  async function revoke(id) {
    if (!id) return;
    setBusyId(id);
    try {
      const res = await revokeCredential(id);
      toast.success(res?.message || 'Credential revoked.');
      if (onRevoked) onRevoked(id);
      setManualId((prev) => (prev.trim() === id ? '' : prev));
    } catch (err) {
      const status = err?.response?.status;
      const text =
        status === 403 ? 'Only the verified issuer who minted a credential can revoke it.'
          : status === 404 ? 'No credential found with that ID.'
          : status === 409 ? 'That credential is already revoked.'
          : err?.response?.data?.message || 'Revocation failed.';
      toast.error(text);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  }

  const active = issued.filter((c) => c.status !== 'revoked');

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-start gap-2 border-b border-danger-500/20 bg-danger-500/[0.06] px-5 py-3 text-sm text-danger-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Danger zone — revoking appends <code className="font-mono text-[13px]">:REVOKED</code> on-chain. Students can still dispute.
        </span>
      </div>

      <div>
        {active.length === 0 ? (
          <EmptyState
            icon={Ban}
            title="Nothing to revoke yet"
            description="Credentials you issue this session appear here, ready for revocation."
          />
        ) : (
          <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="divide-y divide-border-subtle">
            {active.map((c) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-bg-sunken"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-content-primary">{c.title}</p>
                    <Badge tone="success" size="sm" dot>Active</Badge>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[13px] text-content-muted">{shortHash(c.sha256Hash || c.id)}</p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  loading={busyId === c.id}
                  onClick={() => setConfirm({ id: c.id, title: c.title })}
                  leftIcon={busyId !== c.id && <Ban className="h-4 w-4" />}
                >
                  Revoke
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <div className="border-t border-border-subtle px-5 py-4">
        <p className="text-xs font-medium text-content-secondary">Revoke by credential ID</p>
        <div className="mt-2 flex gap-2">
          <Input
            className="flex-1"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="credential _id"
            leftIcon={<FileWarning />}
          />
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirm({ id: manualId.trim(), title: null })}
            disabled={!manualId.trim() || busyId === manualId.trim()}
            loading={busyId === manualId.trim()}
          >
            Revoke
          </Button>
        </div>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Revoke this credential?"
        description="This appends :REVOKED on-chain and mints a tamper-proof revocation record. The student can dispute it from their vault."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant="danger" loading={!!busyId} leftIcon={<Ban className="h-4 w-4" />} onClick={() => revoke(confirm?.id)}>
              Revoke credential
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded-lg border border-danger-500/20 bg-danger-500/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
          <div className="text-sm text-content-secondary">
            {confirm?.title ? (
              <p>You are about to revoke <span className="font-semibold text-content-primary">“{confirm.title}”</span>.</p>
            ) : (
              <p>You are about to revoke credential <span className="font-mono text-content-primary">{shortHash(confirm?.id || '')}</span>.</p>
            )}
            <p className="mt-1.5">This action is recorded on-chain and cannot be silently undone.</p>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
