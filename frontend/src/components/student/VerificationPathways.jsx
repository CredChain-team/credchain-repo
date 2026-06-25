/**
 * CredChain — Verification Pathways
 * 5 pathways. Pathways 1 & 2 are live. 3, 4, 5 are shown as coming soon.
 * Higher pathway weight → higher CredScore → more tasks you qualify for.
 */
import { useState } from 'react';

const PATHWAYS = [
  {
    id: 'platform',
    icon: '🔗',
    label: 'Platform Integration',
    badge: 'Highest trust',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    desc: 'Connect Coursera, GitHub, Audiomack, Behance, Dribbble, edX, or 20+ other platforms directly. No upload — data comes from their servers. Forgery is impossible by design.',
    weight: '0.60–0.95',
    examples: ['Coursera', 'GitHub', 'Audiomack', 'Behance', 'Dribbble', 'edX', 'LinkedIn Learning', 'Google Certs', 'Meta Blueprint', 'Udemy'],
    live: true,
    action: 'Connect a platform',
  },
  {
    id: 'institutional',
    icon: '🏛️',
    label: 'Institutional Push',
    badge: 'Verified issuers',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    desc: 'Your university, bootcamp, or professional body mints credentials directly to your vault — including your Statement of Result the day results are confirmed. No upload, no waiting.',
    weight: '0.60–0.90',
    examples: ['NUC', 'JAMB', 'WAEC', 'NECO', 'COREN', 'MDCN', 'NABTEB', 'CAC', 'ICAN', 'Decagon', 'Andela Learning'],
    live: true,
    action: 'Check if my institution is verified',
  },
  {
    id: 'peer',
    icon: '👥',
    label: 'Staked Peer Attestation',
    badge: 'Coming soon',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Verified practitioners stake real SOL to vouch for your skill. Economic skin-in-the-game makes the attestation trustworthy — not just a LinkedIn endorsement from a friend.',
    weight: '0.35–0.70',
    note: 'Stakes are slashed if the attestation is later disputed. This is why it counts.',
    live: false,
  },
  {
    id: 'delivery',
    icon: '📦',
    label: 'Demonstrated Delivery',
    badge: 'Most fraud-resistant',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    desc: 'Every confirmed paid bounty task upgrades your credential automatically. You cannot fake 20 paid deliveries where real clients confirmed real work and SOL moved on Solana as evidence. This pathway is the hardest to get and the most trusted.',
    weight: '+0.05 per confirmed task',
    note: 'This pathway grows automatically as you complete tasks in the Earn tab.',
    live: false,
  },
  {
    id: 'portfolio',
    icon: '🎨',
    label: 'Portfolio AI Assessment',
    badge: 'Coming soon',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    desc: 'Submit 3–5 work samples. AI analyses quality markers. Human peer reviewers make the final call — the AI never approves or rejects alone. For writing, design, music, and creative skills.',
    weight: '0.35–0.65',
    live: false,
  },
];

export default function VerificationPathways({ onSelectPathway }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-gray-900">Add a Verified Credential</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Five pathways to prove what you know. Higher pathway weight = higher CredScore = more tasks you qualify for in the Earn tab.
        </p>
      </div>

      <div className="space-y-2">
        {PATHWAYS.map((p) => (
          <div key={p.id}
            className={`rounded-xl border transition-all duration-200 ${expanded === p.id ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'}`}>
            <button type="button" onClick={() => setExpanded(expanded === p.id ? null : p.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${p.badgeColor}`}>{p.badge}</span>
                  </div>
                  <span className="text-[11px] text-gray-500">Pathway weight: {p.weight}</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{expanded === p.id ? '▲' : '▼'}</span>
            </button>

            {expanded === p.id && (
              <div className="border-t border-gray-100 px-4 py-3">
                <p className="text-xs leading-relaxed text-gray-600">{p.desc}</p>

                {p.examples && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.examples.map(ex => (
                      <span key={ex} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600">{ex}</span>
                    ))}
                  </div>
                )}

                {p.note && (
                  <p className="mt-2 text-[11px] text-violet-600 font-medium">💡 {p.note}</p>
                )}

                {p.live ? (
                  <button type="button" onClick={() => onSelectPathway?.(p.id)}
                    className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 active:scale-[0.97]">
                    {p.action} →
                  </button>
                ) : (
                  <p className="mt-3 text-[11px] font-medium text-amber-600">
                    ⏳ Launching soon — verify credentials via live pathways now to build your CredScore.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
