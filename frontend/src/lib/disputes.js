// ─────────────────────────────────────────────────────────────
// CredChain — client-side Dispute store  (Section 5.1, 7)
//
// The backend has no dispute endpoint yet, so the student-side appeal flow is
// persisted in localStorage for the demo. Semantics mirror the spec exactly:
// flagging a REVOKED credential "Disputed" freezes the visible downgrade
// (badge → amber "Under Review") and routes to an independent platform-admin
// queue (modelled here as a separate store the issuer can't self-resolve).
// ─────────────────────────────────────────────────────────────

const KEY = 'credchain_disputes';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage disabled — non-fatal */
  }
}

export function getDispute(credentialId) {
  return readAll()[credentialId] || null;
}

export function isDisputed(credentialId) {
  const d = readAll()[credentialId];
  return Boolean(d && d.status === 'under_review');
}

export function fileDispute(credentialId, reason) {
  const map = readAll();
  map[credentialId] = {
    status: 'under_review',
    reason: reason || 'Revocation believed to be in error.',
    filedAt: new Date().toISOString(),
  };
  writeAll(map);
  return map[credentialId];
}

export function allDisputes() {
  return readAll();
}
