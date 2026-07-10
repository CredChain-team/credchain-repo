// ─────────────────────────────────────────────────────────────
// CredChain — Trust-First Talent Feed (Section 4.2)
// Real students from /api/v1/employer/talent-feed. CredScore is computed
// client-side from verifiable evidence only (no bias proxies). A 3-way trust
// filter (Verified only / Verified + Attested / Everything) gates which skill
// groups render per card; "Who Issued This?" chips link to the Public Issuer
// Registry; per-candidate Verification Report export.
// ─────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, MessageSquare, FileText, Download, ExternalLink, BadgeCheck, FlaskConical, Handshake } from 'lucide-react';
import { computeCredScore } from '../../lib/credScore';
import { downloadJson, printReport } from '../../lib/verificationReport';
import { Card, Avatar, Badge, Button, SkeletonCard, EmptyState } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

function reportCandidate(student, score) {
  return {
    id: student.id,
    name: student.name,
    country: '',
    credScore: score,
    globalTrustPass: false,
    verified: (student.verified || []).map((v) => ({ title: v.title, issuer: v.issuer, tier: 'Verified issuer', onChain: v.onChain })),
    attested: student.attested || [],
    sandbox: student.sandbox || [],
  };
}

// The three discrete trust views. Matches the existing UI's on/off language —
// a display filter, not a continuous score multiplier.
const VIEWS = [
  { key: 'verified', label: 'Verified only' },
  { key: 'attested', label: 'Verified + Attested' },
  { key: 'all', label: 'Everything' },
];

const VIEW_NOTE = {
  verified: 'Strict mode: showing only issuer-backed, Solana-anchored credentials.',
  attested: 'Showing verified credentials plus reputation-backed vouches (Attested).',
  all: 'Showing everything, including self-declared skills the student hasn’t had verified.',
};

export default function TalentFeed({ students, skillView = 'all', onChangeView, onMessage, employerName, loading }) {
  const showAttested = skillView === 'attested' || skillView === 'all';
  const showSandbox = skillView === 'all';

  return (
    <section>
      {/* 3-way trust filter */}
      <div className="mb-5">
        <div className="inline-flex rounded-xl border border-border-subtle bg-bg-elevated p-1 shadow-card">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => onChangeView?.(v.key)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                skillView === v.key
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-content-secondary hover:text-content-primary'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-brand-600">{VIEW_NOTE[skillView]}</p>
      </div>

      {loading && (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && students.length === 0 && (
        <EmptyState
          icon={Users}
          title="No candidates yet"
          description="No people with verified skills yet. Check back soon."
        />
      )}

      {!loading && students.length > 0 && (
        <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-4">
          {students.map((s) => {
            const { score } = computeCredScore(s.verified);
            const attested = s.attested || [];
            return (
              <motion.div key={s.id} variants={staggerItem}>
                <Card interactive className="group p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={s.name} size="lg" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold tracking-tight text-content-primary">{s.name}</p>
                        <p className="mt-0.5 font-mono text-[13px] text-content-muted">{s.credchainId}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-xl font-bold tracking-tight text-brand-600">{score}</p>
                      <p className="text-[10px] uppercase tracking-wide text-content-muted">CredScore</p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {s.verified.length === 0 && <p className="text-xs text-content-muted">No verified credentials yet.</p>}
                    {s.verified.map((v) => (
                      <span key={v.id} className="inline-flex items-center gap-1.5">
                        <Badge tone="success" variant="soft" icon={<BadgeCheck />}>
                          {v.title}
                          {v.onChain && <span className="ml-1 text-[10px] opacity-80">on-chain</span>}
                        </Badge>
                        <Link
                          to="/registry"
                          title="Who issued this? View the Public Issuer Registry"
                          className="inline-flex items-center gap-0.5 rounded-full border border-brand-300 bg-brand-soft px-2.5 py-0.5 text-xs text-brand-600 opacity-0 transition-opacity duration-150 hover:bg-brand-100 group-hover:opacity-100"
                        >
                          {v.issuer} <ExternalLink className="h-3 w-3" />
                        </Link>
                      </span>
                    ))}
                  </div>

                  {showAttested && attested.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {attested.map((skill, i) => (
                        <Badge key={i} tone="violet" variant="soft" icon={<Handshake />}>
                          {skill} <span className="ml-1 text-[10px] opacity-80">attested</span>
                        </Badge>
                      ))}
                    </div>
                  )}

                  {showSandbox && s.sandbox?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.sandbox.map((skill, i) => (
                        <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-0.5 text-[10px] text-content-secondary">
                          <FlaskConical className="h-3 w-3" /> {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" leftIcon={<MessageSquare className="h-4 w-4" />} onClick={() => onMessage(s, s.verified[0])}>
                      Message (1 credit)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<FileText className="h-4 w-4" />}
                      onClick={() => printReport(reportCandidate(s, score), employerName)}
                    >
                      Export report (PDF)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      leftIcon={<Download className="h-4 w-4" />}
                      onClick={() => downloadJson(reportCandidate(s, score), employerName)}
                    >
                      JSON
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </section>
  );
}
