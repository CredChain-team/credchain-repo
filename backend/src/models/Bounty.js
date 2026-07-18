// ─────────────────────────────────────────────────────────────
// CredChain Backend — Bounty model (Economy layer)
// A paid micro-task an employer posts to the in-school economy. Students
// apply with their verified skills (see BountyApplication); the employer
// accepts one, the student delivers, and on confirmation the student is
// awarded a verified Credential + a CredScore delivery bump.
//
// SIMULATED ESCROW: `escrow` tracks the payment hold in the DB, mirroring
// the existing DEMO_MODE Solana approach (a deterministic mock signature,
// clearly flagged). No real crypto ever moves — reward amounts are display
// strings ('₦250,000' / '$600'), not on-chain balances.
//
// The field shape intentionally mirrors the frontend MICRO_BOUNTIES mock so
// existing cards render with a minimal adapter (see publicBounty()).
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];

const bountySchema = new mongoose.Schema(
  {
    // The employer (role: 'employer') who posted this bounty.
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Denormalised poster identity for card display (no join needed).
    company:     { type: String },
    companyLogo: { type: String, default: '🏢' }, // emoji, matches mock shape

    // ── Bounty type ────────────────────────────────────────────────────
    // 'assigned' = the original 1-to-1 flow (apply → accept one → deliver).
    // 'global'   = open competition: anyone eligible SUBMITS directly, the
    //              sponsor reviews the whole field and picks winner(s). The
    //              strength of a winner's credential scales with how many
    //              real submissions they beat (see utils/bountyWeight.js) —
    //              this is what makes a self-dealt "win" worthless.
    // 'direct'   = the employer hand-picks ONE specific student from Talent
    //              Search and assigns them a live task directly. The student
    //              accepts or declines; on accept it runs the same
    //              deliver → confirm → mint pipeline as an assigned bounty.
    bountyType: {
      type: String,
      enum: ['assigned', 'global', 'direct'],
      default: 'assigned',
      index: true,
    },

    // ── Direct-task target (bountyType: 'direct') ──────────────────────
    // The specific student the employer invited. Denormalised name for card
    // display without a join.
    invitedStudentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    invitedStudentName: { type: String },

    title:       { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },

    // Skill metadata — feeds the awarded credential + talent search.
    skill:         { type: String },                       // e.g. 'Backend / Node.js'
    skillName:     { type: String },                       // credential skillName
    skillCategory: { type: String, default: 'Other' },
    skillTags:     [{ type: String }],

    // ── Reward (display) + escrow amount ──────────────────────────────
    reward:    { type: String },              // display string, e.g. '₦250,000'
    rewardUSD: { type: Number, default: 0 },
    rewardSOL: { type: Number, default: 0 },  // legacy/simulated on-chain amount
    // Generic money: the escrow works in WHATEVER currency the bounty is priced
    // in (ISO-4217). Nigeria launch defaults to NGN, but a USD/KES/GBP bounty
    // is fully supported. Funds are held in trust by a licensed payment partner
    // (services/payments.js), never custodied by CredChain and never converted
    // to crypto — Solana is used only to anchor the credential proof.
    rewardAmount:   { type: Number, default: 0 },
    rewardCurrency: { type: String, uppercase: true, trim: true, default: 'NGN' },  // ISO-4217

    // ── Prize pool (GLOBAL bounties) ──────────────────────────────────
    // Multiple winners split the escrowed pool by rank. For an 'assigned'
    // bounty this stays empty and rewardSOL is the single payout.
    prizes: [
      {
        _id:       false,
        rank:      { type: Number },          // 1 = first place
        label:     { type: String },          // e.g. '1st place'
        amount:    { type: Number, default: 0 },  // generic escrow amount (bounty currency)
        amountSOL: { type: Number, default: 0 },
        amountUSD: { type: Number, default: 0 },
        reward:    { type: String },          // display string
      },
    ],

    // Winners chosen at selection time (GLOBAL). One entry per awarded rank.
    winners: [
      {
        _id:          false,
        studentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        rank:         { type: Number },
        credentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },
        weight:       { type: Number },       // the competition-scaled weight awarded
        awardedTier:  { type: String },
      },
    ],

    // How many distinct students have submitted (GLOBAL). Feeds the
    // competition-depth weighting — the anti-self-dealing guardrail.
    submissionCount: { type: Number, default: 0 },

    // Guardrail snapshot: was the poster a fully-vetted issuer at post time?
    // Unverified sponsors can still run bounties, but the credentials they
    // mint are hard-capped below the top tiers and clearly labelled.
    sponsorVerified: { type: Boolean, default: false },

    // Sponsor-accountability clock: once submissions exist, the sponsor has
    // a review window; past it, escrow can be auto-released/refunded so funds
    // can't be frozen forever or work harvested for free.
    reviewDueAt: { type: Date },

    tests:        { type: Number, default: 0 },   // 0 = portfolio review
    requiredTier: { type: String, enum: TIER_ORDER, default: 'learner' },
    openTo:       { type: String },               // eligibility blurb
    deadline:     { type: String },               // display string, e.g. '7 days' (NOT a Date)

    status: {
      type: String,
      enum: ['open', 'invited', 'declined', 'in_progress', 'delivered', 'reviewing', 'completed', 'cancelled'],
      default: 'open',
    },

    // ── Escrow (licensed fiat partner — held in trust, NOT by CredChain) ──
    // CredChain never custodies funds. A licensed provider opens a per-bounty
    // virtual account in trust, the employer funds it in the bounty currency,
    // and CredChain only sends release/refund INSTRUCTIONS. `provider`/
    // `reference` track the partner side; `mock:true` marks the simulated path.
    escrow: {
      state:        { type: String, enum: ['none', 'held', 'released', 'refunded'], default: 'none' },
      amount:       { type: Number, default: 0 },   // generic escrow amount
      currency:     { type: String, uppercase: true, trim: true, default: 'NGN' },  // ISO-4217
      amountSOL:    { type: Number, default: 0 },   // legacy/simulated field
      provider:     { type: String },               // 'flutterwave' | 'korapay' | … | 'simulated'
      reference:    { type: String },               // partner escrow/txn reference
      virtualAccount: {                             // where the employer pays (live mode)
        bankName:      { type: String },
        accountNumber: { type: String },
        accountName:   { type: String },
      },
      heldAt:      { type: Date },
      releasedAt:  { type: Date },
      txSignature: { type: String },            // legacy: mock/real anchor of the escrow event
      mock:        { type: Boolean, default: false },
    },

    // Set once an applicant is accepted / the delivery is confirmed.
    acceptedApplicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'BountyApplication' },
    awardedCredentialId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },

    applicantCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Open-bounty feed + employer's own bounties.
bountySchema.index({ status: 1, requiredTier: 1, createdAt: -1 });
bountySchema.index({ employerId: 1, createdAt: -1 });
// Global-bounty feed.
bountySchema.index({ bountyType: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Bounty', bountySchema);
module.exports.TIER_ORDER = TIER_ORDER;
