// ─────────────────────────────────────────────────────────────
// CredChain Backend — VerificationRouter (country-routed issuer checks)
//
// WHY THIS EXISTS:
// The issuer funnel (issuerController.js) hardcoded a raw WHOIS domain-age
// check (L1) and a stubbed webhook (L3) — both Nigeria-blind and easy to game
// or unavailable on cloud hosts. This router makes each verification TIER
// resolve a provider PER COUNTRY, with a documented global fallback. The
// L1→L4 state machine stays identical everywhere; only the provider changes.
// No single vendor covers the world, so routing is mandatory, not optional.
//
// Nigeria-first providers (wire when you have keys):
//   L1 entity legitimacy : CAC RC-number lookup (Dojah / VerifyMe / QoreID)
//   L3 officer identity  : Smile ID (SmartSelfie liveness + NIN + AML) — SYNC,
//                          which removes the static-shared-secret webhook vuln.
//   L4 registry (uni)    : WAEC Verify / consent flow; NUC accredited allowlist
// Global fallback:
//   L1 : RDAP entity lookup (NOT raw WHOIS port 43 — blocked on most PaaS)
//   L3 : Veriff / Trulioo (doc + liveness, 190+ countries; AML add-on required)
//   L4 : consume feeds from Digitary/Parchment, Nat'l Student Clearinghouse
//
// Pattern mirrors config/solana.js: real when keys present; otherwise a clearly
// FLAGGED provisional result that FAILS CLOSED (never a silent pass).
// ─────────────────────────────────────────────────────────────

// Which real providers are wired, by env. Empty = provisional/manual mode.
const CAC_PROVIDER   = (process.env.CAC_PROVIDER || '').toLowerCase().trim();   // 'dojah' | 'verifyme' | 'qoreid'
const KYC_PROVIDER   = (process.env.KYC_PROVIDER || '').toLowerCase().trim();   // 'smileid' | 'veriff' | 'trulioo'
const WAEC_PROVIDER  = (process.env.WAEC_PROVIDER || '').toLowerCase().trim();  // 'waec'

function isDemoMode() {
  return process.env.DEMO_MODE !== 'false';
}

// ── L1: entity legitimacy ────────────────────────────────────
// Nigeria → CAC RC-number lookup. Global → RDAP entity lookup.
// Returns { verified, method, flags[], details, provisional }.
// FAILS CLOSED: an unwired provider returns verified:false + a needs_manual
// flag, never a pass. This REPLACES trusting raw domain age as a gate.
async function verifyEntity({ country = 'NG', rcNumber, companyName, domain } = {}) {
  const flags = [];

  if (country === 'NG' && CAC_PROVIDER) {
    // TODO(live): call the CAC lookup API for CAC_PROVIDER with rcNumber/
    // companyName; return the registry's status + director list. The director
    // list also feeds the common-ownership check (two issuers sharing a
    // director are NOT independent — see issuanceWeight corroboration).
    throw new Error(`[verify] CAC provider '${CAC_PROVIDER}' not wired yet — implement the RC-number lookup, then remove this throw.`);
  }

  if (country !== 'NG' && process.env.RDAP_ENABLED === 'true') {
    // TODO(live): RDAP lookup (https://rdap.org/domain/<domain>) for a
    // registration/entity signal. Modern, GDPR-safe replacement for WHOIS:43.
    throw new Error('[verify] RDAP path not wired yet — implement rdap.org lookup, then remove this throw.');
  }

  // Provisional (no provider): fail closed to manual admin review.
  flags.push('entity_check_unavailable', 'needs_manual_registry_review');
  return {
    verified: false,
    provisional: true,
    method: country === 'NG' ? 'cac_pending' : 'rdap_pending',
    flags,
    details: { rcNumber: rcNumber || null, companyName: companyName || null, domain: domain || null },
  };
}

// ── L3: officer identity + liveness ──────────────────────────
// Nigeria → Smile ID (NIN + SmartSelfie). Global → Veriff/Trulioo.
// SYNCHRONOUS by design: the result returns in the response, so there is NO
// async webhook + shared secret to forge or replay (the old vuln).
// Returns { passed, provider, flags[], reference, provisional }.
async function verifyIdentity({ country = 'NG', nin, selfieImage, documentImage, consentGiven } = {}) {
  // Consent is a HARD precondition — biometric data is sensitive under NDPA
  // 2023 (Nigeria) and GDPR (expansion). No consent → refuse, do not process.
  if (!consentGiven) {
    return { passed: false, provisional: false, provider: 'none', reference: null, flags: ['no_biometric_consent'] };
  }

  if (KYC_PROVIDER) {
    // TODO(live): call KYC_PROVIDER synchronously (Smile ID for NG: NIN +
    // SmartSelfie liveness + AML screen). Return pass/fail + a provider
    // reference ONLY. Never persist the raw biometric — store pass/fail + ref.
    throw new Error(`[verify] KYC provider '${KYC_PROVIDER}' not wired yet — implement the synchronous identity+liveness call, then remove this throw.`);
  }

  if (!isDemoMode()) {
    throw new Error('[verify] no KYC_PROVIDER and DEMO_MODE=false — refusing to fake identity verification in production.');
  }

  // Provisional (demo): flagged, and explicitly NOT a real identity assurance.
  return {
    passed: false,
    provisional: true,
    provider: 'simulated',
    reference: `sim_kyc_${String(nin || 'nonin').slice(-4)}`,
    flags: ['kyc_simulated_not_verified'],
  };
}

// ── L4: credential-authority cross-match ─────────────────────
// Nigeria universities → WAEC Verify / consent flow; NUC accredited allowlist.
// FAILS CLOSED: without a provider or an allowlist hit, returns matched:false
// so the human admin must explicitly approve (issuerController now requires an
// explicit boolean — no silent pass).
async function crossMatchRegistry({ country = 'NG', institutionType, institutionName } = {}) {
  const flags = [];

  // NUC accredited-institutions allowlist (static, shippable now — a real,
  // government-published list; load from env/JSON when you add it).
  if (country === 'NG' && institutionType === 'university') {
    const allowlist = loadNucAllowlist();
    if (allowlist.length && institutionName) {
      const hit = allowlist.some((n) => n.toLowerCase() === String(institutionName).toLowerCase());
      if (hit) return { matched: true, method: 'nuc_allowlist', flags, provisional: false };
      flags.push('not_in_nuc_allowlist');
    }
  }

  if (WAEC_PROVIDER) {
    // TODO(live): WAEC Verify / consent-based confirmation for the claimed
    // certificate. Consent-based (candidate shares) is the right trust model.
    throw new Error(`[verify] WAEC provider '${WAEC_PROVIDER}' not wired yet — implement the confirmation flow, then remove this throw.`);
  }

  // Provisional: hand to fail-closed manual admin review.
  flags.push('registry_check_unavailable', 'needs_manual_review');
  return { matched: false, provisional: true, method: 'manual_pending', flags };
}

// NUC accredited-institutions allowlist loader. Ships empty; populate via
// NUC_ALLOWLIST_JSON (a JSON array of names) or a bundled data file later.
function loadNucAllowlist() {
  try {
    const raw = process.env.NUC_ALLOWLIST_JSON;
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* fail closed → empty allowlist */ }
  return [];
}

module.exports = {
  verifyEntity,
  verifyIdentity,
  crossMatchRegistry,
  loadNucAllowlist,
  CAC_PROVIDER,
  KYC_PROVIDER,
  WAEC_PROVIDER,
};
