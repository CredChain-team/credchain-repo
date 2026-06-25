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

const issuer = require('../controllers/issuerController');
const student = require('../controllers/studentController');
const bulk = require('../controllers/bulkController');
const ai = require('../controllers/aiController');
const badge = require('../controllers/badgeController');
const chat = require('../controllers/chatController');
const credential = require('../controllers/credentialController');
const auth = require('../controllers/authController');
const employer = require('../controllers/employerController');

const router = express.Router();

// ── Auth: unified "Sign in with Google" (PUBLIC) ─────────────
// Single OAuth flow for all three roles. The role chosen at the login
// toggle rides along in a signed `state` and is echoed back to the SPA.
router.get('/auth/google', auth.googleStart);
router.get('/auth/google/callback', auth.googleCallback);

// ── System 5: PUBLIC live-status badge ───────────────────────
router.get('/badge/:credentialId', badge.getBadge);

// ── System 3: Issuer verification funnel ─────────────────────
router.post('/issuer/register-step-one', requireAuth, requireRole('issuer'), issuer.registerIssuerStepOne);
router.post('/issuer/verify-domain', requireAuth, requireRole('issuer'), issuer.verifyDomainOwnership);
router.post('/issuer/kyc/submit', requireAuth, requireRole('issuer'), issuer.submitKyc);
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

// ── Employer talent feed (real students) ─────────────────────
router.get('/employer/talent-feed', requireAuth, requireRole('employer'), employer.talentFeed);

// ── System 2: Async bulk upload (verified issuers only) ──────
router.post('/issuer/credentials/bulk', requireAuth, enforceVerifiedIssuer, bulk.bulkUploadCredentials);
router.get('/issuer/bulk/:jobId', requireAuth, bulk.getBulkJobStatus);

// ── System 1: Two-Tier Trust student portfolio ──────────────
router.get('/student/:userId/portfolio', requireAuth, student.getStudentPortfolio);
router.post('/student/sandbox-skill', requireAuth, requireRole('student'), student.addSandboxSkill);

// ── Economy layer: Talent Search & Discovery ─────────────────
router.get('/talent/search', requireAuth, student.searchTalent);

// ── System 4: AI gateway proxies ─────────────────────────────
router.post('/ai/generate-verified-cv', requireAuth, ai.generateVerifiedCV);
router.post('/ai/sync-telemetry', requireAuth, ai.syncCareerTelemetry);

// ── System 6: Token-bucket anti-spam chat ────────────────────
router.get('/chat/rooms', requireAuth, chat.listRooms);
router.post('/chat/initialize', requireAuth, requireRole('employer'), chat.initializeConversation);
router.post('/chat/:roomId/message', requireAuth, chat.sendMessage);

module.exports = router;
