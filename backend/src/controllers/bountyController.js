// ─────────────────────────────────────────────────────────────
// CredChain Backend — Bounty economy (two-sided lifecycle)
//
//   Employer:  createBounty → listMyBounties → listBountyApplicants
//              → acceptApplicant → confirmDelivery (awards credential)
//   Student:   listOpenBounties → applyToBounty → listMyApplications
//              → submitDelivery
//
// SIMULATED ESCROW: the payment "hold" is tracked in Bounty.escrow using the
// same DEMO_MODE-safe anchor path as credentials (anchorHash). No real crypto
// moves. Confirming a delivery is the ONE place the previously-dead
// deliveryScore component of CredScore gets fed: it mints an accepted
// Credential, bumps deliveryStats.completed, and recalculates the score.
// ─────────────────────────────────────────────────────────────

const Bounty = require('../models/Bounty');
const BountyApplication = require('../models/BountyApplication');
const Credential = require('../models/Credential');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const EmployerProfile = require('../models/EmployerProfile');

const { ensureStudentProfile } = require('./studentController');
const { ensureEmployerProfile } = require('./chatController');
const { recalculateCredScore, assignTier } = require('../utils/credScore');
const { computeBountyWeight } = require('../utils/bountyWeight');
const { computeCredentialHash } = require('../utils/hash');
const { anchorHash } = require('../config/solana');

const TIER_ORDER = ['learner', 'practitioner', 'proven_practitioner', 'expert', 'master'];

// Sponsor review window (ms) — once submissions arrive, the sponsor has this
// long to pick winners before escrow can be auto-released. 72h in prod; the
// env override lets the demo trigger it fast.
const REVIEW_WINDOW_MS = Number(process.env.BOUNTY_REVIEW_WINDOW_MS) || 72 * 60 * 60 * 1000;

// Is this sponsor (employer) a vetted one? Drives the verified-sponsor cap.
async function isSponsorVerified(userId) {
  try {
    const emp = await EmployerProfile.findOne({ userId }).select('verified').lean();
    return Boolean(emp?.verified);
  } catch {
    return false;
  }
}

// Map a required tier → a compositeWeight that lands in the matching
// assignTier() band, so a higher-tier bounty awards a stronger credential.
function tierToWeight(tier) {
  switch (tier) {
    case 'master': return 0.97;
    case 'expert': return 0.87;
    case 'proven_practitioner': return 0.70;
    case 'practitioner': return 0.45;
    default: return 0.25; // learner
  }
}

function tierRank(tier) {
  const i = TIER_ORDER.indexOf(tier);
  return i === -1 ? 0 : i;
}

// Shape a Bounty doc for the API — mock-compatible so existing cards render.
function publicBounty(b, extra = {}) {
  return {
    id: b._id,
    company: b.company || 'Company',
    companyLogo: b.companyLogo || '🏢',
    title: b.title,
    description: b.description,
    skill: b.skill || '',
    skillName: b.skillName || '',
    skillCategory: b.skillCategory || 'Other',
    skillTags: b.skillTags || [],
    reward: b.reward || '',
    rewardUSD: b.rewardUSD || 0,
    rewardSOL: b.rewardSOL || 0,
    tests: b.tests || 0,
    requiredTier: b.requiredTier || 'learner',
    openTo: b.openTo || '',
    deadline: b.deadline || '',
    status: b.status,
    escrowConfirmed: ['held', 'released'].includes(b.escrow?.state),
    escrowState: b.escrow?.state || 'none',
    applicantCount: b.applicantCount || 0,
    awardedCredentialId: b.awardedCredentialId || null,
    // ── Global-bounty fields ──────────────────────────────────
    bountyType: b.bountyType || 'assigned',
    prizes: b.prizes || [],
    winners: b.winners || [],
    submissionCount: b.submissionCount || 0,
    sponsorVerified: Boolean(b.sponsorVerified),
    reviewDueAt: b.reviewDueAt || null,
    createdAt: b.createdAt,
    ...extra,
  };
}

// Shape a BountyApplication for the employer's applicant list.
function publicApplication(a) {
  const studentRef = a.studentId && typeof a.studentId === 'object' ? a.studentId : null;
  return {
    id: a._id,
    bountyId: a.bountyId,
    studentId: studentRef ? studentRef._id : a.studentId,
    studentName: a.studentName || studentRef?.name || 'Student',
    credchainId: studentRef?.credchainId,
    credScore: a.credScoreSnapshot,
    highestTier: a.highestTierSnapshot,
    message: a.message || '',
    status: a.status,
    delivery: a.delivery && a.delivery.submittedAt ? a.delivery : null,
    placement: a.placement || null,
    isWinner: Boolean(a.isWinner),
    rating: a.rating || null,
    createdAt: a.createdAt,
  };
}

// ── GET /api/v1/bounties (any authed role) ───────────────────
// Students additionally receive `myApplicationStatus` per bounty so the Earn
// tab can show "Applied"/"Accepted"/… instead of the Apply button.
async function listOpenBounties(req, res) {
  try {
    const bounties = await Bounty.find({ status: { $in: ['open', 'in_progress', 'delivered'] } })
      .sort({ createdAt: -1 })
      .lean();

    let statusByBounty = {};
    if (req.user.role === 'student') {
      const apps = await BountyApplication
        .find({ studentId: req.user.id })
        .select('bountyId status _id')
        .lean();
      statusByBounty = apps.reduce((acc, a) => {
        acc[String(a.bountyId)] = { status: a.status, applicationId: a._id };
        return acc;
      }, {});
    }

    const shaped = bounties.map((b) => {
      const mine = statusByBounty[String(b._id)];
      return publicBounty(b, {
        myApplicationStatus: mine?.status || null,
        myApplicationId: mine?.applicationId || null,
      });
    });

    return res.status(200).json({ success: true, count: shaped.length, bounties: shaped });
  } catch (err) {
    console.error('[bounty:listOpen]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load bounties.' });
  }
}

// ── POST /api/v1/bounties (employer) ─────────────────────────
// Escrow is HELD at post time — matches the "payment held safely up front,
// before you start" copy the Earn tab already shows.
async function createBounty(req, res) {
  try {
    const {
      title, description, skill, skillName, skillCategory, skillTags,
      reward, rewardUSD, rewardSOL, tests, requiredTier, openTo, deadline, companyLogo,
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'title and description are required.' });
    }
    if (requiredTier && !TIER_ORDER.includes(requiredTier)) {
      return res.status(400).json({ success: false, message: 'Invalid requiredTier.' });
    }

    // Resolve the poster's company name for card display.
    let company = req.user.name;
    try {
      const employer = await ensureEmployerProfile(req.user.id);
      company = employer.companyName || company;
    } catch { /* non-fatal — fall back to user name */ }

    const tags = Array.isArray(skillTags)
      ? skillTags
      : String(skillTags || '').split(',').map((t) => t.trim()).filter(Boolean);

    const amountSOL = Number(rewardSOL) || 0;

    const bounty = new Bounty({
      employerId: req.user.id,
      company,
      companyLogo: companyLogo || '🏢',
      title,
      description,
      skill: skill || skillCategory || '',
      skillName: skillName || skill || title,
      skillCategory: skillCategory || 'Other',
      skillTags: tags,
      reward: reward || '',
      rewardUSD: Number(rewardUSD) || 0,
      rewardSOL: amountSOL,
      tests: Number(tests) || 0,
      requiredTier: requiredTier || 'learner',
      openTo: openTo || '',
      deadline: deadline || '',
      status: 'open',
    });

    // Simulate holding the payment in escrow up front (DEMO_MODE-safe).
    try {
      const anchor = await anchorHash(`${title}|${req.user.id}|escrow`);
      bounty.escrow = {
        state: 'held',
        amountSOL,
        heldAt: new Date(),
        txSignature: anchor.signature || undefined,
        mock: anchor.mock,
      };
    } catch (escrowErr) {
      // Non-fatal: still hold in DB even if the mock anchor hiccups.
      console.error('[bounty:create] escrow anchor failed:', escrowErr.message);
      bounty.escrow = { state: 'held', amountSOL, heldAt: new Date(), mock: true };
    }

    await bounty.save();
    return res.status(201).json({ success: true, message: 'Bounty posted. Payment held in escrow.', bounty: publicBounty(bounty) });
  } catch (err) {
    console.error('[bounty:create]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to post bounty.' });
  }
}

// ── GET /api/v1/bounties/mine (employer) ─────────────────────
async function listMyBounties(req, res) {
  try {
    const bounties = await Bounty.find({ employerId: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      success: true,
      count: bounties.length,
      bounties: bounties.map((b) => publicBounty(b)),
    });
  } catch (err) {
    console.error('[bounty:listMine]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load your bounties.' });
  }
}

// ── GET /api/v1/bounties/applications/mine (student) ─────────
async function listMyApplications(req, res) {
  try {
    const apps = await BountyApplication
      .find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('bountyId', 'title company companyLogo reward status skillName skillCategory requiredTier bountyType')
      .lean();

    const applications = apps.map((a) => ({
      id: a.id || a._id,
      status: a.status,
      message: a.message || '',
      delivery: a.delivery && a.delivery.submittedAt ? a.delivery : null,
      rating: a.rating || null,
      createdAt: a.createdAt,
      bounty: a.bountyId
        ? {
            id: a.bountyId._id,
            title: a.bountyId.title,
            company: a.bountyId.company,
            companyLogo: a.bountyId.companyLogo,
            reward: a.bountyId.reward,
            status: a.bountyId.status,
            skillName: a.bountyId.skillName,
            skillCategory: a.bountyId.skillCategory,
            requiredTier: a.bountyId.requiredTier,
            bountyType: a.bountyId.bountyType || 'assigned',
          }
        : null,
    }));

    return res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error('[bounty:listMyApplications]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load your applications.' });
  }
}

// ── POST /api/v1/bounties/:id/apply (student) ────────────────
async function applyToBounty(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found.' });
    if (bounty.status !== 'open') {
      return res.status(409).json({ success: false, message: 'This bounty is no longer accepting applications.' });
    }

    // Server-side tier gate — never trust the client.
    const profile = await ensureStudentProfile(req.user.id);
    const myTier = profile.highestTier || 'learner';
    if (tierRank(myTier) < tierRank(bounty.requiredTier)) {
      return res.status(403).json({
        success: false,
        message: `This task needs ${bounty.requiredTier.replace('_', ' ')} tier. Verify more skills to unlock it.`,
      });
    }

    const user = await User.findById(req.user.id).select('name');

    try {
      const application = await BountyApplication.create({
        bountyId: bounty._id,
        studentId: req.user.id,
        employerId: bounty.employerId,
        studentName: user?.name || 'Student',
        credScoreSnapshot: profile.credScore?.value || 300,
        highestTierSnapshot: myTier,
        message: (req.body?.message || '').slice(0, 1000),
        status: 'applied',
      });
      bounty.applicantCount = (bounty.applicantCount || 0) + 1;
      await bounty.save();

      return res.status(201).json({
        success: true,
        message: 'Applied. The employer will review your verified skills.',
        application: publicApplication(application),
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        return res.status(409).json({ success: false, message: 'You have already applied to this bounty.' });
      }
      throw dupErr;
    }
  } catch (err) {
    console.error('[bounty:apply]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to apply.' });
  }
}

// ── POST /api/v1/bounties/:id/applications/:appId/deliver (student) ──
async function submitDelivery(req, res) {
  try {
    const { id, appId } = req.params;
    const app = await BountyApplication.findById(appId);
    if (!app || String(app.bountyId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (String(app.studentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'This is not your application.' });
    }
    if (app.status !== 'accepted') {
      return res.status(409).json({ success: false, message: 'You can only deliver an accepted task.' });
    }

    const { text, links } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Describe your delivery before submitting.' });
    }
    const linkList = Array.isArray(links)
      ? links
      : String(links || '').split(',').map((l) => l.trim()).filter(Boolean);

    app.delivery = { submittedAt: new Date(), text: String(text).slice(0, 4000), links: linkList };
    app.status = 'delivered';
    await app.save();

    const bounty = await Bounty.findById(id);
    if (bounty) { bounty.status = 'delivered'; await bounty.save(); }

    return res.status(200).json({
      success: true,
      message: 'Delivery submitted. The employer has 72 hours to confirm.',
      application: publicApplication(app),
    });
  } catch (err) {
    console.error('[bounty:submitDelivery]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit delivery.' });
  }
}

// ── GET /api/v1/bounties/:id/applications (employer) ─────────
async function listBountyApplicants(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found.' });
    if (String(bounty.employerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only view applicants for your own bounties.' });
    }

    const apps = await BountyApplication
      .find({ bountyId: bounty._id })
      .sort({ createdAt: 1 })
      .populate('studentId', 'name credchainId');

    return res.status(200).json({
      success: true,
      bounty: publicBounty(bounty),
      applications: apps.map(publicApplication),
    });
  } catch (err) {
    console.error('[bounty:listApplicants]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load applicants.' });
  }
}

// ── POST /api/v1/bounties/:id/applications/:appId/accept (employer) ──
async function acceptApplicant(req, res) {
  try {
    const { id, appId } = req.params;
    const bounty = await Bounty.findById(id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found.' });
    if (String(bounty.employerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only manage your own bounties.' });
    }
    if (bounty.status !== 'open') {
      return res.status(409).json({ success: false, message: 'This bounty already has an accepted applicant.' });
    }

    const app = await BountyApplication.findById(appId);
    if (!app || String(app.bountyId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (app.status !== 'applied') {
      return res.status(409).json({ success: false, message: 'That applicant can no longer be accepted.' });
    }

    // Accept this one, reject the rest, move the bounty into progress.
    app.status = 'accepted';
    await app.save();
    await BountyApplication.updateMany(
      { bountyId: bounty._id, _id: { $ne: app._id }, status: 'applied' },
      { $set: { status: 'rejected' } }
    );

    bounty.status = 'in_progress';
    bounty.acceptedApplicationId = app._id;
    await bounty.save();

    return res.status(200).json({
      success: true,
      message: 'Applicant accepted. They can now deliver their work.',
      bounty: publicBounty(bounty),
      application: publicApplication(app),
    });
  } catch (err) {
    console.error('[bounty:accept]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to accept applicant.' });
  }
}

// ── POST /api/v1/bounties/:id/applications/:appId/confirm (employer) ──
// CORE AWARD HANDLER — mints the verified credential, bumps the delivery
// stats, recalculates CredScore, and releases the escrow.
async function confirmDelivery(req, res) {
  try {
    const { id, appId } = req.params;
    const bounty = await Bounty.findById(id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found.' });
    if (String(bounty.employerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only manage your own bounties.' });
    }

    const app = await BountyApplication.findById(appId);
    if (!app || String(app.bountyId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (bounty.status !== 'delivered' || app.status !== 'delivered') {
      return res.status(409).json({ success: false, message: 'There is no submitted delivery to confirm yet.' });
    }

    // 1. Mint an accepted, on-chain-anchored Credential (reuses the exact
    //    pattern from credentialController.issueCredential).
    const weight = tierToWeight(bounty.requiredTier);
    const cred = new Credential({
      title: `${bounty.skillName || bounty.title} — via ${bounty.company} bounty`,
      issuer: bounty.company,
      issuerId: bounty.employerId,
      studentId: app.studentId,
      status: 'accepted',
      skillCategory: bounty.skillCategory || 'Other',
      skillName: bounty.skillName || bounty.skill || bounty.title,
      skillTags: bounty.skillTags || [],
      compositeWeight: weight,
      trustTier: assignTier(weight),
      deliveryCount: 1,
    });
    cred.sha256Hash = computeCredentialHash(cred);
    cred.hash = cred.sha256Hash;
    try {
      const anchor = await anchorHash(cred.sha256Hash);
      if (anchor.signature) {
        cred.solanaTxSignature = anchor.signature;
        cred.txSignature = anchor.signature;
      }
    } catch (chainErr) {
      console.error('[bounty:confirm] anchor failed:', chainErr.message);
    }
    await cred.save();

    // 2. Bump delivery stats + recalc CredScore (feeds deliveryScore).
    let newCredScore = null;
    try {
      const profile = await ensureStudentProfile(app.studentId);
      profile.deliveryStats.total = (profile.deliveryStats.total || 0) + 1;
      profile.deliveryStats.completed = (profile.deliveryStats.completed || 0) + 1;
      profile.deliveryStats.totalEarnedSOL =
        (profile.deliveryStats.totalEarnedSOL || 0) + (bounty.escrow?.amountSOL || 0);
      if (!profile.verifiedSkills.some((cid) => String(cid) === String(cred._id))) {
        profile.verifiedSkills.push(cred._id);
      }
      await profile.save();

      const allAccepted = await Credential.find({ studentId: app.studentId, status: 'accepted' });
      const score = await recalculateCredScore(profile, allAccepted);
      newCredScore = score?.value ?? null;
    } catch (scoreErr) {
      // Non-fatal — the credential is already awarded.
      console.error('[bounty:confirm] credScore recalc failed:', scoreErr.message);
    }

    // 3. Release escrow + close out the lifecycle.
    bounty.escrow.state = 'released';
    bounty.escrow.releasedAt = new Date();
    bounty.status = 'completed';
    bounty.awardedCredentialId = cred._id;
    await bounty.save();

    app.status = 'confirmed';
    app.confirmedAt = new Date();
    app.awardedCredentialId = cred._id;
    await app.save();

    return res.status(200).json({
      success: true,
      message: 'Delivery confirmed. Payment released and a verified credential was awarded.',
      newCredScore,
      credential: {
        id: cred._id,
        title: cred.title,
        trustTier: cred.trustTier,
        txSignature: cred.txSignature || null,
      },
      bounty: publicBounty(bounty),
    });
  } catch (err) {
    console.error('[bounty:confirm]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to confirm delivery.' });
  }
}

// ═════════════════════════════════════════════════════════════
// DIRECT "LIVE TASK" ASSIGNMENT
//
// An employer browses Talent Search, finds a student they like, and assigns
// them a paid task directly — no open call, no application queue. The student
// accepts or declines. On accept it rejoins the EXACT same
// deliver → confirm → mint pipeline as an assigned bounty (submitDelivery /
// confirmDelivery are reused unchanged), so the awarded credential runs
// through the same corroboration-aware weighting. Escrow is held up front so
// the offer is real; declining refunds it immediately.
// ═════════════════════════════════════════════════════════════

// ── POST /api/v1/bounties/direct (employer) ──────────────────
// Body: { studentId, title, description, skill…, reward…, requiredTier?, deadline? }
async function createDirectTask(req, res) {
  try {
    const {
      studentId, title, description, skill, skillName, skillCategory, skillTags,
      reward, rewardUSD, rewardSOL, tests, requiredTier, deadline, companyLogo,
    } = req.body || {};

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'studentId (the student to assign) is required.' });
    }
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'title and description are required.' });
    }
    if (requiredTier && !TIER_ORDER.includes(requiredTier)) {
      return res.status(400).json({ success: false, message: 'Invalid requiredTier.' });
    }

    // The target must be a real, discoverable student. Any discoverable
    // student may be assigned (tier is informational, not a gate) — the
    // awarded credential's WEIGHT still scales with real corroboration.
    const targetUser = await User.findById(studentId).select('name role');
    if (!targetUser || targetUser.role !== 'student') {
      return res.status(404).json({ success: false, message: 'That student could not be found.' });
    }
    const targetProfile = await ensureStudentProfile(studentId);
    if (targetProfile.discoverable === false) {
      return res.status(403).json({ success: false, message: 'That student is not currently open to offers.' });
    }

    // Resolve the poster's company name for card display.
    let company = req.user.name;
    try {
      const employer = await ensureEmployerProfile(req.user.id);
      company = employer.companyName || company;
    } catch { /* non-fatal */ }

    const tags = Array.isArray(skillTags)
      ? skillTags
      : String(skillTags || '').split(',').map((t) => t.trim()).filter(Boolean);
    const amountSOL = Number(rewardSOL) || 0;

    const bounty = new Bounty({
      employerId: req.user.id,
      bountyType: 'direct',
      company,
      companyLogo: companyLogo || '🎯',
      title,
      description,
      skill: skill || skillCategory || '',
      skillName: skillName || skill || title,
      skillCategory: skillCategory || 'Other',
      skillTags: tags,
      reward: reward || '',
      rewardUSD: Number(rewardUSD) || 0,
      rewardSOL: amountSOL,
      tests: Number(tests) || 0,
      requiredTier: requiredTier || 'learner',
      openTo: `Directly assigned to ${targetUser.name}`,
      deadline: deadline || '',
      invitedStudentId: studentId,
      invitedStudentName: targetUser.name,
      status: 'invited',
    });

    // Hold escrow up front (DEMO_MODE-safe) — a direct offer is money-backed.
    try {
      const anchor = await anchorHash(`${title}|${req.user.id}|direct|${studentId}`);
      bounty.escrow = {
        state: 'held', amountSOL, heldAt: new Date(),
        txSignature: anchor.signature || undefined, mock: anchor.mock,
      };
    } catch (escrowErr) {
      console.error('[bounty:createDirect] escrow anchor failed:', escrowErr.message);
      bounty.escrow = { state: 'held', amountSOL, heldAt: new Date(), mock: true };
    }
    await bounty.save();

    // Create the invite as a BountyApplication so it shows up in the
    // student's existing "my applications" surface, with status 'invited'.
    const application = await BountyApplication.create({
      bountyId: bounty._id,
      studentId,
      employerId: req.user.id,
      studentName: targetUser.name,
      credScoreSnapshot: targetProfile.credScore?.value || 300,
      highestTierSnapshot: targetProfile.highestTier || 'learner',
      message: (req.body?.message || '').slice(0, 1000),
      status: 'invited',
    });
    bounty.applicantCount = 1;
    await bounty.save();

    return res.status(201).json({
      success: true,
      message: `Task assigned to ${targetUser.name}. Payment held in escrow until they deliver.`,
      bounty: publicBounty(bounty),
      application: publicApplication(application),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already have a task open with this student.' });
    }
    console.error('[bounty:createDirect]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to assign the task.' });
  }
}

// ── POST /api/v1/bounties/:id/respond (student) ──────────────
// Body: { decision: 'accept' | 'decline' }. The invited student accepts
// (task → in_progress, ready to deliver) or declines (escrow refunded).
async function respondToDirectTask(req, res) {
  try {
    const { decision } = req.body || {};
    if (!['accept', 'decline'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'accept' or 'decline'." });
    }

    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.bountyType !== 'direct') {
      return res.status(404).json({ success: false, message: 'Direct task not found.' });
    }
    if (String(bounty.invitedStudentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'This task was not assigned to you.' });
    }
    if (bounty.status !== 'invited') {
      return res.status(409).json({ success: false, message: 'You have already responded to this task.' });
    }

    const app = await BountyApplication.findOne({ bountyId: bounty._id, studentId: req.user.id });
    if (!app) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    if (decision === 'accept') {
      app.status = 'accepted';
      await app.save();
      bounty.status = 'in_progress';
      bounty.acceptedApplicationId = app._id;
      await bounty.save();
      return res.status(200).json({
        success: true,
        message: 'Task accepted. Deliver your work when ready — payment is held in escrow.',
        bounty: publicBounty(bounty),
        application: publicApplication(app),
      });
    }

    // Decline → refund escrow, close the task.
    app.status = 'declined';
    await app.save();
    if (bounty.escrow && bounty.escrow.state === 'held') {
      bounty.escrow.state = 'refunded';
      bounty.escrow.releasedAt = new Date();
    }
    bounty.status = 'declined';
    await bounty.save();
    return res.status(200).json({
      success: true,
      message: 'Task declined. The employer’s escrow has been refunded.',
      bounty: publicBounty(bounty),
      application: publicApplication(app),
    });
  } catch (err) {
    console.error('[bounty:respondDirect]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to respond to the task.' });
  }
}

// ── POST /api/v1/bounties/:id/applications/:appId/rate ───────
// Two-way rating, role-aware. Employer rates the student / student rates the
// employer — only AFTER the work is confirmed (or won). Updates a rolling
// average on the counterparty's profile. NEVER touches CredScore.
async function rateCounterparty(req, res) {
  try {
    const { id, appId } = req.params;
    const stars = Number(req.body?.stars);
    const comment = String(req.body?.comment || '').slice(0, 500);
    if (!(stars >= 1 && stars <= 5)) {
      return res.status(400).json({ success: false, message: 'stars must be between 1 and 5.' });
    }

    const app = await BountyApplication.findById(appId);
    if (!app || String(app.bountyId) !== String(id)) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (!['confirmed', 'won'].includes(app.status)) {
      return res.status(409).json({ success: false, message: 'You can only rate after the work is confirmed.' });
    }

    const isEmployer = String(app.employerId) === String(req.user.id);
    const isStudent = String(app.studentId) === String(req.user.id);
    if (!isEmployer && !isStudent) {
      return res.status(403).json({ success: false, message: 'You were not part of this task.' });
    }

    app.rating = app.rating || {};
    const now = new Date();

    if (isEmployer) {
      if (app.rating.employerToStudent?.stars) {
        return res.status(409).json({ success: false, message: 'You have already rated this student.' });
      }
      app.rating.employerToStudent = { stars, comment, at: now };
      await app.save();
      // Roll into the student's average.
      try {
        const sp = await StudentProfile.findOne({ userId: app.studentId });
        if (sp) {
          const n = sp.ratingCount || 0;
          sp.ratingAvg = Number((((sp.ratingAvg || 0) * n + stars) / (n + 1)).toFixed(2));
          sp.ratingCount = n + 1;
          await sp.save();
        }
      } catch (e) { console.error('[bounty:rate] student avg failed:', e.message); }
    } else {
      if (app.rating.studentToEmployer?.stars) {
        return res.status(409).json({ success: false, message: 'You have already rated this employer.' });
      }
      app.rating.studentToEmployer = { stars, comment, at: now };
      await app.save();
      // Roll into the employer's sponsor average.
      try {
        const employer = await ensureEmployerProfile(app.employerId);
        employer.sponsorStats = employer.sponsorStats || {};
        const n = employer.sponsorStats.ratingCount || 0;
        employer.sponsorStats.ratingAvg =
          Number((((employer.sponsorStats.ratingAvg || 0) * n + stars) / (n + 1)).toFixed(2));
        employer.sponsorStats.ratingCount = n + 1;
        await employer.save();
      } catch (e) { console.error('[bounty:rate] employer avg failed:', e.message); }
    }

    return res.status(200).json({
      success: true,
      message: 'Rating submitted. Thanks for the feedback.',
      rating: app.rating,
    });
  } catch (err) {
    console.error('[bounty:rate]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit rating.' });
  }
}

// ── POST /api/v1/bounties/:id/cancel (employer) ──────────────
// Sponsor accountability: cancelling refunds escrow, but if entries already
// arrived it's recorded on the sponsor's reputation (cancelledWithEntries) so
// harvesting free work then bailing carries a visible cost.
async function cancelBounty(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty) return res.status(404).json({ success: false, message: 'Bounty not found.' });
    if (String(bounty.employerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own bounties.' });
    }
    if (['completed', 'cancelled'].includes(bounty.status)) {
      return res.status(409).json({ success: false, message: 'This bounty is already closed.' });
    }

    const hadEntries = (bounty.submissionCount || 0) > 0 || (bounty.applicantCount || 0) > 0;

    if (bounty.escrow && bounty.escrow.state === 'held') {
      bounty.escrow.state = 'refunded';
      bounty.escrow.releasedAt = new Date();
    }
    bounty.status = 'cancelled';
    await bounty.save();

    // Reject/close any live applications.
    await BountyApplication.updateMany(
      { bountyId: bounty._id, status: { $in: ['invited', 'applied', 'accepted', 'submitted'] } },
      { $set: { status: 'not_selected' } }
    );

    if (hadEntries) {
      try {
        const employer = await ensureEmployerProfile(bounty.employerId);
        employer.sponsorStats = employer.sponsorStats || {};
        employer.sponsorStats.cancelledWithEntries = (employer.sponsorStats.cancelledWithEntries || 0) + 1;
        await employer.save();
      } catch { /* non-fatal */ }
    }

    return res.status(200).json({
      success: true,
      message: hadEntries
        ? 'Bounty cancelled and escrow refunded. Cancelling after entries arrived is noted on your sponsor record.'
        : 'Bounty cancelled and escrow refunded.',
      bounty: publicBounty(bounty),
    });
  } catch (err) {
    console.error('[bounty:cancel]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to cancel bounty.' });
  }
}

// ═════════════════════════════════════════════════════════════
// GLOBAL (OPEN COMPETITION) BOUNTIES
//
//   Sponsor:  createGlobalBounty (escrow-funds the whole prize pool up front)
//             → listGlobalSubmissions → selectWinners (split + mint + pay)
//   Student:  listGlobalBounties → submitToGlobalBounty (direct, no accept step)
//
// The credential a winner earns is weighted by computeBountyWeight() — the
// anti-fraud core. A self-dealt bounty with no real field mints a worthless
// credential; only a genuinely contested win + a vetted sponsor mints strong.
// ═════════════════════════════════════════════════════════════

// Shape a prize array from the sponsor's input, normalising ranks/labels.
function normalisePrizes(prizes) {
  if (!Array.isArray(prizes)) return [];
  return prizes
    .map((p, i) => ({
      rank: Number(p.rank) || i + 1,
      label: p.label || `${ordinal(Number(p.rank) || i + 1)} place`,
      amountSOL: Number(p.amountSOL) || 0,
      amountUSD: Number(p.amountUSD) || 0,
      reward: p.reward || (p.amountUSD ? `$${p.amountUSD}` : `${Number(p.amountSOL) || 0} SOL`),
    }))
    .sort((a, b) => a.rank - b.rank);
}

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── GET /api/v1/bounties/global (any authed role) ────────────
async function listGlobalBounties(req, res) {
  try {
    const bounties = await Bounty.find({ bountyType: 'global', status: { $ne: 'cancelled' } })
      .sort({ createdAt: -1 })
      .lean();

    // Students get their own submission status per bounty.
    let statusByBounty = {};
    if (req.user.role === 'student') {
      const apps = await BountyApplication.find({ studentId: req.user.id })
        .select('bountyId status placement isWinner _id')
        .lean();
      statusByBounty = apps.reduce((acc, a) => {
        acc[String(a.bountyId)] = { status: a.status, placement: a.placement, isWinner: a.isWinner, applicationId: a._id };
        return acc;
      }, {});
    }

    const shaped = bounties.map((b) => {
      const mine = statusByBounty[String(b._id)];
      return publicBounty(b, {
        mySubmissionStatus: mine?.status || null,
        myPlacement: mine?.placement || null,
        myIsWinner: mine?.isWinner || false,
        myApplicationId: mine?.applicationId || null,
      });
    });

    return res.status(200).json({ success: true, count: shaped.length, bounties: shaped });
  } catch (err) {
    console.error('[bounty:listGlobal]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load global bounties.' });
  }
}

// ── POST /api/v1/bounties/global (employer) ──────────────────
// Escrow HOLDS the full prize pool at post time — a sponsor cannot list a
// bounty they can't pay for. This is the primary bad-sponsor gate.
async function createGlobalBounty(req, res) {
  try {
    const {
      title, description, skill, skillName, skillCategory, skillTags,
      prizes, requiredTier, openTo, deadline, companyLogo, tests,
    } = req.body || {};

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'title and description are required.' });
    }
    if (requiredTier && !TIER_ORDER.includes(requiredTier)) {
      return res.status(400).json({ success: false, message: 'Invalid requiredTier.' });
    }

    const prizePool = normalisePrizes(prizes);
    if (prizePool.length === 0) {
      return res.status(400).json({ success: false, message: 'A global bounty needs at least one prize.' });
    }

    const totalSOL = prizePool.reduce((s, p) => s + (p.amountSOL || 0), 0);
    const totalUSD = prizePool.reduce((s, p) => s + (p.amountUSD || 0), 0);

    // Resolve sponsor company + verified status.
    let company = req.user.name;
    let sponsorVerified = false;
    try {
      const employer = await ensureEmployerProfile(req.user.id);
      company = employer.companyName || company;
      sponsorVerified = Boolean(employer.verified);
      employer.sponsorStats = employer.sponsorStats || {};
      employer.sponsorStats.bountiesPosted = (employer.sponsorStats.bountiesPosted || 0) + 1;
      employer.sponsorStats.totalEscrowedSOL = (employer.sponsorStats.totalEscrowedSOL || 0) + totalSOL;
      await employer.save();
    } catch { /* non-fatal */ }

    const tags = Array.isArray(skillTags)
      ? skillTags
      : String(skillTags || '').split(',').map((t) => t.trim()).filter(Boolean);

    const bounty = new Bounty({
      employerId: req.user.id,
      bountyType: 'global',
      company,
      companyLogo: companyLogo || '🏆',
      title,
      description,
      skill: skill || skillCategory || '',
      skillName: skillName || skill || title,
      skillCategory: skillCategory || 'Other',
      skillTags: tags,
      prizes: prizePool,
      reward: `${totalSOL} SOL pool`,
      rewardUSD: totalUSD,
      rewardSOL: totalSOL,
      tests: Number(tests) || 0,
      requiredTier: requiredTier || 'learner',
      openTo: openTo || 'Open to everyone who qualifies',
      deadline: deadline || '',
      sponsorVerified,
      status: 'open',
    });

    // Hold the ENTIRE pool in escrow up front (DEMO_MODE-safe).
    try {
      const anchor = await anchorHash(`${title}|${req.user.id}|global-escrow|${totalSOL}`);
      bounty.escrow = {
        state: 'held',
        amountSOL: totalSOL,
        heldAt: new Date(),
        txSignature: anchor.signature || undefined,
        mock: anchor.mock,
      };
    } catch (escrowErr) {
      console.error('[bounty:createGlobal] escrow anchor failed:', escrowErr.message);
      bounty.escrow = { state: 'held', amountSOL: totalSOL, heldAt: new Date(), mock: true };
    }

    await bounty.save();
    return res.status(201).json({
      success: true,
      message: `Global bounty posted. ${totalSOL} SOL prize pool held in escrow.`,
      bounty: publicBounty(bounty),
    });
  } catch (err) {
    console.error('[bounty:createGlobal]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to post global bounty.' });
  }
}

// ── POST /api/v1/bounties/:id/submit (student) ───────────────
// Direct submission to an open competition — no apply/accept handshake.
// GUARDRAIL: a sponsor cannot submit to their own bounty (self-dealing block).
async function submitToGlobalBounty(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.bountyType !== 'global') {
      return res.status(404).json({ success: false, message: 'Global bounty not found.' });
    }
    if (bounty.status !== 'open') {
      return res.status(409).json({ success: false, message: 'This bounty is no longer accepting submissions.' });
    }

    // Self-dealing block: the sponsor (or their own account) can't compete.
    if (String(bounty.employerId) === String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You cannot submit to a bounty you posted.' });
    }

    const { text, links } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ success: false, message: 'Describe your submission before sending.' });
    }

    // Server-side tier gate.
    const profile = await ensureStudentProfile(req.user.id);
    const myTier = profile.highestTier || 'learner';
    if (tierRank(myTier) < tierRank(bounty.requiredTier)) {
      return res.status(403).json({
        success: false,
        message: `This bounty needs ${bounty.requiredTier.replace('_', ' ')} tier. Verify more skills to enter.`,
      });
    }

    const user = await User.findById(req.user.id).select('name');
    const linkList = Array.isArray(links)
      ? links
      : String(links || '').split(',').map((l) => l.trim()).filter(Boolean);

    try {
      const submission = await BountyApplication.create({
        bountyId: bounty._id,
        studentId: req.user.id,
        employerId: bounty.employerId,
        studentName: user?.name || 'Student',
        credScoreSnapshot: profile.credScore?.value || 300,
        highestTierSnapshot: myTier,
        message: (req.body?.message || '').slice(0, 1000),
        status: 'submitted',
        delivery: { submittedAt: new Date(), text: String(text).slice(0, 4000), links: linkList },
      });

      bounty.submissionCount = (bounty.submissionCount || 0) + 1;
      bounty.applicantCount = bounty.submissionCount;
      // Start / extend the sponsor review clock now that a real entry exists.
      if (!bounty.reviewDueAt) bounty.reviewDueAt = new Date(Date.now() + REVIEW_WINDOW_MS);
      await bounty.save();

      return res.status(201).json({
        success: true,
        message: 'Submission received. You are now in the running.',
        submission: publicApplication(submission),
      });
    } catch (dupErr) {
      if (dupErr.code === 11000) {
        return res.status(409).json({ success: false, message: 'You have already submitted to this bounty.' });
      }
      throw dupErr;
    }
  } catch (err) {
    console.error('[bounty:submitGlobal]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit.' });
  }
}

// ── GET /api/v1/bounties/:id/submissions ─────────────────────
// The sponsor sees the full field to judge. Also serves as the PUBLIC
// submission gallery (any authed user can view a bounty's entries) once the
// bounty is completed — reinforcing "proof of work is public".
async function listGlobalSubmissions(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.bountyType !== 'global') {
      return res.status(404).json({ success: false, message: 'Global bounty not found.' });
    }

    const isSponsor = String(bounty.employerId) === String(req.user.id);
    // Non-sponsors can only browse the gallery once the bounty is decided.
    if (!isSponsor && bounty.status !== 'completed') {
      return res.status(403).json({ success: false, message: 'Submissions are visible once winners are announced.' });
    }

    const subs = await BountyApplication.find({ bountyId: bounty._id })
      .sort({ isWinner: -1, placement: 1, createdAt: 1 })
      .populate('studentId', 'name credchainId');

    return res.status(200).json({
      success: true,
      bounty: publicBounty(bounty),
      isSponsor,
      submissions: subs.map(publicApplication),
    });
  } catch (err) {
    console.error('[bounty:listSubmissions]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load submissions.' });
  }
}

// ── POST /api/v1/bounties/:id/select-winners (employer) ──────
// CORE AWARD HANDLER for global bounties. Body: { winners: [{ appId, rank }] }.
// Splits the escrowed pool by rank, mints a COMPETITION-SCALED credential per
// winner, releases the prize, bumps CredScore. Weights come from
// computeBountyWeight — a shallow/self-dealt field mints near-worthless proof.
async function selectWinners(req, res) {
  try {
    const bounty = await Bounty.findById(req.params.id);
    if (!bounty || bounty.bountyType !== 'global') {
      return res.status(404).json({ success: false, message: 'Global bounty not found.' });
    }
    if (String(bounty.employerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only judge your own bounty.' });
    }
    if (bounty.status === 'completed') {
      return res.status(409).json({ success: false, message: 'Winners have already been selected.' });
    }

    const picks = Array.isArray(req.body?.winners) ? req.body.winners : [];
    if (picks.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one winner.' });
    }

    const submissionCount = bounty.submissionCount || 0;
    const winnersOut = [];

    for (const pick of picks) {
      const app = await BountyApplication.findById(pick.appId);
      if (!app || String(app.bountyId) !== String(bounty._id)) continue;
      if (app.status !== 'submitted') continue;

      // Self-award block (belt-and-braces — submission already blocks this).
      if (String(app.studentId) === String(bounty.employerId)) continue;

      const rank = Number(pick.rank) || (winnersOut.length + 1);
      const prize = (bounty.prizes || []).find((p) => p.rank === rank) || bounty.prizes?.[winnersOut.length] || {};

      // ── The anti-fraud weighting ──
      const { weight, cappedBySponsor, competitionFactor } = computeBountyWeight({
        requiredTier: bounty.requiredTier,
        submissionCount,
        placement: rank,
        sponsorVerified: bounty.sponsorVerified,
      });

      // Mint the credential — carrying a full audit trail (sponsor, field size,
      // placement) so a suspicious "win" is disputable + revocable later.
      const cred = new Credential({
        title: `${bounty.skillName || bounty.title} — ${ordinal(rank)} of ${submissionCount}, ${bounty.company} bounty`,
        issuer: bounty.company,
        issuerId: bounty.employerId,
        studentId: app.studentId,
        status: 'accepted',
        skillCategory: bounty.skillCategory || 'Other',
        skillName: bounty.skillName || bounty.skill || bounty.title,
        skillTags: bounty.skillTags || [],
        compositeWeight: weight,
        trustTier: assignTier(weight),
        deliveryCount: 1,
        bounty: {
          bountyId: bounty._id,
          sponsorId: bounty.employerId,
          sponsorVerified: bounty.sponsorVerified,
          submissionCount,
          placement: rank,
          competitionFactor,
          cappedBySponsor,
        },
      });
      cred.sha256Hash = computeCredentialHash(cred);
      cred.hash = cred.sha256Hash;
      try {
        const anchor = await anchorHash(cred.sha256Hash);
        if (anchor.signature) {
          cred.solanaTxSignature = anchor.signature;
          cred.txSignature = anchor.signature;
        }
      } catch (chainErr) {
        console.error('[bounty:selectWinners] anchor failed:', chainErr.message);
      }
      await cred.save();

      // Update the submission → winner.
      app.status = 'won';
      app.placement = rank;
      app.isWinner = true;
      app.confirmedAt = new Date();
      app.awardedCredentialId = cred._id;
      await app.save();

      // Bump the winner's stats + CredScore.
      let newCredScore = null;
      try {
        const profile = await ensureStudentProfile(app.studentId);
        profile.deliveryStats.total = (profile.deliveryStats.total || 0) + 1;
        profile.deliveryStats.completed = (profile.deliveryStats.completed || 0) + 1;
        profile.deliveryStats.totalEarnedSOL =
          (profile.deliveryStats.totalEarnedSOL || 0) + (prize.amountSOL || 0);
        if (!profile.verifiedSkills.some((cid) => String(cid) === String(cred._id))) {
          profile.verifiedSkills.push(cred._id);
        }
        await profile.save();
        const allAccepted = await Credential.find({ studentId: app.studentId, status: 'accepted' });
        const score = await recalculateCredScore(profile, allAccepted);
        newCredScore = score?.value ?? null;
      } catch (scoreErr) {
        console.error('[bounty:selectWinners] credScore recalc failed:', scoreErr.message);
      }

      winnersOut.push({
        studentId: app.studentId,
        rank,
        credentialId: cred._id,
        weight,
        awardedTier: cred.trustTier,
        cappedBySponsor,
        prize: prize.reward || `${prize.amountSOL || 0} SOL`,
        newCredScore,
      });
    }

    if (winnersOut.length === 0) {
      return res.status(400).json({ success: false, message: 'None of the selected submissions could be awarded.' });
    }

    // Mark the non-winning submissions.
    const winnerIds = picks.map((p) => p.appId);
    await BountyApplication.updateMany(
      { bountyId: bounty._id, _id: { $nin: winnerIds }, status: 'submitted' },
      { $set: { status: 'not_selected' } }
    );

    // Release escrow + close out; record on the winners list.
    bounty.winners = winnersOut.map((w) => ({
      studentId: w.studentId, rank: w.rank, credentialId: w.credentialId,
      weight: w.weight, awardedTier: w.awardedTier,
    }));
    bounty.escrow.state = 'released';
    bounty.escrow.releasedAt = new Date();
    bounty.status = 'completed';
    await bounty.save();

    // Sponsor reputation: a fair, completed judgement.
    try {
      const employer = await ensureEmployerProfile(bounty.employerId);
      employer.sponsorStats = employer.sponsorStats || {};
      employer.sponsorStats.winnersSelected = (employer.sponsorStats.winnersSelected || 0) + winnersOut.length;
      await employer.save();
    } catch { /* non-fatal */ }

    return res.status(200).json({
      success: true,
      message: `${winnersOut.length} winner(s) selected. Prizes released and credentials minted.`,
      winners: winnersOut,
      bounty: publicBounty(bounty),
    });
  } catch (err) {
    console.error('[bounty:selectWinners]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to select winners.' });
  }
}

// ── POST /api/v1/bounties/auto-release (admin/cron/demo) ─────
// Sponsor accountability: any global bounty whose review window has lapsed
// with submissions but no winners gets its escrow refunded and the sponsor's
// reputation dinged — so funds can't be frozen forever or work harvested free.
async function autoReleaseStale(_req, res) {
  try {
    const now = new Date();
    const stale = await Bounty.find({
      bountyType: 'global',
      status: 'open',
      submissionCount: { $gt: 0 },
      reviewDueAt: { $lte: now },
    });

    const released = [];
    for (const bounty of stale) {
      bounty.escrow.state = 'refunded';
      bounty.escrow.releasedAt = now;
      bounty.status = 'cancelled';
      await bounty.save();
      try {
        const employer = await ensureEmployerProfile(bounty.employerId);
        employer.sponsorStats = employer.sponsorStats || {};
        employer.sponsorStats.autoReleased = (employer.sponsorStats.autoReleased || 0) + 1;
        await employer.save();
      } catch { /* non-fatal */ }
      released.push(String(bounty._id));
    }

    return res.status(200).json({ success: true, released: released.length, bountyIds: released });
  } catch (err) {
    console.error('[bounty:autoRelease]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to auto-release stale bounties.' });
  }
}

// ── GET /api/v1/bounties/leaderboard (any authed role) ───────
// Top earners by real delivered work — NOT by credential count. Rewards
// proof-of-work, the thing that can't be bought.
async function leaderboard(_req, res) {
  try {
    const top = await StudentProfile.find({ discoverable: true, 'deliveryStats.completed': { $gt: 0 } })
      .sort({ 'deliveryStats.totalEarnedSOL': -1, 'credScore.value': -1 })
      .limit(20)
      .populate('userId', 'name credchainId')
      .lean();

    const rows = top.map((p, i) => ({
      rank: i + 1,
      name: p.userId?.name || 'Student',
      credchainId: p.userId?.credchainId,
      credScore: p.credScore?.value || 300,
      highestTier: p.highestTier || 'learner',
      deliveries: p.deliveryStats?.completed || 0,
      earnedSOL: p.deliveryStats?.totalEarnedSOL || 0,
    }));

    return res.status(200).json({ success: true, count: rows.length, leaderboard: rows });
  } catch (err) {
    console.error('[bounty:leaderboard]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
}

module.exports = {
  listOpenBounties,
  createBounty,
  listMyBounties,
  listMyApplications,
  applyToBounty,
  submitDelivery,
  listBountyApplicants,
  acceptApplicant,
  confirmDelivery,
  // ── Direct "live task" assignment ──
  createDirectTask,
  respondToDirectTask,
  rateCounterparty,
  cancelBounty,
  // ── Global (open competition) bounties ──
  listGlobalBounties,
  createGlobalBounty,
  submitToGlobalBounty,
  listGlobalSubmissions,
  selectWinners,
  autoReleaseStale,
  leaderboard,
};
