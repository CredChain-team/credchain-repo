// ─────────────────────────────────────────────────────────────
// CredChain Backend — User model
// The shape of a user document in MongoDB. Stores the bcrypt password
// HASH only (never the plaintext password). credchainId is the public
// identifier shared on profiles / QR links.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['student', 'issuer', 'employer'],
      default: 'student',
    },
    credchainId: { type: String, unique: true },
    bio: { type: String },
    skills: [{ type: String }],
    links: [{ type: String }],

    // ── Reputation (vouch economy) ────────────────────────────────────
    // A user's standing on the platform. Only users at/above the vouch
    // threshold (60) may stake reputation to attest another student's
    // self-declared skill; each vouch stakes 10 points, forfeited if the
    // vouch is later upheld as false. Starts low (20) — reputation is
    // earned, not granted. See controllers/vouchController.js.
    reputationScore: { type: Number, default: 20, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
