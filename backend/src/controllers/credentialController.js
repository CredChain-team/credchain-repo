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
const IssuerProfile = require('../models/IssuerProfile');
const StudentProfile = require('../models/StudentProfile');
const { computeCredentialHash } = require('../utils/hash');
const { sendCredentialMemo, getMemoExplorerUrl, anchorHash, isDemoMode } = require('../config/solana');
const { loadFeePayer } = require('../utils/wallet');
const { computeIssuanceWeight } = require('../utils/issuanceWeight');
const { assignTier, recalculateCredScore } = require('../utils/credScore');

// Strike threshold: at this many confirmed fraud findings the issuer's whole
// franchise freezes (mirrors the deck's "three confirmed disputes → revoked",
// applied to the ISSUER rather than a single credential).
const ISSUER_STRIKE_LIMIT = Number(process.env.ISSUER_STRIKE_LIMIT) || 3;

// Gather the corroboration signals for a (student, issuer) pair. These are the
// things a briber can't cheaply fake: real confirmed paid deliveries, and
// attestations from OTHER independent verified issuers.
async function gatherCorroboration(studentId, issuerId) {
  if (!studentId) return { corroboratingDeliveries: 0, independentIssuerCount: 0 };

  // Confirmed paid deliveries → the student has a completed-delivery count on
  // their profile (fed only by confirmed bounties, which have a real
  // counterparty). This is the dominant, hardest-to-fake corroborator.
  let corroboratingDeliveries = 0;
  try {
    const sp = await StudentProfile.findOne({ userId: studentId }).select('deliveryStats').lean();
    corroboratingDeliveries = sp?.deliveryStats?.completed || 0;
  } catch { /* non-fatal */ }

  // Distinct OTHER verified issuers who have already minted this student an
  // accepted credential (excludes the current issuer — self-corroboration
  // doesn't count).
  let independentIssuerCount = 0;
  try {
    const others = await Credential.find({
      studentId,
      status: 'accepted',
      issuerId: { $ne: issuerId, $exists: true },
    }).select('issuerId').lean();
    independentIssuerCount = new Set(others.map((c) => String(c.issuerId))).size;
  } catch { /* non-fatal */ }

  return { corroboratingDeliveries, independentIssuerCount };
}

// POST /api/v1/issuer/credentials   (requireAuth + enforceVerifiedIssuer)
async function issueCredential(req, res) {
  try {
    const { title, recipientEmail, studentId, requestedTier, skillName, skillCategory, skillTags } = req.body || {};
    if (!title) {
      return res.status(400).json({ success: false, message: 'title is required.' });
    }

    // Resolve the recipient student id — either passed directly or looked up
    // by email — so we can gather corroboration for the weighting.
    let resolvedStudentId = studentId || undefined;
    if (!resolvedStudentId && recipientEmail) {
      try {
        const recipient = await User.findOne({ email: (recipientEmail || '').toLowerCase() }).select('_id');
        if (recipient) resolvedStudentId = recipient._id;
      } catch { /* non-fatal — stays unlinked until acceptance */ }
    }

    // ── ANTI-COLLUSION weighting ──────────────────────────────────────
    // A verified issuer's lone say-so is capped at practitioner. Stronger
    // requires real corroboration the issuer cannot fabricate.
    const issuerTrustScore = req.issuerProfile?.reputation?.trustScore ?? 100;
    const { corroboratingDeliveries, independentIssuerCount } =
      await gatherCorroboration(resolvedStudentId, req.user.id);
    const { weight, cappedUncorroborated } = computeIssuanceWeight({
      issuerTrustScore,
      corroboratingDeliveries,
      independentIssuerCount,
      requestedTier: requestedTier || 'practitioner',
    });

    const doc = new Credential({
      title,
      issuerId: req.user.id,
      issuer: req.issuerProfile?.lockedDomain || undefined,
      recipientEmail: (recipientEmail || '').toLowerCase() || undefined,
      studentId: resolvedStudentId,
      status: 'pending',
      skillName: skillName || undefined,
      skillCategory: skillCategory || 'Other',
      skillTags: Array.isArray(skillTags)
        ? skillTags
        : String(skillTags || '').split(',').map((t) => t.trim()).filter(Boolean),
      compositeWeight: weight,
      trustTier: assignTier(weight),
      issuance: {
        issuerTrustScore,
        corroboratingDeliveries,
        independentIssuerCount,
        cappedUncorroborated,
      },
    });
    doc.sha256Hash = computeCredentialHash(doc);
    doc.hash = doc.sha256Hash;

    // Anchor on Solana at issue time so the issuer gets an immediate,
    // verifiable on-chain proof. In DEMO_MODE this uses a deterministic
    // mock signature when no funded wallet is present (never hard-fails).
    let anchor = { signature: null, mock: false, explorerUrl: null };
    try {
      anchor = await anchorHash(doc.sha256Hash);
    } catch (chainErr) {
      console.error('[credential:issue] anchor failed:', chainErr.message);
    }
    if (anchor.signature) {
      doc.solanaTxSignature = anchor.signature;
      doc.txSignature = anchor.signature;
    }
    await doc.save();

    // Skin in the game: record that this issuer minted another credential.
    try {
      await IssuerProfile.updateOne(
        { userId: req.user.id },
        { $inc: { 'reputation.credentialsIssued': 1 } }
      );
    } catch (repErr) {
      console.error('[credential:issue] issuer stat bump failed:', repErr.message);
    }

    return res.status(201).json({
      success: true,
      message: anchor.signature
        ? 'Credential issued and anchored on Solana.'
        : 'Credential issued (pending student acceptance).',
      // Surfaced so the issuer UI can explain WHY it minted at practitioner
      // rather than the requested tier (no corroboration yet).
      cappedUncorroborated,
      credential: {
        id: doc._id,
        title: doc.title,
        recipientEmail: doc.recipientEmail,
        status: doc.status,
        trustTier: doc.trustTier,
        compositeWeight: doc.compositeWeight,
        cappedUncorroborated,
        corroboration: { corroboratingDeliveries, independentIssuerCount },
        sha256Hash: doc.sha256Hash,
        txSignature: doc.txSignature || null,
        solanaTxSignature: doc.solanaTxSignature || null,
        network: 'devnet',
        anchorMock: anchor.mock,
        explorerUrl: anchor.explorerUrl,
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
// The ONE independent review queue. It adjudicates two kinds of disputes
// uniformly — credential revocations AND vouch attestations — because the
// attestedSkills.dispute sub-doc mirrors Credential.dispute exactly. Each row
// carries a `type` ('credential' | 'vouch') so the frontend can label them
// differently without a separate queue or a rewrite.
async function listDisputes(_req, res) {
  try {
    // ── Credential revocation disputes ──────────────────────────────
    const docs = await Credential.find({ 'dispute.status': 'under_review' }).sort({ 'dispute.filedAt': -1 });

    // ── Vouch (attestation) disputes ────────────────────────────────
    const vouchProfiles = await StudentProfile.find({ 'attestedSkills.dispute.status': 'under_review' });

    // One user lookup covering credential students/issuers AND vouch
    // students/vouchers.
    const credStudentIds = docs.map((d) => String(d.studentId)).filter(Boolean);
    const credIssuerIds = docs.map((d) => String(d.issuerId)).filter(Boolean);
    const vouchUserIds = vouchProfiles.flatMap((p) => [
      String(p.userId),
      ...(p.attestedSkills || []).map((a) => String(a.voucherId)).filter(Boolean),
    ]);
    const allIds = [...new Set([...credStudentIds, ...credIssuerIds, ...vouchUserIds])];
    const users = await User.find({ _id: { $in: allIds } }).select('name email role');
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const credentialDisputes = docs.map((d) => ({
      type: 'credential',
      id: d._id,
      title: d.title,
      issuer: d.issuer || (byId.get(String(d.issuerId))?.name) || 'Verified Issuer',
      student: byId.get(String(d.studentId))?.name || 'Student',
      studentId: d.studentId,
      reason: d.dispute?.reason,
      filedAt: d.dispute?.filedAt,
      revokedAt: d.revokedAt,
    }));

    // Flatten each under-review attestation into the SAME row shape. The
    // "issuer" of a vouch is the voucher who staked their reputation.
    const vouchDisputes = vouchProfiles.flatMap((p) =>
      (p.attestedSkills || [])
        .filter((a) => a.dispute?.status === 'under_review')
        .map((a) => ({
          type: 'vouch',
          id: a._id,
          title: a.skillName,
          issuer: byId.get(String(a.voucherId))?.name || 'Voucher',
          student: byId.get(String(p.userId))?.name || 'Student',
          studentId: p.userId,
          stakedPoints: a.stakedPoints,
          reason: a.dispute?.reason,
          filedAt: a.dispute?.filedAt,
        }))
    );

    const disputes = [...credentialDisputes, ...vouchDisputes].sort(
      (a, b) => new Date(b.filedAt || 0) - new Date(a.filedAt || 0)
    );

    return res.status(200).json({ success: true, count: disputes.length, disputes });
  } catch (err) {
    console.error('[admin:listDisputes]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load dispute queue.' });
  }
}

// POST /api/v1/admin/disputes/:id/resolve   (requireAuth + requireAdmin)
// Body: { decision: 'reinstate' | 'uphold', notes? }
// Adjudicates BOTH kinds by :id — tries a Credential first, then falls back to
// an attestedSkills sub-doc (same :id space, since attested entries keep their
// ObjectId). Behaviour per kind:
//   Credential  reinstate → status back to 'accepted'; uphold → stays 'revoked'.
//   Vouch       reinstate → attestation counts again; the voucher's staked 10
//                           points are RETURNED (the vouch was fair).
//               uphold    → attestation is upheld-as-false; the staked 10
//                           points are FORFEITED permanently (already deducted
//                           at vouch time — we simply don't return them).
async function resolveDispute(req, res) {
  try {
    const { decision, notes } = req.body || {};
    if (!['reinstate', 'uphold'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'reinstate' or 'uphold'." });
    }

    const cred = await Credential.findById(req.params.id);

    // ── Not a credential → try a vouch attestation ──────────────────
    if (!cred) {
      return await resolveVouchDispute(req, res, decision, notes);
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

// Resolve a vouch attestation dispute by its sub-doc :id. Split out of
// resolveDispute so the credential path stays byte-for-byte unchanged.
async function resolveVouchDispute(req, res, decision, notes) {
  const profile = await StudentProfile.findOne({ 'attestedSkills._id': req.params.id });
  if (!profile) {
    return res.status(404).json({ success: false, message: 'Dispute target not found (no credential or attestation with that id).' });
  }

  const attested = profile.attestedSkills.id(req.params.id);
  if (!attested || !attested.dispute || attested.dispute.status !== 'under_review') {
    return res.status(409).json({ success: false, message: 'No active dispute on this attestation.' });
  }

  if (decision === 'reinstate') {
    attested.dispute.status = 'resolved_reinstated';
    // The vouch was fair — return the voucher's staked points (cap at 100).
    try {
      const voucher = await User.findById(attested.voucherId);
      if (voucher) {
        voucher.reputationScore = Math.min(100, (voucher.reputationScore || 0) + (attested.stakedPoints || 0));
        await voucher.save();
      }
    } catch (repErr) {
      console.error('[admin:resolveVouchDispute] point-return failed:', repErr.message);
    }
  } else {
    // Upheld as false — points stay forfeited (already deducted at vouch time).
    attested.dispute.status = 'resolved_upheld';
  }
  attested.dispute.resolvedAt = new Date();
  attested.dispute.resolvedBy = req.user.email || req.user.id;
  attested.dispute.resolutionNotes = (notes || '').slice(0, 1000);
  await profile.save();

  // Recalculate the student's CredScore — attestedBonus changed (a reinstated
  // vouch counts again; an upheld one stays frozen out).
  let newCredScore = null;
  try {
    const allAccepted = await Credential.find({ studentId: profile.userId, status: 'accepted' });
    const score = await recalculateCredScore(profile, allAccepted);
    await profile.save();
    newCredScore = score?.value ?? null;
  } catch (scoreErr) {
    console.error('[admin:resolveVouchDispute] credScore recalc failed:', scoreErr.message);
  }

  return res.status(200).json({
    success: true,
    message: decision === 'reinstate'
      ? 'Dispute reinstated — attestation counts again and the voucher’s staked points were returned.'
      : 'Attestation upheld as false — the voucher’s staked points are forfeited.',
    attestation: { id: attested._id, dispute: attested.dispute },
    newCredScore,
  });
}

// ── Fraud reporting → independent queue → cascade (Anti-COLLUSION) ────
//
// The dispute flow above lets a STUDENT contest a revocation. This is its
// mirror for the collusion attack: ANY authenticated user (an employer who
// hired on a fake, a peer who knows it's bogus) can REPORT a credential as
// fraudulent. It routes to the SAME independent admin queue — never back to
// the issuer who minted it (who may be the colluding party). If upheld, the
// consequences cascade to make selling a fake self-destructing.

// POST /api/v1/credential/:id/report-fraud   (requireAuth — any role)
async function reportCredentialFraud(req, res) {
  try {
    const cred = await Credential.findById(req.params.id);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }
    // The owning student can't "report" their own credential as fraud — that
    // pathway is the dispute flow. This is for third parties.
    if (cred.studentId && String(cred.studentId) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Use the dispute flow for your own credential.' });
    }
    if (cred.fraudReport && cred.fraudReport.status === 'under_review') {
      return res.status(409).json({ success: false, message: 'This credential is already under fraud review.' });
    }

    cred.fraudReport = {
      status: 'under_review',
      reporterId: req.user.id,
      reporterRole: req.user.role,
      reason: (req.body?.reason || 'Credential alleged to be fraudulently issued.').slice(0, 1000),
      filedAt: new Date(),
    };
    await cred.save();

    return res.status(200).json({
      success: true,
      message: 'Fraud report filed. It routes to independent platform review — not the issuer.',
      fraudReport: { status: cred.fraudReport.status, filedAt: cred.fraudReport.filedAt },
    });
  } catch (err) {
    console.error('[credential:reportFraud]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to file fraud report.' });
  }
}

// GET /api/v1/admin/fraud-reports   (requireAuth + requireAdmin)
async function listFraudReports(_req, res) {
  try {
    const docs = await Credential.find({ 'fraudReport.status': 'under_review' })
      .sort({ 'fraudReport.filedAt': -1 });

    const ids = [
      ...docs.map((d) => String(d.studentId)),
      ...docs.map((d) => String(d.issuerId)),
      ...docs.map((d) => String(d.fraudReport?.reporterId)),
    ].filter((v) => v && v !== 'undefined');
    const users = await User.find({ _id: { $in: [...new Set(ids)] } }).select('name email role');
    const byId = new Map(users.map((u) => [String(u._id), u]));

    const reports = docs.map((d) => ({
      id: d._id,
      title: d.title,
      status: d.status,
      trustTier: d.trustTier,
      issuer: d.issuer || byId.get(String(d.issuerId))?.name || 'Verified Issuer',
      issuerId: d.issuerId,
      student: byId.get(String(d.studentId))?.name || 'Student',
      studentId: d.studentId,
      reporter: byId.get(String(d.fraudReport?.reporterId))?.name || 'A platform user',
      reporterRole: d.fraudReport?.reporterRole,
      reason: d.fraudReport?.reason,
      filedAt: d.fraudReport?.filedAt,
      issuance: d.issuance || null,
    }));

    return res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    console.error('[admin:listFraudReports]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load fraud-report queue.' });
  }
}

// POST /api/v1/admin/fraud-reports/:id/resolve   (requireAuth + requireAdmin)
// Body: { decision: 'uphold' | 'dismiss', notes? }
//   uphold  → the credential IS fraudulent. Cascade:
//              a. credential → revoked (+ on-chain revocation memo),
//              b. student's disputes-against ++ → CredScore recalculated down,
//              c. issuer struck: disputesUpheld++, strikes++, trustScore↓,
//                 and at the strike limit the issuer is SUSPENDED (frozen),
//              d. the issuer's OTHER recent mints flagged for re-review.
//   dismiss → the report was unfounded; clear the flag, no penalty.
async function resolveFraudReport(req, res) {
  try {
    const { decision, notes } = req.body || {};
    if (!['uphold', 'dismiss'].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be 'uphold' or 'dismiss'." });
    }

    const cred = await Credential.findById(req.params.id);
    if (!cred) {
      return res.status(404).json({ success: false, message: 'Credential not found.' });
    }
    if (!cred.fraudReport || cred.fraudReport.status !== 'under_review') {
      return res.status(409).json({ success: false, message: 'No active fraud report on this credential.' });
    }

    if (decision === 'dismiss') {
      cred.fraudReport.status = 'resolved_dismissed';
      cred.fraudReport.resolvedAt = new Date();
      cred.fraudReport.resolvedBy = req.user.email || req.user.id;
      cred.fraudReport.notes = (notes || '').slice(0, 1000);
      await cred.save();
      return res.status(200).json({
        success: true,
        message: 'Fraud report dismissed — credential stands.',
        credential: { id: cred._id, status: cred.status },
      });
    }

    // ── UPHELD: the cascade ──────────────────────────────────────────
    const cascade = { issuerSuspended: false, othersFlagged: 0, newCredScore: null };

    // (a) Revoke the credential, anchoring the revocation on-chain.
    if (cred.status !== 'revoked') {
      const baseHash = cred.sha256Hash || cred.hash || computeCredentialHash(cred);
      const revokedHash = `${baseHash}:REVOKED`;
      try {
        const anchor = await anchorHash(revokedHash);
        if (anchor.signature) cred.revokedTxSignature = anchor.signature;
      } catch (chainErr) {
        console.error('[admin:resolveFraud] revocation anchor failed:', chainErr.message);
      }
      cred.status = 'revoked';
      cred.revokedHash = revokedHash;
      cred.revokedAt = new Date();
    }
    cred.fraudReport.status = 'resolved_upheld';
    cred.fraudReport.resolvedAt = new Date();
    cred.fraudReport.resolvedBy = req.user.email || req.user.id;
    cred.fraudReport.notes = (notes || '').slice(0, 1000);
    await cred.save();

    // (b) Ding the student who held the fake — dispute penalty + recalc.
    if (cred.studentId) {
      try {
        const sp = await StudentProfile.findOne({ userId: cred.studentId });
        if (sp) {
          sp.deliveryStats.confirmedAgainst = (sp.deliveryStats.confirmedAgainst || 0) + 1;
          await sp.save();
          const allAccepted = await Credential.find({ studentId: cred.studentId, status: 'accepted' });
          const score = await recalculateCredScore(sp, allAccepted);
          cascade.newCredScore = score?.value ?? null;
        }
      } catch (spErr) {
        console.error('[admin:resolveFraud] student penalty failed:', spErr.message);
      }
    }

    // (c) Strike the issuer — skin in the game. Repeat offenders freeze.
    if (cred.issuerId) {
      try {
        const ip = await IssuerProfile.findOne({ userId: cred.issuerId });
        if (ip) {
          ip.reputation = ip.reputation || {};
          ip.reputation.disputesUpheld = (ip.reputation.disputesUpheld || 0) + 1;
          ip.reputation.strikes = (ip.reputation.strikes || 0) + 1;
          ip.reputation.trustScore = Math.max(0, (ip.reputation.trustScore ?? 100) - 34);
          ip.reputation.lastStrikeAt = new Date();
          if (ip.reputation.strikes >= ISSUER_STRIKE_LIMIT && !ip.reputation.suspended) {
            ip.reputation.suspended = true;
            ip.reputation.suspendedAt = new Date();
            cascade.issuerSuspended = true;
          }
          await ip.save();

          // (d) Flag the issuer's OTHER live mints for precautionary re-review.
          const flag = await Credential.updateMany(
            {
              issuerId: cred.issuerId,
              _id: { $ne: cred._id },
              status: { $in: ['pending', 'accepted'] },
            },
            { $set: { needsReview: true } }
          );
          cascade.othersFlagged = flag.modifiedCount ?? flag.nModified ?? 0;
        }
      } catch (ipErr) {
        console.error('[admin:resolveFraud] issuer strike failed:', ipErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: cascade.issuerSuspended
        ? 'Fraud upheld. Credential revoked, student score adjusted, and the issuer is now SUSPENDED — their other credentials are queued for re-review.'
        : 'Fraud upheld. Credential revoked, student score adjusted, and the issuer struck.',
      credential: { id: cred._id, status: cred.status },
      cascade,
    });
  } catch (err) {
    console.error('[admin:resolveFraudReport]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to resolve fraud report.' });
  }
}

module.exports = {
  issueCredential,
  revokeCredential,
  disputeCredential,
  listDisputes,
  resolveDispute,
  reportCredentialFraud,
  listFraudReports,
  resolveFraudReport,
};
