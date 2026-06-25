// ─────────────────────────────────────────────────────────────
// CredChain Backend — API router
// All 14 endpoints mounted under "/api".
// Auth / Users / Issuing / Validation / Chat return mock 200 JSON.
// AI endpoints proxy to the local FastAPI microservices via axios.
// ─────────────────────────────────────────────────────────────

const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Credential = require('../models/Credential');
const Message = require('../models/Message');
const StudentProfile = require('../models/StudentProfile');

const { sendCredentialMemo, getMemoExplorerUrl } = require('../config/solana');
const { buildCredentialHash } = require('../utils/hash');
const { loadFeePayer } = require('../utils/wallet');
const { recalculateCredScore, assignTier } = require('../utils/credScore');

const router = express.Router();

// JWT settings (secret + lifetime come from the environment / index.js dotenv).
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate a short, unique-ish public CredChain id, e.g. "cc_9f3a2b7c".
function makeCredchainId() {
  return `cc_${crypto.randomBytes(4).toString('hex')}`;
}

// Shape a User document for the API response — never leaks passwordHash.
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    credchainId: user.credchainId,
    createdAt: user.createdAt,
  };
}

// Sign a 7-day JWT carrying the user's id, role and credchainId.
function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, credchainId: user.credchainId, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Downstream AI microservice base URLs.
const AI_CV_ENGINE_URL = process.env.AI_CV_ENGINE_URL || 'http://localhost:8001';
const AI_INSIGHTS_ENGINE_URL = process.env.AI_INSIGHTS_ENGINE_URL || 'http://localhost:8002';

// ── AUTH ─────────────────────────────────────────────────────

// POST /api/auth/register — register a new user (student / issuer / employer).
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'name, email and password are required.',
      });
    }

    // Reject duplicate emails up front for a friendly 400 (the schema also
    // enforces uniqueness at the DB level as a backstop).
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with that email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'student',
      credchainId: makeCredchainId(),
    });

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      user: publicUser(user),
      token,
    });
  } catch (err) {
    console.error('[auth:register]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
    });
  }
});

// POST /api/auth/login — login and receive a JWT.
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email and password are required.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Same generic 401 whether the email is unknown or the password is wrong,
    // so we don't leak which accounts exist.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: publicUser(user),
      token,
      expiresIn: JWT_EXPIRES_IN,
    });
  } catch (err) {
    console.error('[auth:login]', err.message);
    return res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.',
    });
  }
});

// ── USERS / STUDENTS ─────────────────────────────────────────

// Shape a Credential document for API responses (adds the explorer link).
function publicCredential(cred) {
  return {
    id: cred._id,
    title: cred.title,
    issuer: cred.issuer,
    studentId: cred.studentId,
    status: cred.status,
    hash: cred.hash,
    txSignature: cred.txSignature,
    explorerUrl: cred.txSignature ? getMemoExplorerUrl(cred.txSignature) : undefined,
    createdAt: cred.createdAt,
    revokedAt: cred.revokedAt,
    dispute: cred.dispute && cred.dispute.status && cred.dispute.status !== 'none' ? cred.dispute : null,
  };
}

// GET /api/student/:id — get a student's profile and credentials.
router.get('/student/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const credentials = await Credential.find({ studentId: user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Student profile fetched.',
      student: {
        id: user._id,
        name: user.name,
        credchainId: user.credchainId,
        bio: user.bio || '',
        skills: user.skills || [],
        links: user.links || [],
        credentials: credentials.map(publicCredential),
      },
    });
  } catch (err) {
    console.error('[student:get]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch student profile.' });
  }
});

// PUT /api/student/profile — update bio, skills, links.
// The frontend sends the user id alongside the fields to update.
router.put('/student/profile', async (req, res) => {
  try {
    const { id, bio, skills, links } = req.body || {};
    if (!id) {
      return res.status(400).json({ success: false, message: 'A user id is required.' });
    }

    const update = {};
    if (bio !== undefined) update.bio = bio;
    if (skills !== undefined) update.skills = skills;
    if (links !== undefined) update.links = links;

    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      updated: {
        id: user._id,
        bio: user.bio || '',
        skills: user.skills || [],
        links: user.links || [],
      },
    });
  } catch (err) {
    console.error('[student:update]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// GET /api/student/profile/:credchainId — public profile page (QR link target).
router.get('/student/profile/:credchainId', async (req, res) => {
  try {
    const user = await User.findOne({ credchainId: req.params.credchainId });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Profile not found.' });
    }

    // Public profiles only surface credentials that are verified on-chain.
    const credentials = await Credential.find({
      studentId: user._id,
      status: 'accepted',
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Public profile fetched.',
      profile: {
        credchainId: user.credchainId,
        name: user.name,
        headline: 'Verified on CredChain',
        skills: user.skills || [],
        credentials: credentials.map(publicCredential),
      },
    });
  } catch (err) {
    console.error('[profile:get]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch public profile.' });
  }
});

// ── ISSUING ──────────────────────────────────────────────────

// POST /api/issuer/verify — submit issuer organisation for verification.
router.post('/issuer/verify', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Issuer verification request submitted (mock).',
    issuer: {
      id: 'iss_mock_0001',
      organisation: (req.body && req.body.organisation) || 'Mock Organisation',
      status: 'pending',
    },
  });
});

// POST /api/issuer/issueCredential — issue a credential to a student.
router.post('/issuer/issueCredential', async (req, res) => {
  try {
    const { title, issuer, studentId } = req.body || {};
    if (!title || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'title and studentId are required.',
      });
    }

    const credential = await Credential.create({
      title,
      issuer: issuer || 'Unknown Issuer',
      studentId,
      status: 'pending',
    });

    return res.status(201).json({
      success: true,
      message: 'Credential issued successfully.',
      credential: publicCredential(credential),
    });
  } catch (err) {
    console.error('[issuer:issueCredential]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to issue credential.' });
  }
});

// ── VALIDATION (accept / reject) ─────────────────────────────

// POST /api/credential/accept/:id — student accepts → hash written to Solana.
router.post('/credential/accept/:id', async (req, res) => {
  let credential;
  try {
    credential = await Credential.findById(req.params.id);
    if (!credential) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }

    // 1. Build the tamper-proof 64-char fingerprint (this is all that goes on-chain).
    const hash = buildCredentialHash(credential);

    // 2. Write the hash to Solana Devnet via the pre-built Memo helper — but only
    //    if a funded fee-payer wallet is configured. Without one we still accept
    //    the credential off-chain so the demo never hard-blocks on Devnet funding.
    let txSignature;
    const feePayer = loadFeePayer();
    if (feePayer) {
      try {
        txSignature = await sendCredentialMemo(hash, feePayer);
      } catch (chainErr) {
        // Transient Devnet failure: don't corrupt the DB record, surface a 502.
        console.error('[credential:accept] Solana write failed:', chainErr.message);
        return res.status(502).json({
          success: false,
          message: 'Could not record the credential on Solana. Please retry.',
          error: chainErr.message,
        });
      }
    } else {
      console.warn('[credential:accept] no fee-payer wallet — accepting off-chain only.');
    }

    // 3. Persist the result.
    credential.status = 'accepted';
    credential.hash = hash;
    if (txSignature) credential.txSignature = txSignature;

    // 3a. Assign a trust tier from this credential's composite weight.
    credential.trustTier = assignTier(credential.compositeWeight || 0.2);
    await credential.save();

    // 3b. Recalculate the student's full CredScore from all accepted credentials.
    if (credential.studentId) {
      try {
        const profile = await StudentProfile.findOneAndUpdate(
          { userId: credential.studentId },
          {},
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        const allAccepted = await Credential.find({
          studentId: credential.studentId,
          status: 'accepted',
        });
        await recalculateCredScore(profile, allAccepted);
      } catch (scoreErr) {
        // Score recalculation is non-fatal — the credential is already accepted.
        console.error('[credential:accept] credScore recalc failed:', scoreErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: txSignature
        ? 'Credential accepted and recorded on Solana.'
        : 'Credential accepted (on-chain write skipped — no wallet configured).',
      credential: publicCredential(credential),
    });
  } catch (err) {
    console.error('[credential:accept]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to accept credential.' });
  }
});

// POST /api/credential/reject/:id — student rejects credential.
router.post('/credential/reject/:id', async (req, res) => {
  try {
    const credential = await Credential.findById(req.params.id);
    if (!credential) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }

    credential.status = 'rejected';
    await credential.save();

    return res.status(200).json({
      success: true,
      message: 'Credential rejected.',
      credential: publicCredential(credential),
    });
  } catch (err) {
    console.error('[credential:reject]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to reject credential.' });
  }
});

// ── CHAT ─────────────────────────────────────────────────────

// POST /api/chat/send — persist a chat message and relay it live via Socket.io.
router.post('/chat/send', async (req, res) => {
  try {
    const { from, to, text } = req.body || {};
    if (!from || !to || !text) {
      return res.status(400).json({
        success: false,
        message: 'from, to and text are required.',
      });
    }

    const saved = await Message.create({ from, to, text });

    // Relay in realtime to the recipient's per-user room.
    const io = req.app.get('io');
    if (io) {
      io.to(String(to)).emit('chat:message', saved);
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: saved,
    });
  } catch (err) {
    console.error('[chat:send]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

// GET /api/chat/history/:userId — load previous messages (sent OR received).
router.get('/chat/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [{ from: userId }, { to: userId }],
    }).sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      message: 'Chat history fetched.',
      userId,
      messages,
    });
  } catch (err) {
    console.error('[chat:history]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch chat history.' });
  }
});

// ── AI PROXY ENDPOINTS ───────────────────────────────────────

// POST /api/ai/generateCV — forward to the CV engine (FastAPI, port 8001).
router.post('/ai/generateCV', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${AI_CV_ENGINE_URL}/generate-cv`,
      req.body || {},
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    res.status(200).json({ success: true, source: 'ai-cv-engine', data });
  } catch (err) {
    const status = err.response?.status || 502;
    console.error('[proxy:generateCV]', err.message);
    res.status(status).json({
      success: false,
      message: 'Failed to reach ai-cv-engine.',
      error: err.response?.data || err.message,
    });
  }
});

// POST /api/ai/analyzeSkills — forward to the insights engine (FastAPI, port 8002).
router.post('/ai/analyzeSkills', async (req, res) => {
  try {
    const { data } = await axios.post(
      `${AI_INSIGHTS_ENGINE_URL}/analyze-skills`,
      req.body || {},
      { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    res.status(200).json({ success: true, source: 'ai-insights-engine', data });
  } catch (err) {
    const status = err.response?.status || 502;
    console.error('[proxy:analyzeSkills]', err.message);
    res.status(status).json({
      success: false,
      message: 'Failed to reach ai-insights-engine.',
      error: err.response?.data || err.message,
    });
  }
});

module.exports = router;
