// ─────────────────────────────────────────────────────────────
// CredChain Backend — Institution requests ("Request your institution")
// Companion to the public issuer directory: when a student can't find their
// school/employer, they request it here. Requests are aggregated per
// institution into a ranked demand list for platform admins.
//
//   requestInstitution        — a signed-in student asks for an institution.
//   listInstitutionRequests   — admin: ranked demand list (most-wanted first).
//   resolveInstitutionRequest — admin: mark reviewing / onboarded / declined.
// ─────────────────────────────────────────────────────────────

const InstitutionRequest = require('../models/InstitutionRequest');
const IssuerProfile = require('../models/IssuerProfile');
const User = require('../models/User');

// POST /api/v1/issuers/directory/request   (requireAuth)
// Body: { institutionName, website?, note? }
async function requestInstitution(req, res) {
  try {
    const { institutionName, website, note } = req.body || {};
    const name = String(institutionName || '').trim();
    if (name.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your institution’s name.' });
    }

    const nameKey = InstitutionRequest.toKey(name);

    // Soft guard: if a verified issuer with this name already exists, the
    // student doesn't need to request it — tell them it's already available.
    const verifiedIssuers = await IssuerProfile.find({ isVerifiedIssuer: true }).select('userId');
    if (verifiedIssuers.length) {
      const issuerUsers = await User.find({ _id: { $in: verifiedIssuers.map((p) => p.userId) } }).select('name');
      const alreadyLive = issuerUsers.some((u) => InstitutionRequest.toKey(u.name) === nameKey);
      if (alreadyLive) {
        return res.status(200).json({
          success: true,
          alreadyAvailable: true,
          message: `${name} is already set up on CredChain — search for it in the directory and it can send credentials to your vault.`,
        });
      }
    }

    // Upsert the per-institution demand doc.
    let doc = await InstitutionRequest.findOne({ nameKey });
    if (!doc) {
      doc = new InstitutionRequest({ nameKey, displayName: name, website: website?.trim() || undefined });
    } else if (website && !doc.website) {
      doc.website = website.trim();
    }

    // Count each DISTINCT student once.
    const already = doc.requesters.some((r) => String(r.studentId) === String(req.user.id));
    if (!already) {
      doc.requesters.push({ studentId: req.user.id, note: (note || '').slice(0, 500), requestedAt: new Date() });
      doc.requestCount = doc.requesters.length;
    }
    await doc.save();

    return res.status(already ? 200 : 201).json({
      success: true,
      alreadyAvailable: false,
      alreadyRequested: already,
      message: already
        ? `You’ve already requested ${name}. We’ll reach out to them — ${doc.requestCount} student${doc.requestCount === 1 ? '' : 's'} in total want this.`
        : `Thanks — we’ve logged your request for ${name}. ${doc.requestCount} student${doc.requestCount === 1 ? '' : 's'} now want it on CredChain.`,
      request: { id: doc._id, displayName: doc.displayName, requestCount: doc.requestCount, status: doc.status },
    });
  } catch (err) {
    console.error('[institution:request]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to submit your request.' });
  }
}

// GET /api/v1/admin/institution-requests   (requireAuth + requireAdmin)
// Ranked demand list — most-requested, still-open institutions first.
async function listInstitutionRequests(_req, res) {
  try {
    const docs = await InstitutionRequest.find({})
      .sort({ status: 1, requestCount: -1, updatedAt: -1 })
      .limit(200);

    const requests = docs.map((d) => ({
      id: d._id,
      displayName: d.displayName,
      website: d.website || null,
      requestCount: d.requestCount,
      status: d.status,
      lastRequestedAt: d.requesters.length ? d.requesters[d.requesters.length - 1].requestedAt : d.updatedAt,
      createdAt: d.createdAt,
    }));

    return res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('[institution:list]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to load institution requests.' });
  }
}

// POST /api/v1/admin/institution-requests/:id/resolve   (requireAuth + requireAdmin)
// Body: { status: 'reviewing' | 'onboarded' | 'declined' }
async function resolveInstitutionRequest(req, res) {
  try {
    const { status } = req.body || {};
    if (!['reviewing', 'onboarded', 'declined'].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'reviewing', 'onboarded', or 'declined'." });
    }

    const doc = await InstitutionRequest.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Institution request not found.' });
    }

    doc.status = status;
    doc.resolvedBy = req.user.email || req.user.id;
    doc.resolvedAt = new Date();
    await doc.save();

    return res.status(200).json({
      success: true,
      message: `Marked "${doc.displayName}" as ${status}.`,
      request: { id: doc._id, displayName: doc.displayName, status: doc.status },
    });
  } catch (err) {
    console.error('[institution:resolve]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update the request.' });
  }
}

module.exports = { requestInstitution, listInstitutionRequests, resolveInstitutionRequest };
