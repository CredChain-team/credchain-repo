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

const MIN_DOMAIN_AGE_MONTHS = 6;

// ── L1: Domain WHOIS & match ─────────────────────────────────
async function registerIssuerStepOne(req, res) {
  try {
    const { institutionType } = req.body || {};
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
    const riskFlags = [];
    const whois = await lookupDomainAge(domain);
    if (!whois.ok) {
      riskFlags.push('whois_unavailable');
    } else if (whois.ageMonths < MIN_DOMAIN_AGE_MONTHS) {
      riskFlags.push('domain_age_lt_6mo');
    }

    // Mint the DNS challenge token the issuer must publish (L2).
    const dnsChallengeToken = `credchain-verify=${crypto.randomBytes(16).toString('hex')}`;

    const profile = await IssuerProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        $set: {
          institutionType: institutionType || 'other',
          lockedDomain: domain,
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

// ── L3: Biometric KYC ────────────────────────────────────────
// Issuer kicks off a KYC session (returns a reference the provider would use).
async function submitKyc(req, res) {
  try {
    const profile = await IssuerProfile.findOne({ userId: req.user.id });
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Register as an issuer first.' });
    }
    if (profile.verificationStatus === 'applied') {
      return res.status(409).json({ success: false, message: 'Verify your domain (Tier 2) before KYC.' });
    }

    const reference = `kyc_${crypto.randomBytes(8).toString('hex')}`;
    profile.kyc = { status: 'pending', reference, checkedAt: null };
    await profile.save();

    return res.status(202).json({
      success: true,
      message: 'KYC session created. The provider will call the webhook on completion.',
      kycReference: reference,
    });
  } catch (err) {
    console.error('[issuer:submitKyc]', err.message);
    return res.status(500).json({ success: false, message: 'KYC submission failed.' });
  }
}

// Webhook the KYC provider calls. Protected by a shared secret header rather
// than a user JWT (the caller is a machine, not the issuer).
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

    const isMatch = matched !== false; // default to approve unless explicitly rejected
    profile.registry = {
      matched: isMatch,
      reviewedBy: req.user.email || req.user.id,
      reviewedAt: new Date(),
      notes: notes || '',
    };

    if (isMatch) {
      profile.verificationStatus = 'active';
      profile.isVerifiedIssuer = true;
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
