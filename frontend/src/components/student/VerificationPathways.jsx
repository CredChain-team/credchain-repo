/**
 * CredChain — Verification Pathways
 * 5 pathways. Pathways 1 & 2 are live. 3, 4, 5 are shown as coming soon.
 * Higher pathway weight → higher CredScore → more tasks you qualify for.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Link2, Landmark, Users, Package, Palette, ChevronDown, ArrowRight, Lightbulb, Clock, PlusCircle,
} from 'lucide-react';
import { Card, Badge, Button } from '../ui';

const PATHWAYS = [
  {
    id: 'platform',
    icon: Link2,
    label: 'Connect an account',
    badge: 'Strongest proof',
    badgeTone: 'success',
    desc: 'Link Coursera, GitHub, Audiomack, Behance, Dribbble, edX, or 20+ other accounts. Nothing to upload — the proof comes straight from them, so it can\'t be faked.',
    weight: 'Strongest proof',
    examples: ['Coursera', 'GitHub', 'Audiomack', 'Behance', 'Dribbble', 'edX', 'LinkedIn Learning', 'Google Certs', 'Meta Blueprint', 'Udemy'],
    live: true,
    action: 'Connect an account',
  },
  {
    id: 'institutional',
    icon: Landmark,
    label: 'From your school or employer',
    badge: 'Trusted senders',
    badgeTone: 'brand',
    desc: 'Your school, bootcamp, or professional body sends skills straight to your vault — including your results the day they\'re confirmed. Nothing to upload, no waiting.',
    weight: 'Very strong proof',
    examples: ['NUC', 'JAMB', 'WAEC', 'NECO', 'COREN', 'MDCN', 'NABTEB', 'CAC', 'ICAN', 'Decagon', 'Andela Learning'],
    live: true,
    action: 'Check if my school is set up',
  },
  {
    id: 'peer',
    icon: Users,
    label: 'A vouch from a pro',
    badge: 'Reputation-backed',
    badgeTone: 'violet',
    desc: 'Experienced people put their own reputation on the line to vouch for your skill. Because they\'d lose it if they\'re wrong, their word actually means something — unlike a quick endorsement from a friend.',
    weight: 'Strong proof',
    note: 'They lose their stake if the vouch turns out to be false. That\'s what makes it count.',
    live: true,
    action: 'Request a vouch',
  },
  {
    id: 'delivery',
    icon: Package,
    label: 'Paid work you\'ve delivered',
    badge: 'Hardest to fake',
    badgeTone: 'violet',
    desc: 'Every paid task you finish and a client confirms strengthens your skills automatically. You can\'t fake 20 real jobs that real clients paid for and confirmed. This is the hardest proof to get — and the most trusted.',
    weight: 'Builds up over time',
    note: 'This grows on its own as you finish tasks in the Earn tab.',
    live: true,
    action: 'View my delivered work',
  },
  {
    id: 'portfolio',
    icon: Palette,
    label: 'Show your work',
    badge: 'Coming soon',
    badgeTone: 'warning',
    desc: 'Send in 3–5 samples of your work. AI takes a first look, but real people make the final call — the AI never decides on its own. Great for writing, design, music, and other creative skills.',
    weight: 'Solid proof',
    live: false,
  },
];

export default function VerificationPathways({ onSelectPathway }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
          <PlusCircle className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-content-primary">Add a verified skill</h3>
          <p className="mt-0.5 text-xs text-content-secondary">
            Five ways to prove what you can do. The stronger the proof, the higher your CredScore — and the more paid work you qualify for in the Earn tab.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {PATHWAYS.map((p) => {
          const Icon = p.icon;
          const isOpen = expanded === p.id;
          return (
            <div key={p.id}
              className={`rounded-xl border transition-colors ${isOpen ? 'border-brand-300 bg-bg-brand-soft' : 'border-border-subtle bg-bg-elevated hover:bg-bg-sunken'}`}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : p.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-brand-soft text-brand-600">
                    <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-content-primary">{p.label}</span>
                      <Badge tone={p.badgeTone} variant="soft" size="sm">{p.badge}</Badge>
                    </div>
                    <span className="text-[11px] text-content-muted">{p.weight}</span>
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
                          Coming soon — for now, use the other ways above to build your CredScore.
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
