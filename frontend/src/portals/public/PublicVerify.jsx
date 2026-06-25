// ─────────────────────────────────────────────────────────────
// CredChain — Public student verification page (/verify/student/:credchainId)
// Logged-out target of the student's shareable link / QR. Pulls the REAL
// public profile (only on-chain, accepted credentials are surfaced) and shows
// each credential's live SVG badge + Explorer link.
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, SearchX, ExternalLink, BadgeCheck } from 'lucide-react';
import PublicLayout from './PublicLayout';
import { getPublicProfile, badgeUrl } from '../../services/api';
import {
  Card,
  Badge,
  Skeleton,
  EmptyState,
  SuccessCheck,
  TrustTier,
  OnChainProof,
} from '../../components/ui';
import { fadeUp, stagger, staggerItem } from '../../theme/motion';

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
        <div className="mx-auto max-w-lg space-y-4">
          <Card className="flex flex-col items-center gap-4 py-10">
            <Skeleton variant="circle" w={72} h={72} />
            <Skeleton variant="text" lines={2} className="w-2/3" />
          </Card>
          <Skeleton variant="card" />
          <Skeleton variant="card" />
        </div>
      )}

      {state === 'error' && (
        <motion.div variants={fadeUp} initial="initial" animate="animate" className="mx-auto max-w-lg">
          <Card padding="lg" className="text-center">
            <EmptyState
              icon={SearchX}
              title="No public profile found"
              description={
                <>
                  The link <span className="font-mono text-[13px] text-brand-600">{credchainId}</span> doesn’t match a CredChain profile.
                </>
              }
            />
          </Card>
        </motion.div>
      )}

      {state === 'ready' && profile && (
        <motion.div variants={stagger(0.08)} initial="initial" animate="animate" className="mx-auto max-w-lg">
          {/* Verified hero */}
          <motion.div variants={staggerItem}>
            <Card padding="lg" className="relative overflow-hidden border-accent-500/30 bg-accent-500/[0.06] text-center">
              <div className="pointer-events-none absolute inset-0 bg-grad-verified opacity-[0.04]" />
              <div className="relative flex flex-col items-center">
                <SuccessCheck size={72} />
                <div className="mt-4 flex items-center gap-2">
                  <Badge tone="success" icon={<ShieldCheck />}>Verified on CredChain</Badge>
                  <span className="font-mono text-[13px] text-accent-600 dark:text-accent-400">{profile.credchainId}</span>
                </div>
                <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-content-primary">{profile.name}</h1>
                <p className="mt-1 text-sm text-content-secondary">{profile.headline || 'Verified on CredChain'}</p>
              </div>
            </Card>
          </motion.div>

          {/* Credentials */}
          <motion.h2 variants={staggerItem} className="mt-8 flex items-center gap-2 text-lg font-bold tracking-tight text-content-primary">
            <BadgeCheck className="h-5 w-5 text-brand-600" />
            Verified credentials
          </motion.h2>

          <div className="mt-3 space-y-3">
            {(profile.credentials || []).length === 0 && (
              <motion.div variants={staggerItem}>
                <Card>
                  <EmptyState
                    icon={BadgeCheck}
                    title="No on-chain credentials yet"
                    description="This profile has no published, on-chain credentials to show right now."
                  />
                </Card>
              </motion.div>
            )}

            {(profile.credentials || []).map((c) => (
              <motion.div key={c.id} variants={staggerItem}>
                <Card interactive>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-content-primary">{c.title}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-xs text-content-secondary">{c.issuer || 'Verified Issuer'}</p>
                        <TrustTier tier={c.issuerTier ?? 'verified'} size="sm" />
                      </div>
                    </div>
                    <img src={badgeUrl(c.id)} alt="Live badge" className="h-7 shrink-0" />
                  </div>

                  <OnChainProof
                    className="mt-3"
                    txSignature={c.txSignature || ''}
                    network={c.network || 'devnet'}
                    anchoredId={c.id}
                    status={c.txSignature ? 'anchored' : 'mock'}
                  />

                  {c.explorerUrl && (
                    <a
                      href={c.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                    >
                      View on Solana Explorer
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </PublicLayout>
  );
}
