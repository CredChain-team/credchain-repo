// ─────────────────────────────────────────────────────────────
// CredChain Backend — Vouch economy (self-upload trust bridge)
//
// The gap this closes: a student's self-declared (sandbox) skill carries ZERO
// trust. A vouch lets a high-reputation user STAKE 10 reputation points to
// attest that skill, promoting it from sandbox → attested (partial trust). If
// the vouch is later upheld as false (via the independent admin dispute
// queue), the staked points are forfeited — so a vouch means something,
// unlike a free endorsement.
//
//   vouchSandboxSkill  — a user with reputationScore ≥ 60 vouches for one of a
//                        student's sandbox skills (stakes 10, moves it to
//                        attestedSkills, recalculates CredScore).
//   disputeAttestation — the owning student flags an attestation → routes to
//                        the SAME independent admin queue as credential
//                        disputes (credentialController.resolveDispute).
// ─────────────────────────────────────────────────────────────

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const { ensureStudentProfile } = require('./studentController');
const { recalculateCredScore } = require('../utils/credScore');

// Minimum reputation required to vouch. Staking below this is refused — you
// must have standing before your word can lend trust.
const VOUCH_THRESHOLD = Number(process.env.VOUCH_THRESHOLD) || 60;
const STAKE = 10;

// POST /api/v1/student/:studentId/sandbox/:skillIndex/vouch   (requireAuth)
// The caller stakes 10 reputation to attest the student's sandbox skill.
async function vouchSandboxSkill(req, res) {
  try {
    const { studentId, skillIndex } = req.params;

    // Can't vouch for yourself.
    if (String(studentId) === String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You cannot vouch for your own skill.' });
    }

    // Reputation lives on User (the JWT only carries sub/role/email).
    const voucher = await User.findById(req.user.id);
    if (!voucher) {
      return res.status(404).json({ success: false, message: 'Voucher account not found.' });
    }
    if ((voucher.reputationScore || 0) < VOUCH_THRESHOLD) {
      return res.status(403).json({
        success: false,
        message: `Your reputation score must be at least ${VOUCH_THRESHOLD} to vouch.`,
        reputationScore: voucher.reputationScore || 0,
      });
    }

    const profile = await ensureStudentProfile(studentId);
    const idx = Number(skillIndex);
    if (!Number.isInteger(idx) || idx < 0 || idx >= (profile.sandboxSkills?.length || 0)) {
      return res.status(404).json({ success: false, message: 'Sandbox skill not found at that index.' });
    }

    // Move the skill sandbox → attested atomically (splice out, then push),
    // so it can never be double-counted in both ledgers.
    const [skill] = profile.sandboxSkills.splice(idx, 1);
    profile.attestedSkills.push({
      skillName: skill.skillName,
      source: skill.source || 'Self-taught',
      link: skill.link || '',
      voucherId: voucher._id,
      stakedPoints: STAKE,
      vouchedAt: new Date(),
      dispute: { status: 'none' },
    });
    await profile.save();

    // Stake the reputation (floor at 0).
    voucher.reputationScore = Math.max(0, (voucher.reputationScore || 0) - STAKE);
    await voucher.save();

    // Recalculate the student's CredScore (attestedBonus changes).
    let newCredScore = null;
    try {
      const allAccepted = await Credential.find({ studentId, status: 'accepted' });
      const score = await recalculateCredScore(profile, allAccepted);
      newCredScore = score?.value ?? null;
    } catch (scoreErr) {
      console.error('[vouch:vouchSandboxSkill] credScore recalc failed:', scoreErr.message);
    }

    const attested = profile.attestedSkills[profile.attestedSkills.length - 1];
    return res.status(201).json({
      success: true,
      message: `You vouched for "${skill.skillName}" and staked ${STAKE} reputation points.`,
      newCredScore,
      voucherReputation: voucher.reputationScore,
      attestedSkill: {
        id: attested._id,
        skillName: attested.skillName,
        source: attested.source,
        voucherId: attested.voucherId,
        stakedPoints: attested.stakedPoints,
        vouchedAt: attested.vouchedAt,
      },
    });
  } catch (err) {
    console.error('[vouch:vouchSandboxSkill]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to record the vouch.' });
  }
}

// POST /api/v1/attested/:studentId/:attestedIndex/dispute
//   (requireAuth + requireRole('student'), owner-only)
// Mirrors credentialController.disputeCredential: freezes the attestation
// (it stops counting toward CredScore) and routes it to the independent admin
// queue. Does NOT remove it — an admin reinstates or upholds.
async function disputeAttestation(req, res) {
  try {
    const { studentId, attestedIndex } = req.params;

    // Only the owning student may dispute their own attestation.
    if (String(studentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only dispute your own attestation.' });
    }

    const profile = await StudentProfile.findOne({ userId: studentId });
    const idx = Number(attestedIndex);
    if (!profile || !Number.isInteger(idx) || idx < 0 || idx >= (profile.attestedSkills?.length || 0)) {
      return res.status(404).json({ success: false, message: 'Attestation not found at that index.' });
    }

    const attested = profile.attestedSkills[idx];
    if (attested.dispute && attested.dispute.status === 'under_review') {
      return res.status(409).json({ success: false, message: 'This attestation is already under review.' });
    }

    attested.dispute = {
      status: 'under_review',
      reason: (req.body?.reason || 'Attestation believed to be inaccurate.').slice(0, 1000),
      filedAt: new Date(),
    };
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Dispute filed. This attestation now shows "Under Review" pending independent platform-admin resolution.',
      dispute: attested.dispute,
    });
  } catch (err) {
    console.error('[vouch:disputeAttestation]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to file dispute.' });
  }
}

module.exports = { vouchSandboxSkill, disputeAttestation, VOUCH_THRESHOLD, STAKE };
