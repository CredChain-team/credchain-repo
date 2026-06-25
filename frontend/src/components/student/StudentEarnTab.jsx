/**
 * CredChain — Student Earn Tab
 *
 * The in-school economy surface. Students see micro-bounties matched
 * to their verified skill tier. Their credential IS the application.
 * No CV. No cover letter. No "2 years experience required."
 * Payment locked in Solana escrow before work begins.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Lock, Hexagon, Target, Package, Coins, Award, Lightbulb, ArrowRight,
} from 'lucide-react';
import { MICRO_BOUNTIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER, tierMeetsRequirement } from '../../lib/credScore';
import { Card, Badge, Button } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

export default function StudentEarnTab({ verified = [], credScore = 300, academicStatus = 'in_school', onApply }) {
  const [filter, setFilter] = useState('all');

  const studentHighestTier = verified.reduce((best, v) => {
    const tier = v.trustTier || 'learner';
    return TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(best) ? tier : best;
  }, 'learner');

  const eligible = MICRO_BOUNTIES.filter(b => tierMeetsRequirement(studentHighestTier, b.requiredTier));
  const shown = filter === 'eligible' ? eligible : MICRO_BOUNTIES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="overflow-hidden rounded-lg border border-border-subtle bg-grad-hero p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-content-primary">
              <Coins className="h-5 w-5 text-brand-600" /> Your skill is your application.
            </h3>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-content-secondary">
              Real companies post skill challenges here. You apply with your
              verified credentials — no CV, no cover letter, no "years of experience required."
              Payment is locked in Solana escrow before you start.
              You deliver. SOL hits your wallet.
              {academicStatus === 'in_school' && (
                <strong className="text-brand-700 dark:text-brand-300"> You can earn right now, from school.</strong>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tnum text-3xl font-black text-brand-600">{eligible.length}</p>
            <p className="text-xs text-content-muted">tasks you qualify for</p>
            <p className="mt-1 text-[11px] font-medium capitalize text-violet-500">
              {TIER_CONFIG[studentHighestTier]?.icon} {TIER_CONFIG[studentHighestTier]?.label} tier
            </p>
          </div>
        </div>

        {credScore < 450 && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-warning-500/30 bg-warning-500/10 px-4 py-2.5 text-xs text-warning-500">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>CredScore {credScore}. Verify more skills or complete your first task to unlock higher-paying bounties.</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {[
          ['all', `All tasks (${MICRO_BOUNTIES.length})`],
          ['eligible', `I qualify (${eligible.length})`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === val ? 'bg-brand-600 text-white' : 'border border-border-subtle bg-bg-elevated text-content-secondary hover:bg-bg-sunken'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <motion.div variants={stagger(0.06)} initial="initial" animate="animate" className="space-y-3">
        {shown.map((b) => {
          const qualifies = tierMeetsRequirement(studentHighestTier, b.requiredTier);
          const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
          return (
            <motion.article
              key={b.id}
              variants={staggerItem}
              className={`rounded-lg border bg-bg-elevated p-5 shadow-sm transition-all hover:shadow-md ${qualifies ? 'border-border-subtle' : 'border-border-subtle opacity-70'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{b.companyLogo}</span>
                    <span className="text-xs font-bold text-brand-600">{b.company}</span>
                    {qualifies ? (
                      <Badge tone="success" variant="soft" size="sm" icon={<CheckCircle2 />}>You qualify</Badge>
                    ) : (
                      <Badge tone="neutral" variant="soft" size="sm" icon={<Lock />}>Needs {reqTier.label}</Badge>
                    )}
                  </div>
                  <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
                  <p className="mt-0.5 text-xs text-content-muted">
                    {b.skill}
                    {b.tests > 0 && ` · ${b.tests} automated tests`}
                    {b.tests === 0 && ' · Portfolio review'}
                    {b.deadline && ` · ${b.deadline} to complete`}
                  </p>
                  <p className="mt-1.5 text-[11px] font-medium text-accent-600 dark:text-accent-400">{b.openTo}</p>

                  {/* Skill tags */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(b.skillTags || []).map(tag => (
                      <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-muted">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-xl font-black text-content-primary">{b.reward}</p>
                  <p className="text-[10px] text-content-muted">+15 CredScore</p>
                </div>
              </div>

              {/* Escrow notice */}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-content-muted">
                <Hexagon className="h-3.5 w-3.5 text-brand-400" />
                <span>Payment locked in Solana escrow before you start</span>
                {b.escrowConfirmed && (
                  <span className="font-medium text-accent-600 dark:text-accent-400">· Escrow confirmed</span>
                )}
              </div>

              {/* Credential awarded */}
              {b.credentialAwarded && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-violet-600 dark:text-violet-400">
                  <Award className="h-3.5 w-3.5" />
                  <span>Earns: <strong>{b.credentialAwarded}</strong> credential on completion</span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3">
                <Button
                  size="sm"
                  variant={qualifies ? 'primary' : 'secondary'}
                  disabled={!qualifies}
                  onClick={() => qualifies && onApply?.(b)}
                  rightIcon={qualifies && <ArrowRight className="h-3.5 w-3.5" />}
                >
                  {qualifies ? 'Apply with my credentials' : `Need ${reqTier.label} tier`}
                </Button>
                {!qualifies && (
                  <span className="flex items-center gap-1 text-[11px] text-brand-600">
                    Verify more skills to unlock <ArrowRight className="h-3 w-3" />
                  </span>
                )}
              </div>
            </motion.article>
          );
        })}
      </motion.div>

      {/* How it works */}
      <Card padding="lg" className="bg-bg-sunken">
        <p className="mb-4 text-xs font-bold text-content-secondary">How CredChain tasks work</p>
        <div className="grid grid-cols-2 gap-4 text-center text-[11px] sm:grid-cols-4">
          {[
            ['Apply', Target, 'Your verified credential is the application — no CV needed'],
            ['Escrow', Hexagon, 'Client locks full payment on Solana before you start work'],
            ['Deliver', Package, 'Submit your work. Client has 72 hours to confirm or dispute.'],
            ['Earn', Coins, 'SOL hits your wallet. CredScore rises. Tier may upgrade.'],
          ].map(([step, Icon, desc], i) => (
            <div key={i}>
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-bg-brand-soft text-brand-600">
                <Icon className="h-4 w-4" />
              </div>
              <p className="font-bold text-content-primary">{step}</p>
              <p className="mt-0.5 leading-tight text-content-muted">{desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
