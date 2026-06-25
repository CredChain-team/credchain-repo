// ─────────────────────────────────────────────────────────────
// CredChain — "View On-Chain Proof" modal (the key demo moment)
// Simulates a Solana Explorer view of a credential's anchor: a W3C
// Verifiable-Credential-shaped metadata object, the 64-char SHA-256
// fingerprint, a block slot, and the transaction signature with a real
// Explorer (Devnet) deep link when one exists.
// ─────────────────────────────────────────────────────────────

import { shortHash } from '../../lib/format';

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/5 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-2 text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-600"
        >
          ✕
        </button>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">On-Chain Proof</p>
          <h3 className="text-lg font-bold tracking-tight text-gray-900">{credential.title}</h3>
          <p className="mt-0.5 text-sm text-gray-500">Solana-anchored, tamper-evident credential record.</p>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <ProofRow k="Status" v={<span className="font-semibold text-emerald-600">✓ {credential.status}</span>} />
          <ProofRow k="Network" v="Solana Devnet" />
          <ProofRow k="Block slot" v={slotFrom(sig) ? slotFrom(sig).toLocaleString() : '—'} />
          <ProofRow k="SHA-256 fingerprint" v={<code className="break-all font-mono text-[13px] text-blue-700">{hash || '—'}</code>} mono />
          <ProofRow k="Tx signature" v={<span className="font-mono text-[13px] text-blue-600">{sig ? shortHash(sig, 10, 8) : '— (off-chain only)'}</span>} />
        </dl>

        <div className="mt-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Raw metadata (W3C VC)</p>
          <pre className="max-h-56 overflow-auto rounded-xl border border-gray-200 bg-slate-50 p-4 font-mono text-[13px] leading-relaxed text-blue-700">
{JSON.stringify(vc, null, 2)}
          </pre>
        </div>

        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-700 hover:shadow-md active:scale-[0.97]"
          >
            Open in Solana Explorer ↗
          </a>
        )}
        {!explorer && (
          <p className="mt-4 rounded-xl border border-gray-200 bg-slate-50 px-3 py-2 text-center text-xs text-gray-500">
            Anchored off-chain (no fee-payer wallet configured). The fingerprint is still tamper-evident.
          </p>
        )}
      </div>
    </div>
  );
}

function ProofRow({ k, v, mono }) {
  return (
    <div className={`flex justify-between gap-3 ${mono ? 'flex-col' : 'items-center'}`}>
      <dt className="shrink-0 text-gray-400">{k}</dt>
      <dd className="text-right text-gray-700">{v}</dd>
    </div>
  );
}
