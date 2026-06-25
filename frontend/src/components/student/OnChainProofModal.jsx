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
      title={credential.title}
      description="Solana-anchored, tamper-evident credential record."
      size="lg"
      footer={
        explorer ? (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand-600 px-5 text-sm font-semibold text-white transition-all hover:bg-brand-700 hover:shadow-brand"
          >
            Open in Solana Explorer
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          <p className="rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-center text-xs text-content-muted">
            Anchored off-chain (no fee-payer wallet configured). The fingerprint is still tamper-evident.
          </p>
        )
      }
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">On-Chain Proof</p>

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
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-content-muted">Raw metadata (W3C VC)</p>
        <pre className="max-h-56 overflow-auto rounded-md border border-border-subtle bg-bg-sunken p-4 font-mono text-[13px] leading-relaxed text-content-secondary scroll-thin">
{JSON.stringify(vc, null, 2)}
        </pre>
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
