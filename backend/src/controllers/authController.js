// ─────────────────────────────────────────────────────────────
// CredChain Backend — Google OAuth 2.0 controller
//
// Implements the single unified "Sign in with Google" flow the frontend
// uses for all three roles (student / employer / issuer), WITHOUT pulling
// in passport or express-session. It's a direct Authorization-Code flow:
//
//   GET /api/v1/auth/google?role=student
//        → 302 to Google's consent screen (role carried in a signed `state`).
//   GET /api/v1/auth/google/callback?code=…&state=…
//        → exchange code → fetch userinfo → find/create the User →
//          sign the SAME 7-day app JWT the password login issues →
//          302 back to  CLIENT_ORIGIN/auth/callback?token=<jwt>&role=<role>.
//
// CSRF protection: `state` is itself a short-lived JWT (signed with
// JWT_SECRET) carrying the chosen role + a random nonce, so it can't be
// forged and we don't need server-side session storage to validate it.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/v1/auth/google/callback';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const VALID_ROLES = ['student', 'issuer', 'employer'];

// ── Shared helpers (mirror the password-login claims exactly) ────
function makeCredchainId() {
  return `cc_${crypto.randomBytes(4).toString('hex')}`;
}

function signAppToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: user.role, credchainId: user.credchainId, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Bounce the browser back to the SPA's /auth/callback with an error code so
// the UI can show a friendly message instead of a raw 500 page.
function redirectWithError(res, code) {
  return res.redirect(`${CLIENT_ORIGIN}/auth/callback?error=${encodeURIComponent(code)}`);
}

function isConfigured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && JWT_SECRET);
}

// ── GET /api/v1/auth/google?role=student ─────────────────────────
// Kick off the OAuth dance: validate the requested role, mint a signed
// `state`, and redirect to Google's consent screen.
function googleStart(req, res) {
  if (!isConfigured()) {
    console.error('[auth:google] GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set.');
    return redirectWithError(res, 'google_not_configured');
  }

  const requestedRole = String(req.query.role || 'student').toLowerCase();
  const role = VALID_ROLES.includes(requestedRole) ? requestedRole : 'student';

  // `state` is a signed, short-lived JWT — tamper-proof and self-validating.
  const state = jwt.sign(
    { role, nonce: crypto.randomBytes(8).toString('hex') },
    JWT_SECRET,
    { expiresIn: '10m' }
  );

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
  });

  return res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

// ── GET /api/v1/auth/google/callback?code=…&state=… ──────────────
async function googleCallback(req, res) {
  try {
    if (!isConfigured()) {
      return redirectWithError(res, 'google_not_configured');
    }

    const { code, state, error: googleError } = req.query;

    // User declined consent, or Google returned an error.
    if (googleError) {
      return redirectWithError(res, googleError);
    }
    if (!code || !state) {
      return redirectWithError(res, 'missing_code_or_state');
    }

    // 1. Validate the signed state and recover the chosen role.
    let role = 'student';
    try {
      const decoded = jwt.verify(state, JWT_SECRET);
      if (VALID_ROLES.includes(decoded.role)) role = decoded.role;
    } catch {
      return redirectWithError(res, 'invalid_state');
    }

    // 2. Exchange the authorization code for tokens.
    let accessToken;
    try {
      const tokenResp = await axios.post(
        GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }).toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
      );
      accessToken = tokenResp.data.access_token;
    } catch (err) {
      console.error('[auth:google] token exchange failed:', err.response?.data || err.message);
      return redirectWithError(res, 'token_exchange_failed');
    }

    if (!accessToken) {
      return redirectWithError(res, 'no_access_token');
    }

    // 3. Fetch the verified Google profile.
    let profile;
    try {
      const userinfo = await axios.get(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 15000,
      });
      profile = userinfo.data; // { sub, email, email_verified, name, picture, … }
    } catch (err) {
      console.error('[auth:google] userinfo failed:', err.response?.data || err.message);
      return redirectWithError(res, 'userinfo_failed');
    }

    const email = (profile.email || '').toLowerCase();
    if (!email) {
      return redirectWithError(res, 'no_email_from_google');
    }

    // 4. Find-or-create the user. Existing accounts keep their original role
    //    (so a returning student can't accidentally become an issuer); only
    //    brand-new accounts adopt the role chosen at the login toggle.
    let user = await User.findOne({ email });
    if (!user) {
      // The schema requires a passwordHash. OAuth accounts get a random,
      // unusable one — they can never password-login, only via Google.
      const randomSecret = crypto.randomBytes(24).toString('hex');
      const passwordHash = await bcrypt.hash(randomSecret, 10);

      user = await User.create({
        name: profile.name || email.split('@')[0],
        email,
        passwordHash,
        role,
        credchainId: makeCredchainId(),
      });
      console.log(`[auth:google] new ${user.role} account: ${email}`);
    }

    // 5. Sign the app JWT and bounce back to the SPA callback route.
    const token = signAppToken(user);
    const redirect = `${CLIENT_ORIGIN}/auth/callback?token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role)}`;
    return res.redirect(redirect);
  } catch (err) {
    console.error('[auth:google:callback]', err.message);
    return redirectWithError(res, 'oauth_failed');
  }
}

module.exports = { googleStart, googleCallback };
