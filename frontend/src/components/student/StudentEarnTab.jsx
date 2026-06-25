/**
 * CredChain — Student Earn Tab
 *
 * The in-school economy surface. Students see micro-bounties matched
 * to their verified skill tier. Their credential IS the application.
 * No CV. No cover letter. No "2 years experience required."
 * Payment locked in Solana escrow before work begins.
 */
import { useState } from 'react';
import { MICRO_BOUNTIES } from '../../mock/data';
import { TIER_CONFIG, TIER_ORDER, tierMeetsRequirement } from '../../lib/credScore';

export default function StudentEarnTab({ verified = [], credScore = 300, academicStatus = 'in_school', onApply }) {
  const [filter, setFilter] = useState('all');

  const studentHighestTier = verified.reduce((best, v) => {
    const tier = v.trustTier || 'learner';
    return TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(best) ? tier : best;
  }, 'learner');

  const eligible = MICRO_BOUNTIES.filter(b => tierMeetsRequirement(studentHighestTier, b.requiredTier));
  const shown    = filter === 'eligible' ? eligible : MICRO_BOUNTIES;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Your skill is your application. 💰
            </h3>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed max-w-xl">
              Real companies post skill challenges here. You apply with your
              verified credentials — no CV, no cover letter, no "years of experience required."
              Payment is locked in Solana escrow before you start.
              You deliver. SOL hits your wallet.
              {academicStatus === 'in_school' && (
                <strong className="text-blue-700"> You can earn right now, from school.</strong>
              )}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-black text-blue-600">{eligible.length}</p>
            <p className="text-xs text-gray-500">tasks you qualify for</p>
            <p className="text-[11px] text-indigo-500 mt-0.5 font-medium capitalize">
              {TIER_CONFIG[studentHighestTier]?.icon} {TIER_CONFIG[studentHighestTier]?.label} tier
            </p>
          </div>
        </div>

        {credScore < 450 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
            💡 CredScore {credScore}. Verify more skills or complete your first task to unlock higher-paying bounties.
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {[
          ['all',      `All tasks (${MICRO_BOUNTIES.length})`],
          ['eligible', `I qualify (${eligible.length})`],
        ].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${filter === val ? 'bg-blue-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {shown.map((b) => {
          const qualifies = tierMeetsRequirement(studentHighestTier, b.requiredTier);
          const reqTier   = TIER_CONFIG[b.requiredTier] || TIER_CONFIG.learner;
          return (
            <article key={b.id}
              className={`rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${qualifies ? 'border-gray-200' : 'border-gray-100 opacity-70'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{b.companyLogo}</span>
                    <span className="text-xs font-bold text-blue-600">{b.company}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${qualifies ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      {qualifies ? '✓ You qualify' : `Needs ${reqTier.label}`}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-gray-900">{b.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.skill}
                    {b.tests > 0 && ` · ${b.tests} automated tests`}
                    {b.tests === 0 && ' · Portfolio review'}
                    {b.deadline && ` · ${b.deadline} to complete`}
                  </p>
                  <p className="mt-1.5 text-[11px] text-emerald-600 font-medium">{b.openTo}</p>

                  {/* Skill tags */}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(b.skillTags || []).map(tag => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-gray-900">{b.reward}</p>
                  <p className="text-[10px] text-gray-400">+15 CredScore</p>
                </div>
              </div>

              {/* Escrow notice */}
              <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-500">
                <span className="text-blue-400">⬡</span>
                <span>Payment locked in Solana escrow before you start</span>
                {b.escrowConfirmed && (
                  <span className="text-emerald-500 font-medium">· Escrow confirmed</span>
                )}
              </div>

              {/* Credential awarded */}
              {b.credentialAwarded && (
                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-indigo-600">
                  <span>🏅</span>
                  <span>Earns: <strong>{b.credentialAwarded}</strong> credential on completion</span>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <button onClick={() => qualifies && onApply?.(b)} disabled={!qualifies}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all active:scale-[0.97] ${qualifies ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>
                  {qualifies ? 'Apply with my credentials →' : `Need ${reqTier.label} tier`}
                </button>
                {!qualifies && (
                  <span className="flex items-center text-[11px] text-blue-600">
                    Verify more skills to unlock →
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">How CredChain tasks work</p>
        <div className="grid grid-cols-4 gap-3 text-center text-[11px]">
          {[
            ['Apply', '🎯', 'Your verified credential is the application — no CV needed'],
            ['Escrow', '⬡', 'Client locks full payment on Solana before you start work'],
            ['Deliver', '📦', 'Submit your work. Client has 72 hours to confirm or dispute.'],
            ['Earn',   '💰', 'SOL hits your wallet. CredScore rises. Tier may upgrade.'],
          ].map(([step, icon, desc], i) => (
            <div key={i}>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm">{icon}</div>
              <p className="font-bold text-gray-800">{step}</p>
              <p className="text-gray-500 leading-tight mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
