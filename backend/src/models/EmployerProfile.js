// ─────────────────────────────────────────────────────────────
// CredChain Backend — EmployerProfile model (Token-Bucket Chat)
// Employers spend a chat credit to open a conversation with a student.
// The credit is refunded if the student replies (proving the outreach
// wasn't spam) — see the token-bucket logic in chatController.js.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    companyName: { type: String, trim: true },

    // The anti-spam token bucket. Starts at 50; -1 to open a room,
    // +1 refunded when the recipient replies.
    chatCreditsRemaining: { type: Number, default: 50, min: 0 },

    // ── Sponsor trust (global-bounty guardrail) ───────────────────────
    // A vetted sponsor can mint stronger bounty credentials (up to master);
    // an unvetted one can still run bounties but its credentials are capped
    // below the top tiers and labelled. Flipped by an admin (or seeded).
    verified: { type: Boolean, default: false, index: true },

    // ── Sponsor accountability / reputation ───────────────────────────
    // Escrow proves the money is real and locked. These counters make the
    // OTHER half legible: a sponsor who harvests submissions then cancels,
    // or who gets auto-released for going silent, carries a visible record.
    sponsorStats: {
      bountiesPosted:        { type: Number, default: 0 },
      winnersSelected:       { type: Number, default: 0 },
      cancelledWithEntries:  { type: Number, default: 0 }, // cancelled after submissions arrived
      autoReleased:          { type: Number, default: 0 }, // went silent → escrow force-released
      totalEscrowedSOL:      { type: Number, default: 0 },
      // Rolling rating students gave this employer after a confirmed task.
      // Marketplace reputation only — never feeds any student's CredScore.
      ratingAvg:             { type: Number, default: 0 },
      ratingCount:           { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);
