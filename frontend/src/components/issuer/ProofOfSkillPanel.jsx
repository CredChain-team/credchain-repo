// ─────────────────────────────────────────────────────────────
// CredChain — Proof of Skill Auto-Issuer (Section 4.3)
// Webhook endpoints that auto-mint a credential when a hackathon project is
// merged or marked a winner (GitHub / external judging APIs). The endpoints
// are shown for integration; "Simulate winner" fires a real issuance so the
// auto-issue path is demonstrable end-to-end.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Webhook, GitBranch, Gavel, Copy, Check, Trophy, Zap } from 'lucide-react';
import { issueVerifiedCredential } from '../../services/api';
import { Card, Button, Input } from '../ui';
import { fadeUp } from '../../theme/motion';

export default function ProofOfSkillPanel({ onIssued }) {
  const [hook] = useState(() => {
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000');
    return {
      github: `${base}/api/v1/issuer/proof/github`,
      judging: `${base}/api/v1/issuer/proof/judging`,
    };
  });
  const [project, setProject] = useState('');
  const [winnerEmail, setWinnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function copy(v) {
    if (navigator.clipboard) navigator.clipboard.writeText(v).catch(() => {});
  }

  async function simulateWinner() {
    if (!project.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const payload = { title: `Hackathon Winner — ${project.trim()}` };
      if (winnerEmail.trim()) payload.recipientEmail = winnerEmail.trim();
      const res = await issueVerifiedCredential(payload);
      if (onIssued && res.credential) onIssued(res.credential);
      setMsg({ type: 'ok', text: `Auto-issued “${res.credential.title}”.` });
      setProject('');
      setWinnerEmail('');
    } catch (err) {
      setMsg({
        type: 'err',
        text: err?.response?.status === 403
          ? 'Verify your issuer account to enable auto-issuance.'
          : err?.response?.data?.message || 'Auto-issue failed.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border-subtle px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/12 text-violet-600 dark:text-violet-400">
          <Webhook className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-content-primary">Proof-of-Skill Auto-Issuer</h3>
          <p className="mt-0.5 text-xs text-content-secondary">Hook these into GitHub / your judging platform to mint on merge or win.</p>
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-3">
          <WebhookRow icon={<GitBranch className="h-4 w-4" />} label="GitHub merge webhook" url={hook.github} onCopy={copy} />
          <WebhookRow icon={<Gavel className="h-4 w-4" />} label="Judging API webhook" url={hook.judging} onCopy={copy} />
        </div>

        <div className="mt-5 rounded-lg border border-border-subtle bg-bg-sunken p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-content-primary">
            <Trophy className="h-4 w-4 text-warning-500" />
            Simulate a winner <span className="font-normal text-content-muted">(fires a real auto-issue)</span>
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Input value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project / event name" />
            <Input value={winnerEmail} onChange={(e) => setWinnerEmail(e.target.value)} placeholder="Winner email (optional)" />
          </div>
          <Button
            type="button"
            variant="primary"
            className="mt-3"
            onClick={simulateWinner}
            disabled={busy || !project.trim()}
            loading={busy}
            leftIcon={!busy && <Zap className="h-4 w-4" />}
          >
            {busy ? 'Issuing…' : 'Simulate winner → auto-issue'}
          </Button>
          {msg && (
            <motion.p
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className={`mt-2.5 text-xs font-medium ${msg.type === 'ok' ? 'text-accent-600 dark:text-accent-400' : 'text-danger-500'}`}
            >
              {msg.text}
            </motion.p>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-content-muted">
          This is the primary path for a self-taught, unaffiliated builder to earn a Verified Ledger credential — a confirmed, judged outcome is itself legitimate verification.
        </p>
      </div>
    </Card>
  );
}

function WebhookRow({ icon, label, url, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-content-secondary">
        <span className="text-content-muted">{icon}</span>
        {label}
      </p>
      <div className="mt-1.5 flex gap-2">
        <input
          readOnly
          value={url}
          className="min-w-0 flex-1 truncate rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 font-mono text-[13px] text-brand-600 dark:text-brand-300"
        />
        <Button type="button" variant="outline" size="sm" onClick={handleCopy} leftIcon={copied ? <Check className="h-4 w-4 text-accent-500" /> : <Copy className="h-4 w-4" />}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
    </div>
  );
}
