// ─────────────────────────────────────────────────────────────
// CredChain — Issuer: mint a single credential (System 7)
// POST /api/v1/issuer/credentials (verified issuers only). The student then
// Accepts it in their queue, which anchors it on Solana. Surfaces the
// not-yet-verified 403 cleanly.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, GraduationCap, Mail, IdCard, Sparkles, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { issueVerifiedCredential } from '../../services/api';
import { shortHash } from '../../lib/format';
import { Card, Button, Input, Stepper, Badge, SuccessCheck, ConfettiBurst, OnChainProof, useToast } from '../ui';
import { fadeUp } from '../../theme/motion';

const STEPS = [
  { label: 'Details', icon: Award },
  { label: 'Review', icon: Sparkles },
  { label: 'Issued', icon: GraduationCap },
];

export default function IssueCredentialPanel({ onIssued }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: '', recipientEmail: '', studentId: '' });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Presentational step: 0 = editing, 2 = issued. Derived from result.
  const stepIndex = result ? 2 : 0;

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const payload = { title: form.title.trim() };
      if (form.recipientEmail.trim()) payload.recipientEmail = form.recipientEmail.trim();
      if (form.studentId.trim()) payload.studentId = form.studentId.trim();
      const res = await issueVerifiedCredential(payload);
      setResult(res.credential);
      if (onIssued && res.credential) onIssued(res.credential);
      if (res.credential) toast.success('Credential issued', { description: `“${res.credential.title}” awaits acceptance.` });
      setForm({ title: '', recipientEmail: '', studentId: '' });
    } catch (err) {
      const status = err?.response?.status;
      const text =
        status === 403
          ? 'Your issuer account isn’t fully vetted yet — finish the verification funnel (and the admin Tier-4 cross-match) to mint credentials.'
          : err?.response?.data?.message || 'Could not issue the credential.';
      setError(text);
      toast.error('Issuance failed', { description: text });
    } finally {
      setBusy(false);
    }
  }

  function issueAnother() {
    setResult(null);
    setError(null);
  }

  return (
    <Card padding="none" className="overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-600">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-content-primary">Issue a credential</h3>
            <p className="mt-0.5 text-xs text-content-secondary">Lands in the recipient’s pending queue; they accept to anchor it on Solana.</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5">
        <Stepper steps={STEPS} current={stepIndex} className="mb-6" />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr,0.9fr]">
          {/* ── Form / Success ── */}
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.form
                key="form"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={submit}
                className="space-y-3.5"
              >
                <Input
                  label="Credential title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. B.Sc Computer Science"
                  leftIcon={<GraduationCap />}
                />
                <Input
                  label="Recipient email"
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) => setForm((f) => ({ ...f, recipientEmail: e.target.value }))}
                  placeholder="links to their account"
                  leftIcon={<Mail />}
                />
                <Input
                  label="Student user ID"
                  hint="Optional — used when the recipient has no email on file."
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                  placeholder="optional"
                  leftIcon={<IdCard />}
                />
                <Button type="submit" loading={busy} fullWidth rightIcon={!busy && <ArrowRight className="h-4 w-4" />}>
                  {busy ? 'Issuing…' : 'Issue credential'}
                </Button>

                {error && (
                  <motion.div
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    className="flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] px-4 py-3 text-sm text-danger-500"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="success"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="relative flex flex-col items-center justify-center py-2 text-center"
              >
                <ConfettiBurst fire />
                <SuccessCheck size={64} />
                <h4 className="mt-4 text-base font-bold text-content-primary">Credential issued</h4>
                <p className="mt-1 max-w-xs text-sm text-content-secondary">
                  “{result.title}” minted. Awaiting the recipient’s acceptance to anchor on-chain.
                </p>
                <Button variant="secondary" size="sm" className="mt-5" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={issueAnother}>
                  Issue another
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Live preview ── */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-content-muted">Live preview</p>
            <PreviewCard form={form} result={result} />
            {result && (
              <OnChainProof
                className="mt-3"
                txSignature={result.txSignature || result.solanaSignature || ''}
                network={result.network || 'devnet'}
                anchoredId={result.id || result._id}
                status={result.txSignature || result.solanaSignature ? 'anchored' : 'pending'}
              />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PreviewCard({ form, result }) {
  const title = result?.title || form.title || 'Credential title';
  const recipient = result?.recipientEmail || form.recipientEmail;
  const hash = result?.sha256Hash;
  const isPlaceholder = !result && !form.title.trim();

  return (
    <div className="relative overflow-hidden rounded-lg border border-border-subtle bg-grad-verified p-5 text-white shadow-md">
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <Badge tone="success" variant="solid" size="sm">
            {result ? 'Issued' : 'Draft'}
          </Badge>
          <Award className="h-5 w-5 text-white/80" />
        </div>
        <p className={`mt-5 text-lg font-bold leading-snug ${isPlaceholder ? 'text-white/50' : 'text-white'}`}>{title}</p>
        <div className="mt-4 space-y-1 text-xs text-white/85">
          <p className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            {recipient || 'recipient@example.com'}
          </p>
          <p className="flex items-center gap-1.5 font-mono">
            <Sparkles className="h-3.5 w-3.5" />
            {hash ? shortHash(hash) : 'fingerprint pending'}
          </p>
        </div>
        <div className="mt-5 border-t border-white/20 pt-3 text-[11px] uppercase tracking-wide text-white/70">
          Verified on CredChain
        </div>
      </div>
    </div>
  );
}
