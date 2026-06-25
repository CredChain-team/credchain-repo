// ─────────────────────────────────────────────────────────────
// CredChain — Two-Tier Trust ledgers (Section 4.1)
// Verified Ledger (issuer-anchored, incl. revoked/disputed) on top; the
// honestly-labelled Sandbox Ledger (self-asserted skills) below, visually
// distinguished. Never presented as equal trust weight.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Vault, Plus } from 'lucide-react';
import LedgerCard from './LedgerCard';
import { Badge, Button, Input, Select, EmptyState } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function TwoTierLedger({ verified, revoked, sandbox, onViewProof, onDispute, onAddSandbox }) {
  const [form, setForm] = useState({ skillName: '', source: 'Self-taught', link: '' });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);

  // Verified ledger shows accepted + revoked together so the audit trail and
  // dispute path are visible (revoked isn't hidden — transparency).
  const ledger = [...verified, ...revoked];

  async function submitSandbox(e) {
    e.preventDefault();
    if (!form.skillName.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      await onAddSandbox(form);
      setForm({ skillName: '', source: 'Self-taught', link: '' });
    } catch (e2) {
      setErr(e2?.response?.data?.message || 'Could not add skill.');
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Verified */}
      <section>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-content-primary">Verified Ledger</h2>
          <Badge tone="success" variant="soft" size="sm">{ledger.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-content-secondary">Issuer-vouched, anchored to Solana. Full lifecycle shown.</p>
        <motion.div
          variants={stagger(0.06)}
          initial="initial"
          animate="animate"
          className="mt-3 space-y-3"
        >
          {ledger.length === 0 ? (
            <EmptyState
              icon={Vault}
              title="No verified credentials yet"
              description="Accept a credential from your pending queue to populate your Verified Ledger."
            />
          ) : (
            ledger.map((c) => (
              <motion.div key={c.id} variants={staggerItem}>
                <LedgerCard credential={c} onViewProof={onViewProof} onDispute={onDispute} />
              </motion.div>
            ))
          )}
        </motion.div>
      </section>

      {/* Sandbox */}
      <section className="rounded-lg border border-dashed border-border-strong bg-bg-sunken p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold tracking-tight text-content-primary">Sandbox</h2>
          <Badge tone="neutral" variant="soft" size="sm">{sandbox.length}</Badge>
        </div>
        <p className="mt-1 text-xs text-content-secondary">Self-asserted — honestly labelled, never disguised as verified.</p>

        <div className="mt-3 space-y-2">
          {sandbox.map((s, i) => (
            <div key={i} className="rounded-md border border-border-subtle bg-bg-elevated p-3 shadow-sm">
              <p className="text-sm font-medium text-content-primary">{s.skillName}</p>
              <p className="mt-0.5 text-xs text-content-muted">{s.source}{s.link ? ` · ${s.link}` : ''}</p>
            </div>
          ))}
        </div>

        <form onSubmit={submitSandbox} className="mt-4 space-y-2">
          <p className="text-xs font-medium text-content-secondary">Add a self-taught skill / project</p>
          <Input
            value={form.skillName}
            onChange={(e) => setForm((f) => ({ ...f, skillName: e.target.value }))}
            placeholder="e.g. Rust, or 'Personal project: ledger-db'"
          />
          <div className="flex items-stretch gap-2">
            <div className="w-36 shrink-0">
              <Select
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                <option>Self-taught</option>
                <option>GitHub</option>
                <option>Coursera</option>
                <option>YouTube</option>
                <option>Other</option>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                value={form.link}
                onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                placeholder="link (optional)"
              />
            </div>
            <Button type="submit" variant="secondary" loading={adding} leftIcon={!adding && <Plus className="h-4 w-4" />}>
              Add
            </Button>
          </div>
          {err && <p className="text-xs text-danger-500">{err}</p>}
        </form>
      </section>
    </div>
  );
}
