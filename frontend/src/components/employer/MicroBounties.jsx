import { motion } from 'framer-motion';
import { Plus, Hexagon, ArrowRight, Trophy } from 'lucide-react';
import { MICRO_BOUNTIES } from '../../mock/data';
import { TIER_CONFIG } from '../../lib/credScore';
import { Card, Badge, Button } from '../ui';
import { stagger, staggerItem } from '../../theme/motion';

const STATUS_TONE = {
  open: 'success',
  reviewing: 'warning',
  closed: 'neutral',
};

export default function MicroBounties({ isEmployer = false }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-content-primary">Micro-Bounties</h3>
          <p className="mt-1 max-w-lg text-xs leading-relaxed text-content-secondary">
            Post a skill challenge with automated tests. Verified students — including those currently in school — earn
            confirmed credentials for passing. You discover pre-tested talent before anyone else.
          </p>
        </div>
        {isEmployer && (
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} className="shrink-0">
            Post a bounty
          </Button>
        )}
      </div>

      <motion.div variants={stagger(0.05)} initial="initial" animate="animate" className="space-y-4">
        {MICRO_BOUNTIES.map((b) => {
          const reqTier = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
          return (
            <motion.div key={b.id} variants={staggerItem}>
              <Card interactive className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm">{b.companyLogo}</span>
                      <span className="text-xs font-bold text-brand-600">{b.company}</span>
                      <Badge tone={STATUS_TONE[b.status] || 'success'} variant="soft" size="sm" className="capitalize">
                        {b.status}
                      </Badge>
                      <Badge tone="neutral" variant="soft" size="sm">
                        {reqTier.icon} {reqTier.label}+
                      </Badge>
                    </div>
                    <h4 className="mt-1.5 text-sm font-bold text-content-primary">{b.title}</h4>
                    <p className="mt-0.5 text-xs text-content-secondary">
                      {b.skill}
                      {b.tests > 0 ? ` · ${b.tests} automated tests` : ' · Portfolio review'}
                      {b.deadline ? ` · ${b.deadline}` : ''}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium text-accent-600">{b.openTo}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xl font-black text-content-primary">{b.reward}</p>
                    <p className="text-[10px] uppercase tracking-wide text-content-muted">reward</p>
                  </div>
                </div>

                {(b.skillTags || []).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {b.skillTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-bg-sunken px-2 py-0.5 text-[10px] text-content-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-content-muted">
                  <Hexagon className="h-3 w-3 text-brand-500" />
                  <span>Passing earns a Solana-anchored verified credential on completion</span>
                </div>

                <Button variant="secondary" size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} className="mt-4">
                  View challenge
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <Card className="border-dashed bg-bg-sunken p-6 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-600">
          <Trophy className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-content-primary">Find talent before graduation day.</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-content-secondary">
          Students build their verified record while still in school. Post a bounty and get first access — before they
          interview anywhere else.
        </p>
        {isEmployer && (
          <Button size="sm" rightIcon={<ArrowRight className="h-4 w-4" />} className="mt-3">
            Post your first bounty
          </Button>
        )}
      </Card>
    </div>
  );
}
