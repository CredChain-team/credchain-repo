// ─────────────────────────────────────────────────────────────
// CredChain Backend — InstitutionRequest model
// Demand signal for the "Find your institution" flow. When a student can't find
// their school/employer in the verified issuer directory, they request it.
//
// One document PER institution (keyed on a normalized name), not one per click:
// each new student bumps `requestCount` and is appended to `requesters` (deduped
// by studentId). That turns scattered clicks into a ranked demand list an admin
// can act on — "12 students want UNILAG" — instead of a spammy row-per-request.
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const institutionRequestSchema = new mongoose.Schema(
  {
    // Normalized dedupe key (lowercased, whitespace-collapsed). Unique so the
    // upsert lands on one document per institution.
    nameKey: { type: String, required: true, unique: true, index: true },

    // The human-facing name as first typed (kept for display).
    displayName: { type: String, required: true, trim: true },

    // Optional hints the student can supply to help onboarding.
    website: { type: String, trim: true },

    // Rolling count of DISTINCT students who asked for this institution.
    requestCount: { type: Number, default: 0 },

    // Who asked (deduped by studentId), with any note they left.
    requesters: [
      {
        studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: { type: String, trim: true },
        requestedAt: { type: Date, default: Date.now },
        _id: false,
      },
    ],

    // Admin lifecycle — mirrors the { pending → resolved } shape used elsewhere.
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'onboarded', 'declined'],
      default: 'pending',
      index: true,
    },
    resolvedBy: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Normalize a free-text institution name into a stable dedupe key.
institutionRequestSchema.statics.toKey = function toKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
};

module.exports = mongoose.model('InstitutionRequest', institutionRequestSchema);
