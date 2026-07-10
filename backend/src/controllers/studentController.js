// ─────────────────────────────────────────────────────────────
// CredChain Backend — Two-Tier Trust Portfolio (System 1)
// Splits a student's portfolio into two explicit ledgers so the employer
// UI can offer a "Hide Unverified" toggle:
//   verifiedLedger → accepted, on-chain credentials (Tier 1).
//   sandboxLedger  → self-taught / sandbox claims (Tier 2).
// ─────────────────────────────────────────────────────────────

const User = require('../models/User');
const Credential = require('../models/Credential');
const StudentProfile = require('../models/StudentProfile');
const { getMemoExplorerUrl } = require('../config/solana');

/** Lazily create-or-fetch a student's profile document. */
async function ensureStudentProfile(userId) {
  let profile = await StudentProfile.findOne({ userId });
  if (!profile) {
    profile = await StudentProfile.create({ userId });
  }
  return profile;
}

// GET /api/v1/student/:userId/portfolio
async function getStudentPortfolio(req, res) {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('name credchainId role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const profile = await ensureStudentProfile(userId);

    // Tier 1 — pull the student's accepted credentials straight from the
    // ledger (authoritative), not just the cached refs, so revocations and
    // newly-accepted credentials are always reflected.
    const accepted = await Credential.find({
      studentId: userId,
      status: 'accepted',
    }).sort({ createdAt: -1 });

    const verifiedLedger = accepted.map((c) => ({
      id: c._id,
      title: c.title,
      issuer: c.issuer || 'Verified Issuer',
      sha256Hash: c.sha256Hash || c.hash,
      solanaTxSignature: c.solanaTxSignature || c.txSignature || null,
      explorerUrl: (c.solanaTxSignature || c.txSignature)
        ? getMemoExplorerUrl(c.solanaTxSignature || c.txSignature)
        : null,
      badgeUrl: `/api/v1/badge/${c._id}`,
      verified: true,
      issuedAt: c.createdAt,
      // Economy layer per-credential fields.
      trustTier:       c.trustTier || 'learner',
      compositeWeight: c.compositeWeight || 0.2,
      skillCategory:   c.skillCategory || 'Other',
      skillName:       c.skillName || '',
      skillTags:       c.skillTags || [],
      deliveryCount:   c.deliveryCount || 0,
    }));

    // Tier 2 — self-asserted, never trusted.
    const sandboxLedger = (profile.sandboxSkills || []).map((s) => ({
      skillName: s.skillName,
      source: s.source || 'Self-taught',
      link: s.link || null,
      verified: false,
      addedAt: s.addedAt,
    }));

    // Tier 1.5 — ATTESTED: a self-declared skill a high-reputation user staked
    // reputation to vouch for. Partial trust — between verified and sandbox.
    const attestedRaw = profile.attestedSkills || [];
    const voucherIds = [...new Set(attestedRaw.map((a) => String(a.voucherId)).filter(Boolean))];
    const vouchers = voucherIds.length
      ? await User.find({ _id: { $in: voucherIds } }).select('name')
      : [];
    const voucherById = new Map(vouchers.map((u) => [String(u._id), u]));
    const attestedLedger = attestedRaw.map((a, i) => ({
      index: i,
      id: a._id,
      skillName: a.skillName,
      source: a.source || 'Self-taught',
      link: a.link || null,
      voucherId: a.voucherId,
      voucherName: voucherById.get(String(a.voucherId))?.name || 'A verified voucher',
      stakedPoints: a.stakedPoints,
      vouchedAt: a.vouchedAt,
      disputeStatus: a.dispute?.status || 'none',
      attested: true,
    }));

    return res.status(200).json({
      success: true,
      message: 'Portfolio fetched.',
      student: { id: user._id, name: user.name, credchainId: user.credchainId },
      counts: { verified: verifiedLedger.length, attested: attestedLedger.length, sandbox: sandboxLedger.length },
      verifiedLedger,
      attestedLedger,
      sandboxLedger,
      // Economy layer profile fields.
      credScore: profile.credScore || {
        value: 300,
        breakdown: { pathwayScore: 0, deliveryScore: 0, disputePenalty: 0, tenureBonus: 0 },
      },
      academicStatus:  profile.academicStatus || 'in_school',
      yearOfStudy:     profile.yearOfStudy,
      university:      profile.university,
      highestTier:     profile.highestTier || 'learner',
      deliveryStats:   profile.deliveryStats || {},
      skillTags:       profile.skillTags || [],
      skillCategories: profile.skillCategories || [],
      discoverable:    profile.discoverable !== false,
      headline:        profile.headline || '',
      aiTelemetry:     profile.aiTelemetry || null,
    });
  } catch (err) {
    console.error('[student:portfolio]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch portfolio.' });
  }
}

// POST /api/v1/student/sandbox-skill
async function addSandboxSkill(req, res) {
  try {
    const { skillName, source, link } = req.body || {};
    if (!skillName) {
      return res.status(400).json({ success: false, message: 'skillName is required.' });
    }

    const profile = await ensureStudentProfile(req.user.id);
    profile.sandboxSkills.push({ skillName, source: source || 'Self-taught', link: link || '' });
    await profile.save();

    return res.status(201).json({
      success: true,
      message: 'Sandbox skill added to your unverified ledger.',
      sandboxSkills: profile.sandboxSkills,
    });
  } catch (err) {
    console.error('[student:addSandboxSkill]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to add sandbox skill.' });
  }
}

// GET /api/v1/talent/search — the employer-side economy layer.
//
// Query params: q, category, tier, country (default NG), status, minScore,
// maxScore, hasDeliveries, page (1), limit (20, max 50).
// Returns: { students, total, page, pages, facets }. Only discoverable profiles.
async function searchTalent(req, res) {
  try {
    const {
      q, category, tier, country = 'NG', status,
      minScore, maxScore, hasDeliveries,
      page = 1, limit = 20,
    } = req.query;

    const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];
    const query = { discoverable: true };

    // Free text: search skill tags, headline, university, course.
    if (q) {
      const regex = new RegExp(q.split(' ').filter(Boolean).join('|'), 'i');
      query.$or = [
        { skillTags: regex },
        { headline: regex },
        { university: regex },
        { course: regex },
      ];
    }

    if (category) query.skillCategories = category;

    // Minimum tier filter (must meet or exceed).
    if (tier && TIER_ORDER.includes(tier)) {
      const minTierIdx = TIER_ORDER.indexOf(tier);
      query.highestTier = { $in: TIER_ORDER.slice(minTierIdx) };
    }

    if (country) query['location.country'] = country;
    if (status) query.academicStatus = status;

    if (minScore || maxScore) {
      query['credScore.value'] = {};
      if (minScore) query['credScore.value'].$gte = parseInt(minScore, 10);
      if (maxScore) query['credScore.value'].$lte = parseInt(maxScore, 10);
    }

    if (hasDeliveries === 'true') {
      query['deliveryStats.completed'] = { $gte: 1 };
    }

    const safeLimit = Math.min(parseInt(limit, 10) || 20, 50);
    const skip = ((parseInt(page, 10) || 1) - 1) * safeLimit;
    const total = await StudentProfile.countDocuments(query);

    const profiles = await StudentProfile
      .find(query)
      .populate('userId', 'name email avatar')
      .populate({
        path: 'verifiedSkills',
        match: { status: 'accepted' },
        select: 'title skillName skillCategory trustTier compositeWeight solanaTxSignature txSignature issuer',
      })
      .sort({ 'credScore.value': -1, 'deliveryStats.completed': -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean();

    // Increment search impressions in the background (fire-and-forget).
    StudentProfile.updateMany(
      { _id: { $in: profiles.map((p) => p._id) } },
      { $inc: { searchImpressions: 1 } }
    ).exec().catch((e) => console.error('[talent:search] impression bump failed:', e.message));

    // Build facets for the filter sidebar (counts by category, tier, status).
    const [categoryFacets, tierFacets, statusFacets] = await Promise.all([
      StudentProfile.aggregate([
        { $match: { discoverable: true } },
        { $unwind: '$skillCategories' },
        { $group: { _id: '$skillCategories', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 15 },
      ]),
      StudentProfile.aggregate([
        { $match: { discoverable: true } },
        { $group: { _id: '$highestTier', count: { $sum: 1 } } },
      ]),
      StudentProfile.aggregate([
        { $match: { discoverable: true } },
        { $group: { _id: '$academicStatus', count: { $sum: 1 } } },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      students: profiles,
      total,
      page: parseInt(page, 10) || 1,
      pages: Math.ceil(total / safeLimit),
      facets: { categories: categoryFacets, tiers: tierFacets, statuses: statusFacets },
    });
  } catch (err) {
    console.error('[talent:search]', err.message);
    return res.status(500).json({ success: false, error: 'Search failed' });
  }
}

module.exports = { getStudentPortfolio, addSandboxSkill, ensureStudentProfile, searchTalent };
