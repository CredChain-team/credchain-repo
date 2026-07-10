// ─────────────────────────────────────────────────────────────
// CredChain Backend — Direct-issuance credential weighting (ANTI-COLLUSION CORE)
//
// The sharpest attack on any credentialing system is the corrupt insider:
// a student PAYS a fully-vetted issuer to mint a fake credential. That
// defeats the front door (issuer verification) entirely. This module is the
// answer, and it follows CredChain's own thesis:
//
//     "You can fake a certificate. You can't fake twenty paid deliveries."
//
// A credential's WEIGHT must not come from one issuer's signature alone. A
// lone issuer's uncorroborated say-so is HARD-CAPPED at the practitioner band
// (≤ 0.45) — no matter how prestigious the issuer, no matter what tier they
// request. To mint anything stronger, the claim must be CORROBORATED by
// signals a briber cannot cheaply manufacture:
//
//   1. PAID DELIVERIES — the student has confirmed deliveries to real
//      counterparties (the unfakeable signal; a real employer paid and
//      confirmed real work). This is the dominant corroborator.
//
//   2. INDEPENDENT ISSUERS — a SECOND, distinct verified issuer has already
//      attested this student. Two independent bribes cost more than one and
//      leave two accountable parties.
//
//   3. ISSUER TRUST SCORE — a high-reputation issuer earns a slightly higher
//      ceiling; a new or previously-struck issuer earns a lower one. Selling
//      fakes lowers this, so the fraud degrades the franchise's own reach.
//
// Result: one bribed issuer, acting alone, literally cannot manufacture an
// Expert/Master credential. A bought credential can't outrank an honest
// student's real, corroborated work. The mirror of utils/bountyWeight.js.
//
// Output `weight` (0.0–1.0) feeds the existing CredScore pathwayScore and
// assignTier() bands unchanged.
// ─────────────────────────────────────────────────────────────

const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];

// The ceiling a LONE, uncorroborated verified issuer can ever mint. Sits at
// the top of the practitioner band — enough to be useful, capped below
// proven_practitioner (0.60) so a paper credential can never claim mastery.
const UNCORROBORATED_CAP = 0.45;

// Absolute ceiling once fully corroborated (leaves master's very top, ≥0.95,
// to the genuinely-contested global-bounty path — a single issuer + a couple
// of deliveries shouldn't instantly mint 'master').
const CORROBORATED_CAP = 0.92;

// The tier the ISSUER asked for sets the aspirational ceiling — a 'learner'
// mint shouldn't become 'expert' just because the student has deliveries.
function tierCeiling(tier) {
  switch (tier) {
    case 'master': return 0.97;
    case 'expert': return 0.87;
    case 'proven_practitioner': return 0.70;
    case 'practitioner': return 0.45;
    default: return 0.30; // learner
  }
}

// Quality fraction ∈ [0.85, 1.0]. Corroboration is primarily a GATE (it
// unlocks the tiers above practitioner via the hard cap below); on top of
// that it nudges the awarded fraction of the requested-tier ceiling upward.
// Kept a narrow band on purpose — an honest issuer minting to a fresh student
// still gets a solid practitioner credential; corroboration is what lets them
// exceed practitioner at all.
//   0 signal  → 0.85
//   1 delivery→ ~0.91
//   3         → ~0.95
//   5+        → ~0.96+
// An independent second issuer ≈ 0.9 of a delivery of corroboration.
function qualityFraction(deliveries, independentIssuers) {
  const signal = Math.max(0, Number(deliveries) || 0) + Math.max(0, Number(independentIssuers) || 0) * 0.9;
  return 0.85 + 0.15 * (1 - 1 / (1 + 0.6 * signal));
}

// Issuer-reputation multiplier ∈ [0.6, 1.03]. A pristine 100 issuer gets a
// tiny bonus; a struck / low-trust issuer is discounted. Never zero (a
// verified issuer always mints SOMETHING), never a huge lever (reputation
// alone can't manufacture a top credential — corroboration must).
function trustMultiplier(issuerTrustScore) {
  const t = Math.max(0, Math.min(100, Number(issuerTrustScore ?? 100)));
  return 0.6 + (t / 100) * 0.43; // 0 → 0.60, 100 → 1.03
}

/**
 * computeIssuanceWeight
 * @param {object} args
 * @param {number}  args.issuerTrustScore        Issuer reputation.trustScore (0–100).
 * @param {number}  args.corroboratingDeliveries Student's confirmed paid deliveries.
 * @param {number}  args.independentIssuerCount  Distinct OTHER verified issuers attesting.
 * @param {string}  args.requestedTier           Tier the issuer set on the mint.
 * @returns {{ weight:number, cappedUncorroborated:boolean, ceiling:number }}
 */
function computeIssuanceWeight({
  issuerTrustScore = 100,
  corroboratingDeliveries = 0,
  independentIssuerCount = 0,
  requestedTier = 'practitioner',
} = {}) {
  const isCorroborated = (Number(corroboratingDeliveries) || 0) > 0
    || (Number(independentIssuerCount) || 0) > 0;

  const trust = trustMultiplier(issuerTrustScore);
  const quality = qualityFraction(corroboratingDeliveries, independentIssuerCount);

  // Aspirational ceiling from the requested tier × issuer reputation × quality.
  const askCeiling = tierCeiling(requestedTier);
  const base = askCeiling * trust * quality;

  // The hard anti-collusion cap: with NO corroboration a credential can never
  // exceed the practitioner band — no matter the requested tier or issuer.
  const hardCap = isCorroborated ? CORROBORATED_CAP : UNCORROBORATED_CAP;

  // Flag it whenever the issuer's REQUEST was reduced for lack of
  // corroboration (they asked for more than an uncorroborated mint can give).
  const cappedUncorroborated = !isCorroborated && base > UNCORROBORATED_CAP;

  let weight = Math.min(base, hardCap);

  // Never below the sandbox/default floor.
  weight = Math.max(0.2, Number(weight.toFixed(3)));

  return { weight, cappedUncorroborated, ceiling: Number(hardCap.toFixed(3)) };
}

module.exports = {
  computeIssuanceWeight,
  qualityFraction,
  trustMultiplier,
  tierCeiling,
  UNCORROBORATED_CAP,
  CORROBORATED_CAP,
  TIER_ORDER,
};
