// ─────────────────────────────────────────────────────────────
// CredChain Backend — IssuerProfile model (Anti-Fraud Funnel)
// Backs the 4-Tier Issuer Verification state machine. An organization
// account must climb the funnel before it can mint credentials:
//
//   applied → domain_verified → identity_checked → vetted → active
//
//   L1 Domain WHOIS & match     → applied        (riskFlags set here)
//   L2 Cryptographic DNS proof  → domain_verified
//   L3 Biometric KYC webhook    → identity_checked
//   L4 Registry cross-match     → vetted → active (isVerifiedIssuer=true)
//
// `isVerifiedIssuer` is the single boolean the issuance/revocation guard
// (enforceVerifiedIssuer) checks — it only flips true at the final tier.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const issuerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    institutionType: {
      type: String,
      enum: ['university', 'bootcamp', 'company', 'certifier', 'other'],
      default: 'other',
    },

    // ISO-3166 country the issuer operates in. Drives the VerificationRouter:
    // each tier resolves its provider PER COUNTRY (NG → CAC/Smile ID/WAEC;
    // else → RDAP/Veriff/…). Nigeria-first, but never Nigeria-hardcoded.
    country: {
      type: String,
      uppercase: true,
      trim: true,
      default: 'NG',
      index: true,
    },

    // ── L1 entity legitimacy (CAC for NG) ──────────────────────────────
    // The registry identifier + its verified status, from verifyEntity().
    // rcNumber (Nigeria CAC) also feeds the common-ownership check: two
    // issuers sharing an RC number / director are NOT independent attestors.
    registryEntity: {
      rcNumber:   { type: String, trim: true, index: true, sparse: true },
      provider:   { type: String },   // 'dojah' | 'verifyme' | 'qoreid' | 'rdap' | 'cac_pending'
      verified:   { type: Boolean, default: false },
      checkedAt:  { type: Date },
    },

    // The email domain this issuer is locked to (e.g. "mit.edu"). Indexed +
    // unique (sparse) so two issuers can't both claim the same domain.
    lockedDomain: { type: String, lowercase: true, trim: true, index: true, unique: true, sparse: true },

    verificationStatus: {
      type: String,
      enum: ['applied', 'domain_verified', 'identity_checked', 'vetted', 'active'],
      default: 'applied',
      index: true,
    },

    // L2: the token the issuer must publish as a DNS TXT record to prove
    // control of `lockedDomain`.
    dnsChallengeToken: { type: String },
    domainVerifiedAt: { type: Date },

    // L1: WHOIS findings.
    domainCreatedAt: { type: Date },
    domainAgeMonths: { type: Number },

    // Anti-fraud flags accumulated through the funnel (e.g. 'domain_age_lt_6mo',
    // 'whois_unavailable', 'consumer_email_attempt').
    riskFlags: [{ type: String }],

    // L3: biometric KYC (webhook-synced).
    kyc: {
      status: { type: String, enum: ['none', 'pending', 'passed', 'failed'], default: 'none' },
      reference: { type: String },
      checkedAt: { type: Date },
    },

    // L4: manual admin cross-match against corporate / university registries.
    registry: {
      matched: { type: Boolean, default: false },
      reviewedBy: { type: String },
      reviewedAt: { type: Date },
      notes: { type: String },
    },

    isVerifiedIssuer: { type: Boolean, default: false, index: true },

    // ── Re-verification (no permanent badges) ──────────────────────────
    // Passing L4 does NOT grant a permanent badge. Verification EXPIRES; a
    // domain can lapse, an institution can close, staff can turn over. When
    // `verifiedUntil` passes, a sweep re-checks domain + entity status and, if
    // stale, flips isVerifiedIssuer back to false pending re-attestation.
    verifiedUntil: { type: Date, index: true },

    // ── NDPA 2023 / GDPR consent record ────────────────────────────────
    // Biometric KYC (L3) processes sensitive personal data; the law requires
    // explicit, recorded consent. Stored as a record of consent + a deletion
    // path — never the raw biometric itself (that stays with the KYC provider).
    dataConsent: {
      given:      { type: Boolean, default: false },
      givenAt:    { type: Date },
      purpose:    { type: String },   // e.g. 'issuer_identity_verification'
      policyVersion: { type: String },
      erasedAt:   { type: Date },     // set when a data-subject deletion is honored
    },

    // ── Issuer reputation / skin-in-the-game (Anti-COLLUSION core) ─────
    // Passing the funnel gets you in the door; it does NOT make your
    // signature permanently trusted. Every mint stakes reputation. A
    // confirmed fraud finding strikes the issuer, drops trustScore, and at
    // the threshold FREEZES the franchise (suspended) and re-reviews the
    // rest of their mints. Selling one fake credential risks the whole
    // business — which is the point: a bought signature must be self-
    // destructing, not a repeatable revenue stream.
    reputation: {
      // 0–100. Starts at full trust; drives the issuance-weight ceiling in
      // utils/issuanceWeight.js (a low-rep issuer mints weaker credentials).
      trustScore:        { type: Number, default: 100, min: 0, max: 100 },
      credentialsIssued: { type: Number, default: 0 },
      // Confirmed fraud findings upheld against this issuer's mints.
      disputesUpheld:    { type: Number, default: 0 },
      strikes:           { type: Number, default: 0 },
      // Frozen from minting/revoking pending review (checked in enforceVerifiedIssuer).
      suspended:         { type: Boolean, default: false },
      suspendedAt:       { type: Date },
      lastStrikeAt:      { type: Date },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IssuerProfile', issuerProfileSchema);
