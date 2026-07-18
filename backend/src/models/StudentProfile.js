// ─────────────────────────────────────────────────────────────
// CredChain Backend — StudentProfile model (Two-Tier Trust)
// The advanced student portal segregates skills into two ledgers:
//
//   verifiedSkills → blockchain-verified credentials (accepted + on-chain).
//                    Stored as refs to Credential documents.
//   sandboxSkills  → self-taught / sandbox claims (GitHub repos, courses…).
//                    Plain objects; NEVER treated as verified.
//
// This separation powers the employer-facing "Hide Unverified" toggle.
// `aiTelemetry` caches the latest market analysis from the Insights engine
// (:8002) so the dashboard doesn't re-hit the AI on every render.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const sandboxSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    source: { type: String, trim: true }, // e.g. 'GitHub', 'Coursera', 'Self-taught'
    link: { type: String, trim: true },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// An attested (vouched) skill. Note: NO `{ _id: false }` — each entry keeps
// its default ObjectId, which is used as the dispute key in the shared admin
// dispute queue (StudentProfile.findOne({ 'attestedSkills._id': id })).
const attestedSkillSchema = new mongoose.Schema(
  {
    skillName: { type: String, required: true, trim: true },
    source: { type: String, trim: true },
    link: { type: String, trim: true },
    // The high-reputation user who vouched, and the reputation they staked.
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    stakedPoints: { type: Number, default: 10 },
    vouchedAt: { type: Date, default: Date.now },
    // Mirrors Credential.dispute EXACTLY (same enum + field names) so the
    // independent admin queue treats credentials and vouches uniformly.
    dispute: {
      status: {
        type: String,
        enum: ['none', 'under_review', 'resolved_upheld', 'resolved_reinstated'],
        default: 'none',
      },
      reason: { type: String },
      filedAt: { type: Date },
      resolvedAt: { type: Date },
      resolvedBy: { type: String },
      resolutionNotes: { type: String },
    },
  }
);

const studentProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Tier 1 — blockchain-verified credentials.
    verifiedSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Credential' }],

    // Tier 2 — self-asserted, unverified.
    sandboxSkills: [sandboxSkillSchema],

    // Tier 1.5 — ATTESTED skills. A self-declared skill that a
    // high-reputation user (reputationScore ≥ 60) has staked 10 points to
    // vouch for. Sits BETWEEN verified (issuer-minted, on-chain) and sandbox
    // (pure self-claim): it carries partial trust because a real person put
    // reputation on the line, but it is never equal to an issuer credential.
    // The `dispute` sub-doc mirrors Credential.dispute exactly so the ONE
    // independent admin queue (credentialController.listDisputes/resolveDispute)
    // can adjudicate credentials and vouches uniformly.
    attestedSkills: [attestedSkillSchema],

    // ── Academic status ───────────────────────────────────────────────
    // Default: 'in_school' — this is the primary CredChain user, not the edge case.
    academicStatus: {
      type: String,
      enum: ['in_school', 'nysc', 'graduate', 'professional'],
      default: 'in_school',
    },
    yearOfStudy:    { type: Number },         // 1–6 (null for non-students)
    university:     { type: String },
    course:         { type: String },
    graduationYear: { type: Number },

    // ── CredScore — 4-component ───────────────────────────────────────
    credScore: {
      value:          { type: Number, default: 300 },
      lastCalculated: { type: Date },
      breakdown: {
        pathwayScore:   { type: Number, default: 0 },   // compositeWeight × 200, max 200
        attestedBonus:  { type: Number, default: 0 },    // vouched skills × 5, max 15
        deliveryScore:  { type: Number, default: 0 },   // min(completed × 15, 300), max 300
        disputePenalty: { type: Number, default: 0 },   // confirmedAgainst × 40
        tenureBonus:    { type: Number, default: 0 },   // floor(monthsActive/3) × 10, max 100
      },
    },

    // ── Delivery stats ────────────────────────────────────────────────
    deliveryStats: {
      total:            { type: Number, default: 0 },
      completed:        { type: Number, default: 0 },
      disputed:         { type: Number, default: 0 },
      confirmedAgainst: { type: Number, default: 0 },
      totalEarnedSOL:   { type: Number, default: 0 },
      // Per-currency earnings (ISO-4217 code → total). Scales to any market;
      // e.g. { NGN: 250000, USD: 600 }. Nigeria launch just populates NGN.
      earnedByCurrency: { type: Map, of: Number, default: {} },
    },

    // ── Skill Discovery / Talent Search ───────────────────────────────
    // Controls whether this student appears in employer search results
    discoverable:    { type: Boolean, default: true },
    // Aggregated skill tags for fast search (denormalised from credentials)
    skillTags:       [{ type: String }],
    // Top-level skill categories (e.g. 'Backend', 'Design', 'Data')
    skillCategories: [{ type: String }],
    // Highest trust tier across all accepted credentials
    highestTier: {
      type: String,
      enum: ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'],
      default: 'learner',
    },
    // Location for geo filtering
    location: {
      city:    { type: String },
      country: { type: String, default: 'NG' },
    },
    // Short bio shown on search cards (student-written)
    headline: { type: String },

    // ── Marketplace rating (reputation signal ONLY — never in CredScore) ─
    // Rolling average of the stars employers gave this student after a
    // confirmed delivery. Shown on talent cards; deliberately excluded from
    // the evidence-only CredScore formula to avoid subjective bias.
    ratingAvg:   { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    // How many times this profile appeared in employer searches (analytics)
    searchImpressions: { type: Number, default: 0 },
    // How many times an employer clicked through to this profile
    profileViews:      { type: Number, default: 0 },

    // Cached market telemetry from the AI Insights engine (:8002).
    aiTelemetry: {
      roleReadinessScore: { type: Number },
      marketEstimatedSalary: { type: String },
      recommendedSkillGaps: [{ type: String }],
      syncedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// ── Index for talent search ────────────────────────────────────────────
studentProfileSchema.index({ discoverable: 1, skillTags: 1, highestTier: 1, 'credScore.value': -1 });
studentProfileSchema.index({ discoverable: 1, skillCategories: 1, 'location.country': 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);
