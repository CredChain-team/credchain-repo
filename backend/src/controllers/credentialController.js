// ─────────────────────────────────────────────────────────────
// CredChain Backend — Issuance + On-Chain Revocation (System 7)
// All routes here sit behind enforceVerifiedIssuer, so only fully-vetted
// issuers can mint or revoke.
//
//   issueCredential   — verified issuer mints a single pending credential.
//   revokeCredential  — appends ":REVOKED" to the original hash, mints a
//                       fresh Solana Memo as a tamper-proof revocation
//                       record, and flips the DB status to 'revoked'.
// ─────────────────────────────────────────────────────────────

const Credential = require('../models/Credential');
const User = require('../models/User');
const { computeCredentialHash } = require('../utils/hash');
const { sendCredentialMemo, getMemoExplorerUrl } = require('../config/solana');
const { loadFeePayer } = require('../utils/wallet');

// POST /api/v1/issuer/credentials   (requireAuth + enforceVerifiedIssuer)
async function issueCredential(req, res) {
  try {
    const { title, recipientEmail, studentId } = req.body || {};
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required.' });
    }

    const doc = new Credential({
      title,
      issuerId: req.user.id,
      issuer: req.issuerProfile?.lockedDomain || undefined,
      recipientEmail: (recipientEmail || '').toLowerCase() || undefined,
      studentId: studentId || undefined,
      status: 'pending',
    });
    doc.sha256Hash = computeCredentialHash(doc);
    doc.hash = doc.sha256Hash;
    await doc.save();

    return res.status(201).json({
      success: true,
      message: 'Credential issued (pending student acceptance).',
      credential: {
        id: doc._id,
        title: doc.title,
        recipientEmail: doc.recipientEmail,
        status: doc.status,
        sha256Hash: doc.sha256Hash,
        badgeUrl: `/api/v1/badge/${doc._id}`,
      },
    });
  } catch (err) {
    console.error('[credential:issue]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to issue credential.' });
  }
}

// POST /api/v1/credential/:id/revoke   (requireAuth + enforceVerifiedIssuer)
async function revokeCredential(req, res) {
  try {
    const cred = await Credential.findById(req.params.id);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }

    // Ownership: an issuer may only revoke what they minted.
    if (cred.issuerId && String(cred.issuerId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only revoke credentials you issued.' });
    }
    if (cred.status === 'revoked') {
      return res.status(409).json({ success: false, message: 'Credential is already revoked.' });
    }

    // The revocation fingerprint = original hash + ":REVOKED".
    const baseHash = cred.sha256Hash || cred.hash || computeCredentialHash(cred);
    const revokedHash = `${baseHash}:REVOKED`;

    // Anchor the revocation on-chain if a fee-payer wallet is configured;
    // otherwise revoke off-chain (mirrors the existing accept-route policy).
    let revokedTxSignature;
    const feePayer = loadFeePayer();
    if (feePayer) {
      try {
        revokedTxSignature = await sendCredentialMemo(revokedHash, feePayer);
      } catch (chainErr) {
        console.error('[credential:revoke] Solana write failed:', chainErr.message);
        return res.status(502).json({
          success: false,
          message: 'Could not record the revocation on Solana. Please retry.',
          error: chainErr.message,
        });
      }
    }

    cred.status = 'revoked';
    cred.revokedHash = revokedHash;
    if (revokedTxSignature) cred.revokedTxSignature = revokedTxSignature;
    cred.revokedAt = new Date();
    await cred.save();

    return res.status(200).json({
      success: true,
      message: revokedTxSignature
        ? 'Credential revoked and recorded on Solana.'
        : 'Credential revoked (on-chain write skipped — no wallet configured).',
      credential: {
        id: cred._id,
        status: cred.status,
        revokedAt: cred.revokedAt,
        revokedTxSignature: cred.revokedTxSignature || null,
        explorerUrl: revokedTxSignature ? getMemoExplorerUrl(revokedTxSignature) : null,
        badgeUrl: `/api/v1/badge/${cred._id}`,
      },
    });
  } catch (err) {
    console.error('[credential:revoke]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to revoke credential.' });
  }
}

// ── Dispute & Appeal flow (Section 5.1 / 7) ──────────────────

// POST /api/v1/credential/:id/dispute   (requireAuth + requireRole('student'))
// The affected student flags a revocation as wrong. Status STAYS 'revoked'
// but the visible downgrade freezes (badge → amber) and it enters the
// independent platform-admin queue — NOT back to the issuer who revoked it.
async function disputeCredential(req, res) {
  try {
    const cred = await Credential.findById(req.params.id);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }
    // Only the owning student may dispute their own credential.
    if (!cred.studentId || String(cred.studentId) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You can only dispute your own credential.' });
    }
    if (cred.status !== 'revoked') {
      return res.status(409).json({ success: false, message: 'Only a revoked credential can be disputed.' });
    }
    if (cred.dispute && cred.dispute.status === 'under_review') {
      return res.status(409).json({ success: false, message: 'This credential is already under review.' });
    }

    cred.dispute = {
      status: 'under_review',
      reason: (req.body?.reason || 'Revocation believed to be in error.').slice(0, 1000),
      filedAt: new Date(),
    };
    await cred.save();

    return res.status(200).json({
      success: true,
      message: 'Dispute filed. The badge now shows "Under Review" pending independent platform-admin resolution.',
      dispute: cred.dispute,
    });
  } catch (err) {
    console.error('[credential:dispute]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to file dispute.' });
  }
}

// GET /api/v1/admin/disputes   (requireAuth + requireAdmin)
// The independent review queue — every revocation currently under dispute.
async function listDisputes(_req, res) {
  try {
    const docs = await Credential.find({ 'dispute.status': 'under_review' }).sort({ 'dispute.filedAt': -1 });

    const studentIds = [...new Set(docs.map((d) => String(d.studentId)).filter(Boolean))];
    const issuerIds = [...new Set(docs.map((d) => String(d.issuerId)).filter(Boolean))];
    const users = await User.find({ _id: { $in: [...studentIds, ...issuerIds] } }).select('name email role');
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const disputes = docs.map((d) => ({
      id: d._id,
      title: d.title,
      issuer: d.issuer || (byId.get(String(d.issuerId))?.name) || 'Verified Issuer',
      student: byId.get(String(d.studentId))?.name || 'Student',
      studentId: d.studentId,
      reason: d.dispute?.reason,
      filedAt: d.dispute?.filedAt,
      revokedAt: d.revokedAt,
    }));

    return res.status(200).json({ success: true, count: disputes.length, disputes });
  } catch (err) {
    console.error('[admin:listDisputes]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load dispute queue.' });
  }
}

// POST /api/v1/admin/disputes/:id/resolve   (requireAuth + requireAdmin)
// Body: { decision: 'reinstate' | 'uphold', notes? }
//   reinstate → revocation was wrong: status back to 'accepted' (green badge).
//   uphold    → revocation stands: status stays 'revoked' (red badge).
async function resolveDispute(req, res) {
  try {
    const { decision, notes } = req.body || {};
    if (!['reinstate', 'uphold'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'reinstate' or 'uphold'." });
    }

    const cred = await Credential.findById(req.params.id);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }
    if (!cred.dispute || cred.dispute.status !== 'under_review') {
      return res.status(409).json({ success: false, message: 'No active dispute on this credential.' });
    }

    if (decision === 'reinstate') {
      cred.status = 'accepted';
      cred.dispute.status = 'resolved_reinstated';
    } else {
      cred.dispute.status = 'resolved_upheld';
    }
    cred.dispute.resolvedAt = new Date();
    cred.dispute.resolvedBy = req.user.email || req.user.id;
    cred.dispute.resolutionNotes = (notes || '').slice(0, 1000);
    await cred.save();

    return res.status(200).json({
      success: true,
      message: decision === 'reinstate'
        ? 'Dispute upheld — credential reinstated (badge returns to Verified).'
        : 'Revocation upheld — credential remains revoked.',
      credential: { id: cred._id, status: cred.status, dispute: cred.dispute },
    });
  } catch (err) {
    console.error('[admin:resolveDispute]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to resolve dispute.' });
  }
}

module.exports = { issueCredential, revokeCredential, disputeCredential, listDisputes, resolveDispute };
