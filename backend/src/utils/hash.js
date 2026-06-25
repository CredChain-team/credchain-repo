// ─────────────────────────────────────────────────────────────
// CredChain Backend — credential hashing
// Builds the 64-char SHA-256 fingerprint that gets written on-chain.
// Only this hash ever touches Solana — never documents or personal data.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');

// Deterministically fingerprint a credential. The same credential always
// produces the same 64-char hex hash, so anyone can re-derive and verify it.
function buildCredentialHash(credential) {
  const c = credential || {};
  const title = c.title || '';
  const issuer = c.issuer || '';
  const studentId = c.studentId ? String(c.studentId) : '';
  // Prefer the creation timestamp; fall back to "now" only if absent.
  const date = c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString();

  const stable = `${title}|${issuer}|${studentId}|${date}`;
  return crypto.createHash('sha256').update(stable, 'utf8').digest('hex');
}

// Canonical fingerprint for the advanced (issuer-minted) credential flow.
// Keyed on the fields that uniquely identify the asset regardless of which
// student account later links to it: title | issuerId | recipientEmail | _id.
//
// We deliberately anchor on the immutable `_id` (assigned the instant a
// Mongoose doc is constructed, stable for the life of the row) rather than
// `createdAt` — `createdAt` is only populated on save, so hashing before
// save would use a different value than the badge route later re-derives.
// The badge route re-computes this exact value to detect tampering, so the
// inputs must be present pre-save AND immutable thereafter.
function computeCredentialHash(credential) {
  const c = credential || {};
  const title = (c.title || '').trim();
  const issuerId = c.issuerId ? String(c.issuerId) : '';
  const recipient = (c.recipientEmail || '').trim().toLowerCase();
  // Immutable anchor: the ObjectId (or its creation timestamp as a fallback).
  const anchor = c._id
    ? String(c._id)
    : (c.createdAt ? new Date(c.createdAt).toISOString() : '');

  const stable = `${title}|${issuerId}|${recipient}|${anchor}`;
  return crypto.createHash('sha256').update(stable, 'utf8').digest('hex');
}

module.exports = { buildCredentialHash, computeCredentialHash };
