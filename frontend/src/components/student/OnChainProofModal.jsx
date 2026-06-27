// ─────────────────────────────────────────────────────────────
// CredChain — "View On-Chain Proof" modal (the key demo moment)
// Simulates a Solana Explorer view of a credential's anchor: a W3C
// Verifiable-Credential-shaped metadata object, the 64-char SHA-256
// fingerprint, a block slot, and the transaction signature with a real
// Explorer (Devnet) deep link when one exists.
// ─────────────────────────────────────────────────────────────

import { ExternalLink } from 'lucide-react';
import { shortHash } from '../../lib/format';
import { Modal, OnChainProof } from '../ui';

// Deterministic pseudo "block slot" derived from the signature so the demo
// shows a stable, believable number without inventing randomness each render.
function slotFrom(sig) {
  if (!sig) return null;
  let acc = 0;
  for (let i = 0; i < sig.length; i += 1) acc = (acc * 31 + sig.charCodeAt(i)) % 1_000_000_000;
  return 280_000_000 + (acc % 9_000_000);
}

export default function OnChainProofModal({ credential, onClose }) {
  if (!credential) return null;

  const hash = credential.sha256Hash || credential.hash || null;
  const sig = credential.solanaTxSignature || credential.txSignature || null;
  const explorer = credential.explorerUrl || (sig ? `https://explorer.solana.com/tx/${sig}?cluster=devnet` : null);

  // W3C Verifiable Credential-shaped metadata (off-chain record; only the hash
  // is anchored on-chain — the custodial model keeps the chain anonymous).
  const vc = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'CredChainCredential'],
    issuer: credential.issuer || 'Verified Issuer',
    issuanceDate: credential.createdAt || null,
    credentialSubject: { achievement: credential.title },
    proof: {
      type: 'SolanaMemoAnchor2026',
      network: 'solana:devnet',
      sha256Fingerprint: hash,
      transactionSignature: sig,
    },
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Proof this is real"
      description={`${credential.title} — saved permanently so it can't be faked or changed.`}
      size="lg"
      footer={
        explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-brand"
          >
            See the public record
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-center text-xs text-content-muted">
            Saved with a unique fingerprint that proves it hasn't been changed.
          </p>
        )
      }
    >
      <div className="flex items-center justify-between rounded-xl border border-accent-500/30 bg-accent-500/[0.07] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-bold text-accent-600 dark:text-accent-400">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-500" />
          </span>
          Live &amp; verified
        </span>
        <span className="text-[11px] font-medium text-content-muted">Saved permanently · can’t be changed</span>
      </div>

      <p className="mt-3 rounded-xl border border-border-subtle bg-bg-sunken px-4 py-3 text-xs leading-relaxed text-content-secondary">
        Every verified skill gets a unique fingerprint that's saved permanently. Anyone can check it, and no one can change or fake it. The technical details below are that proof.
      </p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-600">The proof</p>

      <OnChainProof
        txSignature={sig || ''}
        network="devnet"
        anchoredId={credential.id}
        status={sig ? 'anchored' : 'mock'}
        className="mt-3"
      />

      <dl className="mt-4 space-y-2 text-sm">
        <ProofRow k="Status" v={<span className="font-semibold text-accent-600 dark:text-accent-400">✓ {credential.status}</span>} />
        <ProofRow k="Network" v="Solana Devnet" />
        <ProofRow k="Block slot" v={slotFrom(sig) ? slotFrom(sig).toLocaleString() : '—'} />
        <ProofRow k="SHA-256 fingerprint" v={<code className="break-all font-mono text-[13px] text-brand-600">{hash || '—'}</code>} mono />
        <ProofRow k="Tx signature" v={<span className="font-mono text-[13px] text-brand-600">{sig ? shortHash(sig, 10, 8) : '— (off-chain only)'}</span>} />
      </dl>

      <div className="mt-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">The full record (for the curious)</p>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-inner-sm">
          <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[10px] text-slate-500">credential.json</span>
          </div>
          <pre className="max-h-56 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-emerald-300 scroll-thin">
{JSON.stringify(vc, null, 2)}
          </pre>
        </div>
      </div>
    </Modal>
  );
}

function ProofRow({ k, v, mono }) {
  return (
    <div className={`flex justify-between gap-3 ${mono ? 'flex-col' : 'items-center'}`}>
      <dt className="shrink-0 text-content-muted">{k}</dt>
      <dd className={`text-content-secondary ${mono ? '' : 'text-right'}`}>{v}</dd>
    </div>
  );
}
