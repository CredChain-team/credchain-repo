/**
 * CredChain — Frontend CredScore engine
 * Mirrors backend formula exactly. Server score always takes priority.
 *
 * Formula (same as backend):
 *   pathwayScore   = min(totalCompositeWeight, 1.0) × 200  → max 200
 *   deliveryScore  = min(completedDeliveries × 15, 300)     → max 300
 *   disputePenalty = confirmedDisputesAgainst × 40
 *   tenureBonus    = floor(monthsActive / 3) × 10           → max 100
 *   range: 300–850
 *
 * A 200-level student with verified skills and paid deliveries
 * outscores a graduate with only a degree. This is intentional.
 */

export const SCORE_MIN = 300;
export const SCORE_MAX = 850;

export function computeCredScore(verifiedCredentials = [], serverCredScore = null) {
  // Server score has delivery + tenure data — always prefer it
  if (serverCredScore && typeof serverCredScore.value === 'number') {
    const { value, breakdown } = serverCredScore;
    return {
      score: value,
      breakdown: {
        pathwayScore:   breakdown?.pathwayScore   ?? 0,
        deliveryScore:  breakdown?.deliveryScore  ?? 0,
        disputePenalty: breakdown?.disputePenalty ?? 0,
        tenureBonus:    breakdown?.tenureBonus    ?? 0,
        total:          verifiedCredentials.length,
        onChainCount:   verifiedCredentials.filter(c => c.solanaTxSignature || c.txSignature).length,
      },
      contributions: verifiedCredentials.map(c => ({
        title:           c.title,
        tier:            c.trustTier || 'learner',
        compositeWeight: c.compositeWeight || 0.2,
        onChain:         Boolean(c.solanaTxSignature || c.txSignature),
        skillCategory:   c.skillCategory || 'Other',
        skillTags:       c.skillTags || [],
      })),
    };
  }

  // Client-side estimate (no server score available yet)
  const totalWeight = Math.min(
    1.0,
    verifiedCredentials.reduce((sum, c) => sum + (c.compositeWeight || 0.2), 0)
  );
  const pathwayScore = Math.round(totalWeight * 200);
  const score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, SCORE_MIN + pathwayScore));
  const onChainCount = verifiedCredentials.filter(c => c.solanaTxSignature || c.txSignature).length;

  return {
    score,
    breakdown: {
      pathwayScore, deliveryScore: 0, disputePenalty: 0, tenureBonus: 0,
      total: verifiedCredentials.length, onChainCount,
    },
    contributions: verifiedCredentials.map(c => ({
      title:           c.title,
      tier:            c.trustTier || 'learner',
      compositeWeight: c.compositeWeight || 0.2,
      onChain:         Boolean(c.solanaTxSignature || c.txSignature),
      skillCategory:   c.skillCategory || 'Other',
      skillTags:       c.skillTags || [],
    })),
  };
}

export function scoreBand(score) {
  if (score >= 800) return { label: 'Elite',            color: '#34d399', bg: 'bg-emerald-50', text: 'text-emerald-700' };
  if (score >= 740) return { label: 'Trusted',          color: '#10b981', bg: 'bg-green-50',   text: 'text-green-700'  };
  if (score >= 670) return { label: 'Established',       color: '#22d3ee', bg: 'bg-cyan-50',    text: 'text-cyan-700'   };
  if (score >= 580) return { label: 'Developing',       color: '#818cf8', bg: 'bg-indigo-50',  text: 'text-indigo-700' };
  if (score >= 450) return { label: 'Emerging',         color: '#a78bfa', bg: 'bg-violet-50',  text: 'text-violet-700' };
  return                    { label: 'Getting started', color: '#94a3b8', bg: 'bg-slate-50',   text: 'text-slate-600'  };
}

export function improvementTips(breakdown, academicStatus) {
  const tips = [];
  const { total, onChainCount, deliveryScore, pathwayScore } = breakdown || {};
  const inSchool = academicStatus === 'in_school' || academicStatus === 'nysc';

  if (!total) {
    tips.push(inSchool
      ? 'Start your Verified Ledger: accept a credential from a verified issuer or complete a Coursera course via Platform Integration.'
      : 'Add your first credential to start building your score.'
    );
  }
  if (onChainCount < total) {
    tips.push('Accept all pending credentials to anchor them on Solana — each one increases your pathway weight.');
  }
  if (deliveryScore === 0) {
    tips.push(inSchool
      ? 'Apply for a Micro-Bounty in the Earn tab — even one confirmed paid delivery adds +15 points and makes you discoverable to employers searching for paid experience.'
      : 'Complete a marketplace task — each confirmed delivery adds +15 points.'
    );
  }
  if (pathwayScore < 100) {
    tips.push('Add a professional certification (Coursera, Meta, Google) — platform-verified credentials carry stronger pathway weight than self-reported skills.');
  }
  tips.push('Tenure bonus grows +10 every quarter you stay active — students who start in year one graduate with a significant head start.');
  return tips.slice(0, 4);
}

export const TIER_CONFIG = {
  learner:             { label: 'Learner',             color: '#94a3b8', icon: '🌱', weight: [0.1,  0.35] },
  practitioner:        { label: 'Practitioner',        color: '#818cf8', icon: '⚙️',  weight: [0.35, 0.60] },
  proven_practitioner: { label: 'Proven Practitioner', color: '#22d3ee', icon: '✅', weight: [0.60, 0.80] },
  expert:              { label: 'Expert',              color: '#10b981', icon: '🏆', weight: [0.80, 0.95] },
  master:              { label: 'Master',              color: '#f59e0b', icon: '👑', weight: [0.95, 1.0]  },
};

export const ACADEMIC_STATUS_LABEL = {
  in_school:    '📚 Currently in school',
  nysc:         '🪖 NYSC',
  graduate:     '🎓 Graduate',
  professional: '💼 Professional',
};

export const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];

export function tierMeetsRequirement(studentHighestTier, requiredTier) {
  const studentIdx  = TIER_ORDER.indexOf(studentHighestTier || 'learner');
  const requiredIdx = TIER_ORDER.indexOf(requiredTier       || 'learner');
  return studentIdx >= requiredIdx;
}
