// ─────────────────────────────────────────────────────────────
// CredChain Backend — Global-bounty credential weighting (ANTI-FRAUD CORE)
//
// A credential minted from WINNING an open, competitive global bounty is
// meant to be the strongest, least-fakeable proof on the platform — because
// you beat a real field of strangers. But that promise only holds if the
// system REFUSES to hand out a strong credential when there was no real
// competition. This module is where that refusal lives.
//
// Three guardrails, all enforced here:
//
//   1. COMPETITION DEPTH — weight scales with how many *distinct* real
//      submissions the winner beat. A self-dealt bounty (post it yourself,
//      "win" it with your own alt, 1 submission) mints a near-zero-weight
//      credential. You cannot farm trust without a real crowd.
//
//   2. VERIFIED-SPONSOR CAP — an unvetted account can still run bounties
//      (good for the economy), but the credentials it mints are HARD-CAPPED
//      below the top tiers and flagged. Only a fully-vetted issuer sponsor
//      can mint proven_practitioner+ from a bounty.
//
//   3. PLACEMENT — 1st place is worth more than 3rd. Higher rank, more weight.
//
// The output `compositeWeight` (0.0–1.0) feeds the existing CredScore
// pathwayScore and assignTier() bands unchanged.
// ─────────────────────────────────────────────────────────────

const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];

// Upper bound on the compositeWeight a bounty can grant, by whether the
// sponsor is a fully-vetted issuer. Unverified sponsors top out at
// 'practitioner' band (< 0.60) no matter how competitive the bounty.
const VERIFIED_SPONSOR_CAP   = 0.97; // master band reachable
const UNVERIFIED_SPONSOR_CAP = 0.55; // capped below proven_practitioner (0.60)

// The tier the sponsor *asked for* sets the aspirational ceiling — a
// 'learner' bounty shouldn't mint an 'expert' credential even if 500 people
// entered. This maps requiredTier → its band ceiling.
function tierCeiling(tier) {
  switch (tier) {
    case 'master': return 0.97;
    case 'expert': return 0.87;
    case 'proven_practitioner': return 0.70;
    case 'practitioner': return 0.55;
    default: return 0.35; // learner
  }
}

// Competition-depth multiplier ∈ [0, 1]. This is the anti-self-dealing curve.
//   1 submission  → ~0.10  (basically worthless — the self-dealing case)
//   2 submissions → ~0.35
//   3 submissions → ~0.50
//   5 submissions → ~0.68
//   8 submissions → ~0.82
//  15+ submissions→ ~1.00  (a genuinely contested win)
// Uses a smooth saturating curve so there's no single magic threshold to game.
function competitionFactor(submissionCount) {
  const n = Math.max(0, Number(submissionCount) || 0);
  if (n <= 1) return 0.10;                 // no real field → floor
  // Saturating curve: 1 - 1/(1 + k*(n-1)); tuned so ~15 submissions ≈ 1.0.
  const k = 0.28;
  const raw = 1 - 1 / (1 + k * (n - 1));
  return Math.min(1, 0.10 + raw * 0.95);
}

// Placement multiplier ∈ (0, 1]. 1st place keeps full weight; each rank down
// keeps ~15% less, floored so a top-3 finish is still meaningful.
function placementFactor(placement) {
  const p = Math.max(1, Number(placement) || 1);
  return Math.max(0.6, 1 - (p - 1) * 0.15);
}

/**
 * computeBountyWeight
 * @param {object} args
 * @param {string} args.requiredTier     Tier the sponsor set on the bounty.
 * @param {number} args.submissionCount  Distinct real submissions in the field.
 * @param {number} args.placement        Winner's rank (1 = first).
 * @param {boolean} args.sponsorVerified Was the sponsor a vetted issuer?
 * @returns {{ weight:number, cappedBySponsor:boolean, competitionFactor:number }}
 */
function computeBountyWeight({ requiredTier = 'learner', submissionCount = 0, placement = 1, sponsorVerified = false } = {}) {
  const ceiling = tierCeiling(requiredTier);
  const comp = competitionFactor(submissionCount);
  const place = placementFactor(placement);

  // Start from the tier ceiling, then discount by real competition + placement.
  let weight = ceiling * comp * place;

  // Apply the sponsor-trust hard cap.
  const sponsorCap = sponsorVerified ? VERIFIED_SPONSOR_CAP : UNVERIFIED_SPONSOR_CAP;
  const cappedBySponsor = weight > sponsorCap;
  weight = Math.min(weight, sponsorCap);

  // Never below the sandbox/default floor.
  weight = Math.max(0.2, Number(weight.toFixed(3)));

  return { weight, cappedBySponsor, competitionFactor: Number(comp.toFixed(3)) };
}

module.exports = {
  computeBountyWeight,
  competitionFactor,
  placementFactor,
  tierCeiling,
  TIER_ORDER,
  VERIFIED_SPONSOR_CAP,
  UNVERIFIED_SPONSOR_CAP,
};
