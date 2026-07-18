// ─────────────────────────────────────────────────────────────
// CredChain Backend — Issuer Verification Funnel (Anti-Fraud Core)
// Implements the 4-tier state machine that stops fake bootcamps:
//   applied → domain_verified → identity_checked → vetted → active
//
//   L1 registerIssuerStepOne  — reject consumer email, WHOIS age check,
//                               mint dnsChallengeToken.
//   L2 verifyDomainOwnership  — async DNS TXT proof.
//   L3 submitKyc / kycWebhook — biometric KYC sync.
//   L4 registryCrossMatch     — admin cross-match → active + isVerifiedIssuer.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');
const dns = require('dns').promises;

const IssuerProfile = require('../models/IssuerProfile');
const User = require('../models/User');
const { extractDomain, isConsumerEmail } = require('../utils/email');
const { lookupDomainAge } = require('../services/whois');
const verificationRouter = require('../services/verificationRouter');

const MIN_DOMAIN_AGE_MONTHS = 6;

// How long a full L4 verification stays valid before re-attestation is
// required. No permanent badges — a domain can lapse or an org can close.
const VERIFICATION_TTL_DAYS = Number(process.env.ISSUER_VERIFICATION_TTL_DAYS || 365);

// ── L1: Domain WHOIS & match ─────────────────────────────────
async function registerIssuerStepOne(req, res) {
  try {
    const { institutionType, rcNumber, companyName } = req.body || {};
    // ISO-3166 country drives the VerificationRouter (NG → CAC; else → RDAP).
    const country = String(req.body?.country || 'NG').toUpperCase().trim();
    // The corporate email is the caller's own account email (from the JWT),
    // but allow an explicit override in the body for orgs whose login differs.
    const email = (req.body?.email || req.user?.email || '').toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: 'An organisation email is required.' });
    }

    // Reject consumer mailboxes outright — proving control of gmail.com is meaningless.
    if (isConsumerEmail(email)) {
      // Record the attempt as a risk signal on any existing profile.
      await IssuerProfile.updateOne(
        { userId: req.user.id },
        { $addToSet: { riskFlags: 'consumer_email_attempt' } }
      ).catch(() => {});
      return res.status(400).json({
        success: false,
        message: 'Consumer email domains (Gmail, Yahoo, Outlook…) are not accepted. Use your institution domain.',
      });
    }

    const domain = extractDomain(email);
    if (!domain) {
      return res.status(400).json({ success: false, message: 'Could not parse a domain from that email.' });
    }

    // Guard the unique domain lock — another issuer may already own it.
    const domainOwner = await IssuerProfile.findOne({ lockedDomain: domain });
    if (domainOwner && String(domainOwner.userId) !== String(req.user.id)) {
      return res.status(409).json({
        success: false,
        message: `The domain ${domain} is already claimed by another issuer account.`,
      });
    }

    // Async WHOIS age check (degrades gracefully → manual-review flag).
    // NOTE: domain age is now only a SUPPLEMENTARY risk signal, not the entity
    // gate — an aged domain is buyable, and WHOIS:43 is blocked on many hosts.
    const riskFlags = [];
    const whois = await lookupDomainAge(domain);
    if (!whois.ok) {
      riskFlags.push('whois_unavailable');
    } else if (whois.ageMonths < MIN_DOMAIN_AGE_MONTHS) {
      riskFlags.push('domain_age_lt_6mo');
    }

    // ── L1 entity legitimacy via VerificationRouter (CAC for NG) ──
    // The real entity check: a government registry lookup, not a domain guess.
    // Fails closed → sets needs_manual_registry_review when no provider wired.
    let registryEntity = { provider: 'cac_pending', verified: false, rcNumber: rcNumber || null, checkedAt: new Date() };
    try {
      const entity = await verificationRouter.verifyEntity({ country, rcNumber, companyName, domain });
      registryEntity = {
        rcNumber: rcNumber || null,
        provider: entity.method,
        verified: Boolean(entity.verified),
        checkedAt: new Date(),
      };
      for (const f of entity.flags || []) riskFlags.push(f);
    } catch (entityErr) {
      // A wired-but-erroring provider must not hard-fail registration — flag it.
      console.error('[issuer:stepOne] entity check failed:', entityErr.message);
      riskFlags.push('entity_check_error');
    }

    // Mint the DNS challenge token the issuer must publish (L2).
    const dnsChallengeToken = `credchain-verify=${crypto.randomBytes(16).toString('hex')}`;

    const profile = await IssuerProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          institutionType: institutionType || 'other',
          country,
          lockedDomain: domain,
          registryEntity,
          verificationStatus: 'applied',
          dnsChallengeToken,
          domainCreatedAt: whois.ok ? whois.createdAt : undefined,
          domainAgeMonths: whois.ok ? whois.ageMonths : undefined,
          isVerifiedIssuer: false,
        },
        $addToSet: { riskFlags: { $each: riskFlags } },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      message: 'Issuer application received. Publish the DNS TXT record below, then call verify-domain.',
      issuer: {
        verificationStatus: profile.verificationStatus,
        lockedDomain: profile.lockedDomain,
        domainAgeMonths: profile.domainAgeMonths ?? null,
        riskFlags: profile.riskFlags,
        isVerifiedIssuer: profile.isVerifiedIssuer,
      },
      dnsInstructions: {
        recordType: 'TXT',
        host: profile.lockedDomain,
        value: dnsChallengeToken,
        note: 'Add this TXT record at your DNS provider, then POST /api/v1/issuer/verify-domain.',
      },
    });
  } catch (err) {
    console.error('[issuer:stepOne]', err.message);
    return res.status(500).json({ success: false, message: 'Issuer registration failed.' });
  }
}

// ── L2: Cryptographic DNS proof ──────────────────────────────
async function verifyDomainOwnership(req, res) {
  try {
    const profile = await IssuerProfile.findOne({ userId: req.user.id });
    if (!profile || !profile.lockedDomain || !profile.dnsChallengeToken) {
      return res.status(400).json({
        success: false,
        message: 'No pending domain challenge. Complete register-step-one first.',
      });
    }

    let txtRecords;
    try {
      txtRecords = await dns.resolveTxt(profile.lockedDomain);
    } catch (dnsErr) {
      return res.status(400).json({
        success: false,
        message: `Could not read TXT records for ${profile.lockedDomain} (${dnsErr.code || dnsErr.message}). Has the record propagated?`,
      });
    }

    // resolveTxt returns string[][] (each record may be chunked) — flatten + join.
    const flat = txtRecords.map((chunks) => chunks.join(''));
    const matched = flat.includes(profile.dnsChallengeToken);

    if (!matched) {
      return res.status(400).json({
        success: false,
        message: 'DNS TXT challenge not found yet. Verify the record value and allow time to propagate.',
        expected: profile.dnsChallengeToken,
        found: flat,
      });
    }

    profile.verificationStatus = 'domain_verified';
    profile.domainVerifiedAt = new Date();
    await profile.save();

    return res.status(200).json({
      success: true,
      message: 'Domain ownership verified (Tier 2 complete). Next: biometric KYC.',
      verificationStatus: profile.verificationStatus,
    });
  } catch (err) {
    console.error('[issuer:verifyDomain]', err.message);
    return res.status(500).json({ success: false, message: 'Domain verification failed.' });
  }
}

// ── L3: Biometric KYC (SYNCHRONOUS) ──────────────────────────
// The issuer's signing officer submits NIN + a selfie + explicit consent. The
// VerificationRouter calls the KYC provider (Smile ID for NG) SYNCHRONOUSLY
// and the result returns in THIS response. This removes the old async webhook
// + static-shared-secret design (kycWebhook, kept below only as a legacy
// fallback) — there is no callback to forge or replay. We store pass/fail +
// a provider reference ONLY; never the raw biometric (NDPA 2023 / GDPR).
async function submitKyc(req, res) {
  try {
    const profile = await IssuerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Register as an issuer first.' });
    }
    if (profile.verificationStatus === 'applied') {
      return res.status(409).json({ success: false, message: 'Verify your domain (Tier 2) before KYC.' });
    }

    const { nin, selfieImage, documentImage, consent } = req.body || {};
    // Explicit, recorded consent is a HARD precondition for processing
    // biometric/identity data (NDPA 2023 sensitive-data rule). In DEMO_MODE we
    // default it to true so the existing demo/frontend keeps working untouched;
    // in production (DEMO_MODE=false) it must be explicitly provided.
    const demoMode = process.env.DEMO_MODE !== 'false';
    const consentGiven = consent === true || (demoMode && consent === undefined);
    if (!consentGiven) {
      return res.status(400).json({
        success: false,
        message: 'Explicit consent to process identity data is required to proceed with KYC.',
      });
    }

    // Synchronous identity + liveness via the router (country-aware).
    let result;
    try {
      result = await verificationRouter.verifyIdentity({
        country: profile.country || 'NG',
        nin,
        selfieImage,
        documentImage,
        consentGiven: true,
      });
    } catch (kycErr) {
      console.error('[issuer:submitKyc] provider error:', kycErr.message);
      return res.status(502).json({ success: false, message: 'The identity provider could not be reached. Please try again.' });
    }

    // Record consent + provider reference (NOT the biometric itself).
    profile.dataConsent = {
      given: true,
      givenAt: new Date(),
      purpose: 'issuer_identity_verification',
      policyVersion: process.env.PRIVACY_POLICY_VERSION || 'v1',
    };
    profile.kyc = {
      status: result.passed ? 'passed' : (result.provisional ? 'pending' : 'failed'),
      reference: result.reference || `kyc_${crypto.randomBytes(8).toString('hex')}`,
      checkedAt: new Date(),
    };

    // Advance the funnel on a real pass. The router returns a flagged
    // `provisional` result ONLY in demo mode (no provider wired) — advancing on
    // it lets the demo complete while the risk flag records it was NOT a real
    // identity assurance. Using result.provisional (not a module-load env
    // check) means a mis-set KYC_PROVIDER fails closed via the 502 above
    // instead of silently mis-advancing.
    const advance = result.passed || result.provisional === true;
    if (advance && profile.verificationStatus === 'domain_verified') {
      profile.verificationStatus = 'identity_checked';
    }
    for (const f of result.flags || []) {
      profile.riskFlags = Array.from(new Set([...(profile.riskFlags || []), f]));
    }
    await profile.save();

    return res.status(200).json({
      success: true,
      message: result.passed
        ? 'Identity verified (Tier 3 complete). Next: registry cross-match.'
        : (result.provisional
            ? 'KYC recorded in demo mode (not a real identity assurance). Funnel advanced for testing.'
            : 'Identity verification did not pass.'),
      verificationStatus: profile.verificationStatus,
      kycProvider: result.provider,
      kycReference: profile.kyc.reference,
    });
  } catch (err) {
    console.error('[issuer:submitKyc]', err.message);
    return res.status(500).json({ success: false, message: 'KYC submission failed.' });
  }
}

// LEGACY FALLBACK: the old async webhook the KYC provider calls. Retained so a
// provider configured for async callbacks still works, but the primary path is
// now the synchronous submitKyc above. Protected by a shared secret header.
async function kycWebhook(req, res) {
  try {
    const secret = req.headers['x-kyc-secret'];
    const expected = process.env.KYC_WEBHOOK_SECRET;
    if (!expected || secret !== expected) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const { reference, result } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required.' });
    }

    const profile = await IssuerProfile.findOne({ 'kyc.reference': reference });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'No issuer matches that KYC reference.' });
    }

    const passed = result === 'pass' || result === 'passed' || result === true;
    profile.kyc.status = passed ? 'passed' : 'failed';
    profile.kyc.checkedAt = new Date();
    if (passed && profile.verificationStatus === 'domain_verified') {
      profile.verificationStatus = 'identity_checked';
    }
    if (!passed) {
      profile.riskFlags = Array.from(new Set([...(profile.riskFlags || []), 'kyc_failed']));
    }
    await profile.save();

    return res.status(200).json({ success: true, message: 'KYC result recorded.', verificationStatus: profile.verificationStatus });
  } catch (err) {
    console.error('[issuer:kycWebhook]', err.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
}

// ── L4: Registry cross-match (admin) ─────────────────────────
async function registryCrossMatch(req, res) {
  try {
    const { userId, matched, notes } = req.body || {};
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Target issuer userId is required.' });
    }

    const profile = await IssuerProfile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Issuer profile not found.' });
    }
    if (profile.verificationStatus !== 'identity_checked') {
      return res.status(409).json({
        success: false,
        message: `Issuer must reach 'identity_checked' first (currently '${profile.verificationStatus}').`,
      });
    }

    // FAIL CLOSED: L4 is the gate that flips isVerifiedIssuer → true, the
    // single boolean every mint/revoke route trusts. Approval must be EXPLICIT.
    // A missing/omitted `matched` (client bug, truncated request, bad tooling)
    // must NOT silently verify an issuer — require matched === true.
    if (typeof matched !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Explicit 'matched' boolean is required (true = verify, false = reject).",
      });
    }
    const isMatch = matched === true;
    profile.registry = {
      matched: isMatch,
      reviewedBy: req.user.email || req.user.id,
      reviewedAt: new Date(),
      notes: notes || '',
    };

    if (isMatch) {
      profile.verificationStatus = 'active';
      profile.isVerifiedIssuer = true;
      // No permanent badge — set the re-verification expiry.
      profile.verifiedUntil = new Date(Date.now() + VERIFICATION_TTL_DAYS * 24 * 60 * 60 * 1000);
    } else {
      profile.riskFlags = Array.from(new Set([...(profile.riskFlags || []), 'registry_no_match']));
    }
    await profile.save();

    return res.status(200).json({
      success: true,
      message: isMatch
        ? 'Issuer fully vetted and ACTIVE — credential issuance unlocked.'
        : 'Registry cross-match failed; issuer remains unverified.',
      verificationStatus: profile.verificationStatus,
      isVerifiedIssuer: profile.isVerifiedIssuer,
      verifiedUntil: profile.verifiedUntil || null,
    });
  } catch (err) {
    console.error('[issuer:registryCrossMatch]', err.message);
    return res.status(500).json({ success: false, message: 'Registry cross-match failed.' });
  }
}

// ── Admin: list every issuer profile (for the vetting console) ───
// GET /api/v1/admin/issuers   (requireAuth + requireAdmin)
async function listIssuersForAdmin(_req, res) {
  try {
    const profiles = await IssuerProfile.find({}).sort({ updatedAt: -1 });
    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name email');
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const issuers = profiles.map((p) => ({
      userId: p.userId,
      name: byId.get(String(p.userId))?.name || '—',
      email: byId.get(String(p.userId))?.email || '—',
      institutionType: p.institutionType,
      lockedDomain: p.lockedDomain || null,
      verificationStatus: p.verificationStatus,
      isVerifiedIssuer: p.isVerifiedIssuer,
      riskFlags: p.riskFlags || [],
      domainAgeMonths: p.domainAgeMonths ?? null,
      kycStatus: p.kyc?.status || 'none',
      createdAt: p.createdAt,
    }));

    return res.status(200).json({ success: true, count: issuers.length, issuers });
  } catch (err) {
    console.error('[admin:listIssuers]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load issuers.' });
  }
}

// ── Public issuer directory ("Find your institution") ────────────
// GET /api/v1/issuers/directory   (requireAuth — any logged-in user)
// Backs the student "institutional" pathway button ("Check if my school is set
// up"). Returns ONLY verified issuers, and ONLY public-safe fields — never risk
// flags, KYC status, or email. Reuses the listIssuersForAdmin join pattern.
async function listIssuerDirectory(_req, res) {
  try {
    const profiles = await IssuerProfile.find({ isVerifiedIssuer: true }).sort({ updatedAt: -1 });
    const userIds = profiles.map((p) => p.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name');
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const issuers = profiles.map((p) => ({
      userId: p.userId,
      name: byId.get(String(p.userId))?.name || 'Verified Issuer',
      institutionType: p.institutionType,
      lockedDomain: p.lockedDomain || null,
      verificationStatus: p.verificationStatus,
      isVerifiedIssuer: p.isVerifiedIssuer,
    }));

    return res.status(200).json({ success: true, count: issuers.length, issuers });
  } catch (err) {
    console.error('[issuer:directory]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load the institution directory.' });
  }
}

module.exports = {
  registerIssuerStepOne,
  verifyDomainOwnership,
  submitKyc,
  kycWebhook,
  registryCrossMatch,
  listIssuersForAdmin,
  listIssuerDirectory,
};
