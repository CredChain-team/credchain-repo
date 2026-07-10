// ─────────────────────────────────────────────────────────────
// CredChain — Request a Vouch modal
// The "peer" verification pathway. A student can't mint their own trust, but
// they CAN ask a trusted, high-reputation member to stake reputation on one of
// their self-declared (sandbox) skills. This modal hands them a shareable link
// per skill — no in-app messaging system needed. Whoever opens the link (and
// has reputation ≥ 60) lands on the public VouchPage and can vouch in one click.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Handshake, Link2, Sprout } from 'lucide-react';
import { Modal, Button, EmptyState } from '../ui';

export default function RequestVouchModal({ studentId, sandbox = [], onClose }) {
  const [copied, setCopied] = useState(null);

  function vouchLink(skillIndex) {
    return `${window.location.origin}/vouch/${studentId}/${skillIndex}`;
  }

  async function copyLink(skillIndex) {
    try {
      await navigator.clipboard.writeText(vouchLink(skillIndex));
      setCopied(skillIndex);
      setTimeout(() => setCopied((c) => (c === skillIndex ? null : c)), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Request a vouch"
      description="Ask someone who knows your work to put their reputation behind a skill."
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/[0.05] p-4">
          <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-violet-600 dark:text-violet-400" />
          <p className="text-sm text-content-secondary">
            A vouch isn't a like — it <span className="font-semibold text-content-primary">costs the voucher 10 reputation points</span>,
            which they lose for good if the vouch is ever proven false. That's what makes an <span className="font-semibold text-violet-600 dark:text-violet-400">Attested</span> skill
            worth more than a self-declared one. Only members with a reputation of 60+ can vouch.
          </p>
        </div>

        {sandbox.length === 0 ? (
          <EmptyState
            icon={Sprout}
            title="No skills to vouch for yet"
            description="Add a self-declared skill to your vault first, then share its link with someone who can vouch."
          />
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-content-secondary">Share a link for any skill below:</p>
            {sandbox.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-content-primary">{s.skillName}</p>
                  <p className="mt-0.5 truncate text-xs text-content-muted">{s.source}{s.link ? ` · ${s.link}` : ''}</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => copyLink(i)}
                  leftIcon={<Link2 className="h-4 w-4" />}
                >
                  {copied === i ? 'Copied!' : 'Copy link'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
