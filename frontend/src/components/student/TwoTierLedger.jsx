// ─────────────────────────────────────────────────────────────
// CredChain — Two-Tier Trust ledgers (Section 4.1)
// Verified Ledger (issuer-anchored, incl. revoked/disputed) on top; the
// honestly-labelled Sandbox Ledger (self-asserted skills) below, visually
// distinguished. Never presented as equal trust weight.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Vault, Plus, ShieldCheck, Sprout, Handshake, Link2, AlertTriangle } from 'lucide-react';
import LedgerCard from './LedgerCard';
import { Badge, Button, Input, Select, EmptyState } from '../ui';
import { AttestedBadge } from '../ui/TrustTier';
import { stagger, staggerItem } from '../../theme/motion';

export default function TwoTierLedger({ verified, revoked, sandbox, attested = [], studentId, onViewProof, onDispute, onAddSandbox, onDisputeAttested }) {
  const [form, setForm] = useState({ skillName: '', source: 'Self-taught', link: '' });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState(null);
  const [copied, setCopied] = useState(null);

  // Verified ledger shows accepted + revoked together so the audit trail and
  // dispute path are visible (revoked isn't hidden — transparency).
  const ledger = [...verified, ...revoked];

  // Build the shareable vouch URL for a sandbox skill at a given index.
  function vouchLink(skillIndex) {
    return `${window.location.origin}/vouch/${studentId}/${skillIndex}`;
  }

  async function copyVouchLink(skillIndex) {
    try {
      await navigator.clipboard.writeText(vouchLink(skillIndex));
      setCopied(skillIndex);
      setTimeout(() => setCopied((c) => (c === skillIndex ? null : c)), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

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
      <section className="rounded-2xl border border-border-subtle bg-bg-elevated p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-content-primary">Verified skills</h2>
              <Badge tone="success" variant="soft" size="sm">{ledger.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-content-secondary">Confirmed by a school or employer and locked in — can't be faked or changed.</p>
          </div>
        </div>
        <motion.div
          variants={stagger(0.06)}
          initial="initial"
          animate="animate"
          className="mt-3 space-y-3"
        >
          {ledger.length === 0 ? (
            <EmptyState
              icon={Vault}
              title="No verified skills yet"
              description="Accept a skill waiting for your approval and it shows up here, verified and locked in."
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

      {/* Attested — the middle trust state. A high-reputation user staked
          reputation to vouch for a self-declared skill. Between Verified and
          Sandbox: partial trust, never equal to an issuer credential. */}
      {attested.length > 0 && (
        <section className="rounded-2xl border border-violet-500/30 bg-violet-500/[0.04] p-5 shadow-card sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-600 dark:text-violet-400">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-content-primary">Attested skills</h2>
                <Badge tone="violet" variant="soft" size="sm">{attested.length}</Badge>
              </div>
              <p className="mt-1 text-xs text-content-secondary">A trusted, high-reputation member staked their own reputation to vouch for these. Partial trust — stronger than self-declared, but not a school/employer credential.</p>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {attested.map((a) => {
              const underReview = a.disputeStatus === 'under_review';
              const upheld = a.disputeStatus === 'resolved_upheld';
              return (
                <div key={a.id || a.index} className="rounded-xl border border-border-subtle bg-bg-elevated p-3.5 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-content-primary">{a.skillName}</p>
                        <AttestedBadge />
                        {underReview && <Badge tone="warning" variant="soft" size="sm" icon={<AlertTriangle />}>Under review</Badge>}
                        {upheld && <Badge tone="danger" variant="soft" size="sm">Upheld as false</Badge>}
                      </div>
                      <p className="mt-0.5 text-xs text-content-muted">
                        Vouched by {a.voucherName}{a.source ? ` · ${a.source}` : ''}
                      </p>
                    </div>
                    {onDisputeAttested && !underReview && (
                      <button
                        type="button"
                        onClick={() => onDisputeAttested(a.index)}
                        className="shrink-0 text-xs font-medium text-content-muted underline-offset-2 hover:text-danger-500 hover:underline"
                      >
                        Dispute
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Sandbox */}
      <section className="rounded-2xl border border-dashed border-border-strong bg-bg-sunken p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-content-secondary">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-content-primary">Skills you're still proving</h2>
              <Badge tone="neutral" variant="soft" size="sm">{sandbox.length}</Badge>
            </div>
            <p className="mt-1 text-xs text-content-secondary">Skills you've added yourself. Clearly marked — never shown as verified until a school or employer confirms them.</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {sandbox.map((s, i) => (
            <div key={i} className="rounded-xl border border-border-subtle bg-bg-elevated p-3.5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-content-primary">{s.skillName}</p>
                  <p className="mt-0.5 text-xs text-content-muted">{s.source}{s.link ? ` · ${s.link}` : ''}</p>
                </div>
                {studentId && (
                  <button
                    type="button"
                    onClick={() => copyVouchLink(i)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-violet-500/30 px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-500/10 dark:text-violet-400"
                    title="Copy a link a trusted member can use to vouch for this skill"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {copied === i ? 'Link copied!' : 'Request a vouch'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={submitSandbox} className="mt-4 space-y-2">
          <p className="text-xs font-medium text-content-secondary">Add a skill or project you've worked on</p>
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
