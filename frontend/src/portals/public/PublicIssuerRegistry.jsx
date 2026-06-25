// ─────────────────────────────────────────────────────────────
// CredChain — Public Issuer Registry (Section 5.2)
// Logged-out, browsable. Anyone — a skeptical employer, a worried parent, a
// journalist — can check whether an institution is actually verified on
// CredChain and at what trust tier. (Mock list per Execution Plan step 4.)
// ─────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Building2 } from 'lucide-react';
import PublicLayout from './PublicLayout';
import { PUBLIC_ISSUERS } from '../../mock/data';
import { Card, Badge, Input, EmptyState, TrustTier } from '../../components/ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function PublicIssuerRegistry() {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return PUBLIC_ISSUERS;
    return PUBLIC_ISSUERS.filter((i) =>
      [i.name, i.type, i.country, i.tier].join(' ').toLowerCase().includes(s)
    );
  }, [q]);

  return (
    <PublicLayout fullBleed>
      {/* Hero */}
      <div className="relative overflow-hidden bg-grad-brand py-20 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative px-4">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl font-extrabold tracking-tight text-white"
          >
            Public Issuer Registry
          </motion.h1>
          <p className="mt-3 text-lg text-white/80">Every verified issuer and its current trust tier. No account needed.</p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, type, country…"
              leftIcon={<Search />}
              className="h-12 bg-bg-elevated shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Issuer grid */}
      <motion.div
        variants={stagger(0.04)}
        initial="initial"
        animate="animate"
        className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-6 py-10 sm:grid-cols-2 lg:grid-cols-3"
      >
        {filtered.map((i) => (
          <motion.div key={i.id} variants={staggerItem}>
            <Card interactive className="h-full">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold tracking-tight text-content-primary">{i.name}</p>
                  <p className="mt-0.5 text-xs text-content-secondary">{i.type} · {i.country}</p>
                </div>
                <TrustTier tier={i.tier} size="sm" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
                <div>
                  <p className="text-sm font-bold text-content-primary">{i.issued.toLocaleString()}</p>
                  <p className="text-[10px] uppercase tracking-wide text-content-muted">Issued</p>
                </div>
                <div>
                  <p className={`text-sm font-bold ${i.disputesUpheld === 0 ? 'text-accent-600' : 'text-warning-500'}`}>{i.disputesUpheld}</p>
                  <p className="text-[10px] uppercase tracking-wide text-content-muted">Disputes upheld</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={Building2}
              title={`No issuers match “${q}”`}
              description="Try a different name, type, or country."
            />
          </div>
        )}
      </motion.div>
      <p className="mx-auto max-w-6xl px-6 pb-10 text-xs text-content-muted">
        Trust tiers are earned over a clean track record — no upheld disputes, consistent issuance, positive outcomes. Fame is not a factor.
      </p>
    </PublicLayout>
  );
}
