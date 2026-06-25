// ─────────────────────────────────────────────────────────────
// CredChain Backend — Employer talent feed (Section 4.2)
// Real students + their issuer-anchored (accepted) credentials, plus the
// caller's current chat-credit balance. This gives the Trust-First feed real
// user IDs so the token-bucket chat can actually open conversations.
// ─────────────────────────────────────────────────────────────

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const { ensureEmployerProfile } = require('./chatController');

// GET /api/v1/employer/talent-feed   (requireAuth + requireRole('employer'))
async function talentFeed(req, res) {
  try {
    const students = await User.find({ role: 'student' }).select('name credchainId').limit(50);
    const ids = students.map((s) => s._id);

    // Pull all accepted credentials for these students in one query.
    const accepted = await Credential.find({ studentId: { $in: ids }, status: 'accepted' });
    const credsByStudent = new Map();
    for (const c of accepted) {
      const key = String(c.studentId);
      if (!credsByStudent.has(key)) credsByStudent.set(key, []);
      credsByStudent.get(key).push({
        id: c._id,
        title: c.title,
        issuer: c.issuer || 'Verified Issuer',
        onChain: Boolean(c.solanaTxSignature || c.txSignature),
      });
    }

    const profiles = await StudentProfile.find({ userId: { $in: ids } }).select('userId sandboxSkills');
    const sandboxByStudent = new Map(
      profiles.map((p) => [String(p.userId), (p.sandboxSkills || []).map((s) => s.skillName)])
    );

    const feed = students
      .map((s) => ({
        id: s._id,
        name: s.name,
        credchainId: s.credchainId,
        verified: credsByStudent.get(String(s._id)) || [],
        sandbox: sandboxByStudent.get(String(s._id)) || [],
      }))
      // Surface students with verifiable evidence first (no bias proxies — just
      // count of verified credentials, which is pure evidence).
      .sort((a, b) => b.verified.length - a.verified.length);

    const employer = await ensureEmployerProfile(req.user.id);

    return res.status(200).json({
      success: true,
      count: feed.length,
      chatCreditsRemaining: employer.chatCreditsRemaining,
      students: feed,
    });
  } catch (err) {
    console.error('[employer:talentFeed]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load talent feed.' });
  }
}

module.exports = { talentFeed };
