// ─────────────────────────────────────────────────────────────
// CredChain Backend — Live-Status Dynamic SVG Badge (System 5)
// Public, embeddable trust pill. On EVERY request it re-derives the
// credential's SHA-256 from the stored fields and compares it to the
// recorded fingerprint:
//   accepted + hash matches + on-chain signature → GREEN ✓ VERIFIED ACCURATE
//   revoked / tampered / missing proof           → RED  🅇 UNVERIFIED / EXPIRED
// ─────────────────────────────────────────────────────────────

const mongoose = require('mongoose');

const Credential = require('../models/Credential');
const { computeCredentialHash, buildCredentialHash } = require('../utils/hash');
const { verifiedBadge, unverifiedBadge, reviewBadge } = require('../utils/svgBadge');

// GET /api/v1/badge/:credentialId   (PUBLIC)
async function getBadge(req, res) {
  // Always answer as an SVG image, even on error, so it renders anywhere.
  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0'); // live status — never cache

  try {
    const { credentialId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(credentialId)) {
      return res.status(200).send(unverifiedBadge('CredChain'));
    }

    const cred = await Credential.findById(credentialId);
    if (!cred) {
      return res.status(200).send(unverifiedBadge('CredChain'));
    }

    // A disputed revocation freezes the visible downgrade to amber "Under
    // Review" until a platform admin resolves it (Section 5.1 / 7).
    if (cred.dispute && cred.dispute.status === 'under_review') {
      return res.status(200).send(reviewBadge('CredChain'));
    }

    // Revoked credentials are always red.
    if (cred.status === 'revoked') {
      return res.status(200).send(unverifiedBadge('CredChain'));
    }

    // Re-compute the fingerprint and compare to what's stored. We accept a
    // match against EITHER hashing scheme (new issuer-minted vs legacy
    // accept-flow) so credentials from both paths verify correctly.
    const stored = cred.sha256Hash || cred.hash;
    const recomputedNew = computeCredentialHash(cred);
    const recomputedLegacy = buildCredentialHash(cred);
    const intact = !!stored && (stored === recomputedNew || stored === recomputedLegacy);

    const onChain = !!(cred.solanaTxSignature || cred.txSignature);

    if (cred.status === 'accepted' && intact && onChain) {
      return res.status(200).send(verifiedBadge('CredChain'));
    }

    return res.status(200).send(unverifiedBadge('CredChain'));
  } catch (err) {
    console.error('[badge:get]', err.message);
    // Even on a server error, return a (red) badge rather than broken markup.
    return res.status(200).send(unverifiedBadge('CredChain'));
  }
}

module.exports = { getBadge };
