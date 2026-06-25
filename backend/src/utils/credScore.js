/**
 * CredChain — Canonical server-side CredScore formula
 *
 * Range: 300–850 (mirrors FICO scale intentionally — the analogy lands
 * immediately with judges, employers, and users).
 *
 * FOUR COMPONENTS ONLY:
 *
 *   pathwayScore   = min(totalCompositeWeight, 1.0) × 200     → max 200
 *   deliveryScore  = min(completedDeliveries × 15, 300)        → max 300
 *   disputePenalty = confirmedDisputesAgainst × 40              → no cap
 *   tenureBonus    = floor(monthsActive / 3) × 10               → max 100
 *
 *   raw = 300 + pathwayScore + deliveryScore − disputePenalty + tenureBonus
 *   final = clamp(raw, 300, 850)
 *
 * NEVER reads: country, university name, year of study, income, or any
 * wealth-correlated proxy. Evidence only. A 200-level student with 5
 * verified credentials and 3 paid deliveries can outscore a graduate
 * with only a degree. That is not a bug. That is the point.
 */

const SCORE_MIN = 300;
const SCORE_MAX = 850;

function monthsActive(createdAt) {
  if (!createdAt) return 0;
  const ms = Date.now() - new Date(createdAt).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 30));
}

function assignTier(compositeWeight) {
  const w = compositeWeight || 0.2;
  if (w >= 0.95) return 'master';
  if (w >= 0.80) return 'expert';
  if (w >= 0.60) return 'proven_practitioner';
  if (w >= 0.35) return 'practitioner';
  return 'learner';
}

async function recalculateCredScore(profile, acceptedCredentials = []) {
  const totalWeight = Math.min(
    1.0,
    acceptedCredentials.reduce((sum, c) => sum + (c.compositeWeight || 0.2), 0)
  );

  const pathwayScore   = Math.round(totalWeight * 200);
  const completed      = profile.deliveryStats?.completed || 0;
  const deliveryScore  = Math.min(300, completed * 15);
  const confirmedAgainst = profile.deliveryStats?.confirmedAgainst || 0;
  const disputePenalty = confirmedAgainst * 40;
  const months         = monthsActive(profile.createdAt);
  const tenureBonus    = Math.min(100, Math.floor(months / 3) * 10);

  const raw   = SCORE_MIN + pathwayScore + deliveryScore - disputePenalty + tenureBonus;
  const value = Math.max(SCORE_MIN, Math.min(SCORE_MAX, raw));

  // Update highest tier
  const allTiers   = acceptedCredentials.map(c => c.trustTier || 'learner');
  const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];
  const highestTier = allTiers.reduce((best, t) => {
    return TIER_ORDER.indexOf(t) > TIER_ORDER.indexOf(best) ? t : best;
  }, 'learner');

  // Denormalise skill tags for search
  const allTags = [...new Set(
    acceptedCredentials.flatMap(c => c.skillTags || (c.skillName ? [c.skillName] : []))
  )];
  const allCategories = [...new Set(
    acceptedCredentials.map(c => c.skillCategory || 'Other')
  )];

  profile.credScore = {
    value,
    lastCalculated: new Date(),
    breakdown: { pathwayScore, deliveryScore, disputePenalty, tenureBonus },
  };
  profile.highestTier      = highestTier;
  profile.skillTags        = allTags;
  profile.skillCategories  = allCategories;

  await profile.save();
  return profile.credScore;
}

module.exports = { recalculateCredScore, assignTier, SCORE_MIN, SCORE_MAX, monthsActive };
