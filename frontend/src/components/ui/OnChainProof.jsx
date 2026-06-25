import { useState } from 'react';
import { Link2, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/cn';

function truncate(s = '', head = 6, tail = 6) {
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

export default function OnChainProof({ txSignature = '', network = 'devnet', anchoredId, status = 'anchored', className }) {
  const [copied, setCopied] = useState(false);
  const explorer = txSignature ? `https://explorer.solana.com/tx/${txSignature}?cluster=${network}` : null;
  const isMock = status === 'mock';

  const copy = () => {
    navigator.clipboard?.writeText(txSignature).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={cn('rounded-xl border border-accent-500/30 bg-accent-500/[0.06] p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent-500" />
          <span className="text-sm font-bold text-content-primary">
            {status === 'pending' ? 'Anchoring…' : 'Anchored on Solana'}
          </span>
        </div>
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary">
            {network}
          </span>
          {isMock && (
            <span className="rounded-full bg-warning-500/15 px-2 py-0.5 text-[11px] font-semibold text-warning-500">demo</span>
          )}
        </span>
      </div>
      {txSignature && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2">
          <Link2 className="h-4 w-4 shrink-0 text-content-muted" />
          <code className="flex-1 truncate font-mono text-xs text-content-secondary">{truncate(txSignature, 10, 10)}</code>
          <button onClick={copy} className="text-content-muted hover:text-content-primary transition-colors" title="Copy signature">
            {copied ? <Check className="h-4 w-4 text-accent-500" /> : <Copy className="h-4 w-4" />}
          </button>
          {explorer && (
            <a href={explorer} target="_blank" rel="noreferrer" className="text-content-muted hover:text-brand-600 transition-colors" title="View on Solana Explorer">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      )}
      {anchoredId && <p className="mt-2 font-mono text-[11px] text-content-muted">id: {anchoredId}</p>}
    </div>
  );
}
