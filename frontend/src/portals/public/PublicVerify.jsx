// ─────────────────────────────────────────────────────────────
// CredChain — Public student verification page (/verify/student/:credchainId)
// Logged-out target of the student's shareable link / QR. Pulls the REAL
// public profile (only on-chain, accepted credentials are surfaced) and shows
// each credential's live SVG badge + Explorer link.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from './PublicLayout';
import { getPublicProfile, badgeUrl } from '../../services/api';

export default function PublicVerify() {
  const { credchainId } = useParams();
  const [profile, setProfile] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    let alive = true;
    getPublicProfile(credchainId)
      .then((data) => { if (alive) { setProfile(data?.profile || null); setState('ready'); } })
      .catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, [credchainId]);

  return (
    <PublicLayout>
      {state === 'loading' && (
        <div className="flex items-center justify-center gap-3 py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm text-gray-500">Verifying…</span>
        </div>
      )}
      {state === 'error' && (
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
          <p className="text-3xl">🔍</p>
          <h1 className="mt-2 text-lg font-semibold tracking-tight text-gray-900">No public profile found</h1>
          <p className="mt-1 text-sm text-gray-500">The link <span className="font-mono text-[13px] text-blue-700">{credchainId}</span> doesn’t match a CredChain profile.</p>
        </div>
      )}
      {state === 'ready' && profile && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-700">✓ Verified on CredChain</span>
              <span className="font-mono text-[13px] text-emerald-700">{profile.credchainId}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-emerald-900">{profile.name}</h1>
            <p className="text-sm text-emerald-700">{profile.headline || 'Verified on CredChain'}</p>
          </div>

          <h2 className="mt-6 text-lg font-semibold tracking-tight text-gray-900">Verified credentials</h2>
          <div className="mt-3 space-y-3">
            {(profile.credentials || []).length === 0 && (
              <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-400">
                No on-chain credentials published yet.
              </p>
            )}
            {(profile.credentials || []).map((c) => (
              <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.issuer || 'Verified Issuer'}</p>
                  </div>
                  <img src={badgeUrl(c.id)} alt="Live badge" className="h-6" />
                </div>
                {c.explorerUrl && (
                  <a href={c.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-medium text-blue-600 hover:underline">
                    View on Solana Explorer ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
