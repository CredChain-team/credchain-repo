/**
 * CredChain — Verification Pathways
 * 5 pathways. Pathways 1 & 2 are live. 3, 4, 5 are shown as coming soon.
 * Higher pathway weight → higher CredScore → more tasks you qualify for.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Link2, Landmark, Users, Package, Palette, ChevronDown, ArrowRight, Lightbulb, Clock,
} from 'lucide-react';
import { Card, Badge, Button } from '../ui';

const PATHWAYS = [
  {
    id: 'platform',
    icon: Link2,
    label: 'Platform Integration',
    badge: 'Highest trust',
    badgeTone: 'success',
    desc: 'Connect Coursera, GitHub, Audiomack, Behance, Dribbble, edX, or 20+ other platforms directly. No upload — data comes from their servers. Forgery is impossible by design.',
    weight: '0.60–0.95',
    examples: ['Coursera', 'GitHub', 'Audiomack', 'Behance', 'Dribbble', 'edX', 'LinkedIn Learning', 'Google Certs', 'Meta Blueprint', 'Udemy'],
    live: true,
    action: 'Connect a platform',
  },
  {
    id: 'institutional',
    icon: Landmark,
    label: 'Institutional Push',
    badge: 'Verified issuers',
    badgeTone: 'brand',
    desc: 'Your university, bootcamp, or professional body mints credentials directly to your vault — including your Statement of Result the day results are confirmed. No upload, no waiting.',
    weight: '0.60–0.90',
    examples: ['NUC', 'JAMB', 'WAEC', 'NECO', 'COREN', 'MDCN', 'NABTEB', 'CAC', 'ICAN', 'Decagon', 'Andela Learning'],
    live: true,
    action: 'Check if my institution is verified',
  },
  {
    id: 'peer',
    icon: Users,
    label: 'Staked Peer Attestation',
    badge: 'Coming soon',
    badgeTone: 'warning',
    desc: 'Verified practitioners stake real SOL to vouch for your skill. Economic skin-in-the-game makes the attestation trustworthy — not just a LinkedIn endorsement from a friend.',
    weight: '0.35–0.70',
    note: 'Stakes are slashed if the attestation is later disputed. This is why it counts.',
    live: false,
  },
  {
    id: 'delivery',
    icon: Package,
    label: 'Demonstrated Delivery',
    badge: 'Most fraud-resistant',
    badgeTone: 'violet',
    desc: 'Every confirmed paid bounty task upgrades your credential automatically. You cannot fake 20 paid deliveries where real clients confirmed real work and SOL moved on Solana as evidence. This pathway is the hardest to get and the most trusted.',
    weight: '+0.05 per confirmed task',
    note: 'This pathway grows automatically as you complete tasks in the Earn tab.',
    live: false,
  },
  {
    id: 'portfolio',
    icon: Palette,
    label: 'Portfolio AI Assessment',
    badge: 'Coming soon',
    badgeTone: 'warning',
    desc: 'Submit 3–5 work samples. AI analyses quality markers. Human peer reviewers make the final call — the AI never approves or rejects alone. For writing, design, music, and creative skills.',
    weight: '0.35–0.65',
    live: false,
  },
];

export default function VerificationPathways({ onSelectPathway }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <Card padding="lg">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-content-primary">Add a Verified Credential</h3>
        <p className="mt-0.5 text-xs text-content-secondary">
          Five pathways to prove what you know. Higher pathway weight = higher CredScore = more tasks you qualify for in the Earn tab.
        </p>
      </div>

      <div className="space-y-2">
        {PATHWAYS.map((p) => {
          const Icon = p.icon;
          const isOpen = expanded === p.id;
          return (
            <div key={p.id}
              className={`rounded-md border transition-colors ${isOpen ? 'border-brand-300 bg-bg-brand-soft' : 'border-border-subtle bg-bg-elevated hover:bg-bg-sunken'}`}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-bg-brand-soft text-brand-600">
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-content-primary">{p.label}</span>
                      <Badge tone={p.badgeTone} variant="soft" size="sm">{p.badge}</Badge>
                    </div>
                    <span className="text-[11px] text-content-muted">Pathway weight: {p.weight}</span>
                  </div>
                </div>
                <ChevronDown className={`h-4 w-4 shrink-0 text-content-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border-subtle px-4 py-3">
                      <p className="text-xs leading-relaxed text-content-secondary">{p.desc}</p>

                      {p.examples && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {p.examples.map(ex => (
                            <span key={ex} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-secondary">{ex}</span>
                          ))}
                        </div>
                      )}

                      {p.note && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0" /> {p.note}
                        </p>
                      )}

                      {p.live ? (
                        <Button size="sm" className="mt-3" onClick={() => onSelectPathway?.(p.id)} rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
                          {p.action}
                        </Button>
                      ) : (
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-warning-500">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          Launching soon — verify credentials via live pathways now to build your CredScore.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
