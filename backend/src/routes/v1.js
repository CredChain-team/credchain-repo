// ─────────────────────────────────────────────────────────────
// CredChain Backend — /api/v1 router (Advanced Systems)
// Mounts the 7 advanced systems. Legacy /api/* routes are untouched.
//
//   System 1  Two-Tier Trust portfolio       /student/*
//   System 2  Async bulk-upload engine        /issuer/credentials/bulk
//   System 3  4-tier issuer funnel            /issuer/*
//   System 4  AI gateway proxies              /ai/*
//   System 5  Live SVG badge (PUBLIC)         /badge/:credentialId
//   System 6  Token-bucket anti-spam chat     /chat/*
//   System 7  Issuance + on-chain revocation  /credential/*, /issuer/credentials
// ─────────────────────────────────────────────────────────────

const express = require('express');

const {
  requireAuth,
  requireRole,
  requireAdmin,
  enforceVerifiedIssuer,
} = require('../middleware/auth');

const { rateLimit } = require('../middleware/rateLimit');

// Limiters for endpoints that fire outbound/paid work (verification lookups,
// escrow opens) — throttle abuse without a new dependency.
const verifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: 'verify' });
const escrowLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, keyPrefix: 'escrow' });

const issuer = require('../controllers/issuerController');
const student = require('../controllers/studentController');
const bulk = require('../controllers/bulkController');
const ai = require('../controllers/aiController');
const badge = require('../controllers/badgeController');
const chat = require('../controllers/chatController');
const credential = require('../controllers/credentialController');
const auth = require('../controllers/authController');
const employer = require('../controllers/employerController');
const bounty = require('../controllers/bountyController');
const vouch = require('../controllers/vouchController');
const institution = require('../controllers/institutionController');

const mongoose = require('mongoose');

const router = express.Router();

// ── Health (PUBLIC) ──────────────────────────────────────────
// Lightweight readiness probe for the SPA + monitors: reports DB
// connection state and which optional integrations are configured.
router.get('/health', (req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    success: true,
    service: 'credchain-api-v1',
    status: 'ok',
    time: new Date().toISOString(),
    db: dbStates[mongoose.connection?.readyState] || 'unknown',
    integrations: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      solana: Boolean(process.env.SOLANA_RPC_URL),
      aiCvEngine: Boolean(process.env.AI_CV_ENGINE_URL),
      aiInsightsEngine: Boolean(process.env.AI_INSIGHTS_ENGINE_URL),
    },
  });
});

// ── Auth: unified "Sign in with Google" (PUBLIC) ─────────────
// Single OAuth flow for all three roles. The role chosen at the login
// toggle rides along in a signed `state` and is echoed back to the SPA.
router.get('/auth/google', auth.googleStart);
router.get('/auth/google/callback', auth.googleCallback);

// One-click demo sign-in (DEMO_MODE only).
router.post('/auth/demo', auth.demoLogin);

// ── System 5: PUBLIC live-status badge ───────────────────────
router.get('/badge/:credentialId', badge.getBadge);

// ── System 3: Issuer verification funnel ─────────────────────
router.post('/issuer/register-step-one', requireAuth, requireRole('issuer'), verifyLimiter, issuer.registerIssuerStepOne);
router.post('/issuer/verify-domain', requireAuth, requireRole('issuer'), verifyLimiter, issuer.verifyDomainOwnership);
router.post('/issuer/kyc/submit', requireAuth, requireRole('issuer'), verifyLimiter, issuer.submitKyc);
router.post('/issuer/kyc/webhook', issuer.kycWebhook); // machine webhook (shared secret)
router.post('/issuer/registry-cross-match', requireAuth, requireAdmin, issuer.registryCrossMatch);
router.get('/admin/issuers', requireAuth, requireAdmin, issuer.listIssuersForAdmin);

// ── System 7: Issuance + revocation (verified issuers only) ──
router.post('/issuer/credentials', requireAuth, enforceVerifiedIssuer, credential.issueCredential);
router.post('/credential/:id/revoke', requireAuth, enforceVerifiedIssuer, credential.revokeCredential);

// ── Dispute & Appeal flow (student files; admin resolves) ────
router.post('/credential/:id/dispute', requireAuth, requireRole('student'), credential.disputeCredential);
router.get('/admin/disputes', requireAuth, requireAdmin, credential.listDisputes);
router.post('/admin/disputes/:id/resolve', requireAuth, requireAdmin, credential.resolveDispute);

// ── Fraud reporting (Anti-COLLUSION): ANY authed user reports a credential
// as fraudulent → independent admin queue (never back to the issuer). Upheld
// findings cascade: revoke + student penalty + issuer strike/suspend.
router.post('/credential/:id/report-fraud', requireAuth, credential.reportCredentialFraud);
router.get('/admin/fraud-reports', requireAuth, requireAdmin, credential.listFraudReports);
router.post('/admin/fraud-reports/:id/resolve', requireAuth, requireAdmin, credential.resolveFraudReport);

// ── Employer talent feed (real students) ─────────────────────
router.get('/employer/talent-feed', requireAuth, requireRole('employer'), employer.talentFeed);

// ── System 2: Async bulk upload (verified issuers only) ──────
router.post('/issuer/credentials/bulk', requireAuth, enforceVerifiedIssuer, bulk.bulkUploadCredentials);
router.get('/issuer/bulk/:jobId', requireAuth, bulk.getBulkJobStatus);

// ── System 1: Two-Tier Trust student portfolio ──────────────
router.get('/student/:userId/portfolio', requireAuth, student.getStudentPortfolio);
router.post('/student/sandbox-skill', requireAuth, requireRole('student'), student.addSandboxSkill);

// ── Vouch economy (self-upload trust bridge) ─────────────────
// A high-reputation user (≥60) stakes 10 points to attest a student's sandbox
// skill; the owning student can dispute an attestation → SAME admin queue.
router.post('/student/:studentId/sandbox/:skillIndex/vouch', requireAuth, vouch.vouchSandboxSkill);
router.post('/attested/:studentId/:attestedIndex/dispute', requireAuth, requireRole('student'), vouch.disputeAttestation);

// ── Public issuer directory ("Find your institution") ────────
// Verified issuers only, public-safe projection (no risk flags / KYC / email).
router.get('/issuers/directory', requireAuth, issuer.listIssuerDirectory);

// ── "Request your institution" — demand signal when a school isn't listed ──
router.post('/issuers/directory/request', requireAuth, institution.requestInstitution);
router.get('/admin/institution-requests', requireAuth, requireAdmin, institution.listInstitutionRequests);
router.post('/admin/institution-requests/:id/resolve', requireAuth, requireAdmin, institution.resolveInstitutionRequest);

// ── Economy layer: Talent Search & Discovery ─────────────────
router.get('/talent/search', requireAuth, student.searchTalent);

// ── Economy layer: Bounties (two-sided lifecycle) ────────────
// NOTE: static paths (/mine, /applications/mine, /global, /leaderboard,
// /direct, /auto-release) MUST precede the /:id param routes below, or
// Express matches the literal segment as an :id.
router.get('/bounties', requireAuth, bounty.listOpenBounties);
router.post('/bounties', requireAuth, requireRole('employer'), escrowLimiter, bounty.createBounty);
router.get('/bounties/mine', requireAuth, requireRole('employer'), bounty.listMyBounties);
router.get('/bounties/applications/mine', requireAuth, requireRole('student'), bounty.listMyApplications);

// ── Direct "live task" assignment (employer → specific student) ──
router.post('/bounties/direct', requireAuth, requireRole('employer'), escrowLimiter, bounty.createDirectTask);

// ── Global (open competition) bounties + leaderboard ──
router.get('/bounties/global', requireAuth, bounty.listGlobalBounties);
router.post('/bounties/global', requireAuth, requireRole('employer'), escrowLimiter, bounty.createGlobalBounty);
router.get('/bounties/leaderboard', requireAuth, bounty.leaderboard);
router.post('/bounties/auto-release', requireAuth, requireAdmin, bounty.autoReleaseStale);

// ── Param routes (:id) — must come after all static paths above ──
router.post('/bounties/:id/apply', requireAuth, requireRole('student'), bounty.applyToBounty);
router.post('/bounties/:id/respond', requireAuth, requireRole('student'), bounty.respondToDirectTask);
router.post('/bounties/:id/submit', requireAuth, requireRole('student'), bounty.submitToGlobalBounty);
router.post('/bounties/:id/cancel', requireAuth, requireRole('employer'), bounty.cancelBounty);
router.get('/bounties/:id/submissions', requireAuth, bounty.listGlobalSubmissions);
router.post('/bounties/:id/select-winners', requireAuth, requireRole('employer'), bounty.selectWinners);
router.post('/bounties/:id/applications/:appId/deliver', requireAuth, requireRole('student'), bounty.submitDelivery);
router.get('/bounties/:id/applications', requireAuth, requireRole('employer'), bounty.listBountyApplicants);
router.post('/bounties/:id/applications/:appId/accept', requireAuth, requireRole('employer'), bounty.acceptApplicant);
router.post('/bounties/:id/applications/:appId/confirm', requireAuth, requireRole('employer'), bounty.confirmDelivery);
router.post('/bounties/:id/applications/:appId/rate', requireAuth, bounty.rateCounterparty);

// ── System 4: AI gateway proxies ─────────────────────────────
router.post('/ai/generate-verified-cv', requireAuth, ai.generateVerifiedCV);
router.post('/ai/sync-telemetry', requireAuth, ai.syncCareerTelemetry);

// ── System 6: Token-bucket anti-spam chat ────────────────────
router.get('/chat/rooms', requireAuth, chat.listRooms);
router.post('/chat/initialize', requireAuth, requireRole('employer'), chat.initializeConversation);
router.post('/chat/:roomId/message', requireAuth, chat.sendMessage);

module.exports = router;
