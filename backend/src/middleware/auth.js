// ─────────────────────────────────────────────────────────────
// CredChain Backend — auth & authorization middleware (System 7)
// Verifies the JWT that POST /api/auth/login already issues (same
// JWT_SECRET, same claims: sub / role / credchainId) and gates the new
// /api/v1 routes by role and by issuer-verification status.
// ─────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');
const IssuerProfile = require('../models/IssuerProfile');

const JWT_SECRET = process.env.JWT_SECRET;

// Admin allowlist for Layer-4 registry cross-match (User.role has no 'admin').
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * requireAuth — verify "Authorization: Bearer <jwt>" and attach req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required (Bearer token).' });
  }
  if (!JWT_SECRET) {
    console.error('[auth] JWT_SECRET is not set — cannot verify tokens.');
    return res.status(500).json({ success: false, message: 'Server auth misconfigured.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.sub,
      role: decoded.role,
      credchainId: decoded.credchainId,
      email: (decoded.email || '').toLowerCase(),
    };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

/**
 * requireRole('issuer', 'employer', …) — 403 unless req.user.role matches.
 * Must run after requireAuth.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role ${roles.join(' or ')}.`,
      });
    }
    return next();
  };
}

/**
 * requireAdmin — gate Layer-4 actions to the ADMIN_EMAILS allowlist.
 * Must run after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!req.user.email || !ADMIN_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ success: false, message: 'Forbidden: admin only.' });
  }
  return next();
}

/**
 * enforceVerifiedIssuer — the credential-issuance / revocation guard.
 * Must run after requireAuth. Loads the caller's IssuerProfile and rejects
 * unless it has climbed the full funnel (isVerifiedIssuer === true).
 * Attaches req.issuerProfile for downstream controllers.
 */
async function enforceVerifiedIssuer(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (req.user.role !== 'issuer') {
      return res.status(403).json({ success: false, message: 'Forbidden: issuer accounts only.' });
    }

    const profile = await IssuerProfile.findOne({ userId: req.user.id });
    if (!profile || !profile.isVerifiedIssuer) {
      return res.status(403).json({
        success: false,
        message: 'Issuer not verified. Complete the 4-tier verification funnel before issuing credentials.',
        verificationStatus: profile ? profile.verificationStatus : 'not_started',
      });
    }

    // Anti-collusion freeze: a verified issuer with confirmed fraud findings
    // is suspended pending review and cannot mint or revoke. Passing the
    // funnel is not a permanent licence — selling fakes freezes the franchise.
    if (profile.reputation?.suspended) {
      return res.status(403).json({
        success: false,
        message: 'Issuer frozen pending review after a confirmed fraud finding. Contact platform administration.',
        suspended: true,
      });
    }

    req.issuerProfile = profile;
    return next();
  } catch (err) {
    console.error('[auth:enforceVerifiedIssuer]', err.message);
    return res.status(500).json({ success: false, message: 'Issuer verification check failed.' });
  }
}

module.exports = { requireAuth, requireRole, requireAdmin, enforceVerifiedIssuer, ADMIN_EMAILS };
