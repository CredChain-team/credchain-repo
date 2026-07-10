// ─────────────────────────────────────────────────────────────
// CredChain Backend — BountyApplication model (Economy layer)
// One student's application to one Bounty. Kept as its own collection (not
// embedded in Bounty) so a student can query "my applications" across all
// bounties, accepting flips a single doc atomically, and a unique
// {bountyId, studentId} index blocks double-apply at the DB level.
//
// Lifecycle: applied → accepted → delivered → confirmed
//            (or → rejected / withdrawn).
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const bountyApplicationSchema = new mongoose.Schema(
  {
    bountyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Bounty', required: true, index: true },
    studentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    employerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true, index: true }, // denormalised

    // Apply-time snapshot so the employer's applicant list needs no join.
    studentName:         { type: String },
    credScoreSnapshot:   { type: Number },
    highestTierSnapshot: { type: String },
    message:             { type: String, maxlength: 1000 },

    status: {
      type: String,
      enum: ['invited', 'applied', 'accepted', 'rejected', 'declined', 'delivered', 'submitted', 'confirmed', 'won', 'not_selected', 'withdrawn'],
      default: 'applied',
    },

    // ── GLOBAL bounty extras ──────────────────────────────────────────
    // For a global (competition) bounty a student SUBMITS directly — the
    // application IS the submission, status goes straight to 'submitted'.
    // placement/isWinner are set when the sponsor picks winners.
    placement: { type: Number },   // rank won (1 = first); null if not selected
    isWinner:  { type: Boolean, default: false },

    // The student's submitted work.
    delivery: {
      submittedAt: { type: Date },
      text:        { type: String, maxlength: 4000 },
      links:       [{ type: String }],
    },

    confirmedAt:         { type: Date },
    awardedCredentialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Credential' },

    // ── Two-way ratings (post-confirmation reputation signal) ──────────
    // Filed only AFTER a delivery is confirmed / a win is awarded. This is a
    // reputation signal for the marketplace ONLY — it is deliberately kept
    // OUT of the CredScore formula (utils/credScore.js), which stays
    // evidence-only and never reads a subjective rating.
    rating: {
      employerToStudent: {
        stars:   { type: Number, min: 1, max: 5 },
        comment: { type: String, maxlength: 500 },
        at:      { type: Date },
      },
      studentToEmployer: {
        stars:   { type: Number, min: 1, max: 5 },
        comment: { type: String, maxlength: 500 },
        at:      { type: Date },
      },
    },
  },
  { timestamps: true }
);

// One application per student per bounty.
bountyApplicationSchema.index({ bountyId: 1, studentId: 1 }, { unique: true });
// Fast "applicants for this bounty" + "my applications".
bountyApplicationSchema.index({ bountyId: 1, status: 1 });
bountyApplicationSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('BountyApplication', bountyApplicationSchema);
