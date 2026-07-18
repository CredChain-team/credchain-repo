// ─────────────────────────────────────────────────────────────
// CredChain Backend — Payments service (Strategy 2: licensed fiat escrow)
//
// WHY THIS EXISTS (the legal core):
// If CredChain custodies/moves users' money itself, it risks being an
// unlicensed VASP (crypto) or PSSP/MMO (naira) under Nigerian law — a wall
// with a ~₦1bn capital requirement. The way around it is NOT to get licensed;
// it's to NEVER hold the money. A licensed partner (Flutterwave / Korapay /
// Moniepoint / Providus) holds funds IN TRUST in a per-bounty virtual account,
// and CredChain only sends *release instructions* via API. The money never
// touches a CredChain-controlled balance.
//
// IMPORTANT legal nuance baked into this design: the provider must hold funds
// IN TRUST and release on instruction — NOT settle into a CredChain account we
// pay out from (that would put us back in custody). Confirm this contractually
// with whichever provider is wired (see PROVIDER_CONTRACT_REQUIREMENT below).
//
// This mirrors config/solana.js's anchorHash pattern exactly:
//   • Provider keys present        → real virtual-account + transfer API calls.
//   • No keys + DEMO_MODE on       → deterministic SIMULATED escrow (mock ref),
//                                     clearly flagged mock:true everywhere.
//   • No keys + DEMO_MODE off      → throws (refuse to fake money in prod).
//
// So the bounty lifecycle code stays identical; only the escrow *backend*
// changes when you add keys. Going live = set PAYMENTS_PROVIDER + keys.
// ─────────────────────────────────────────────────────────────

const crypto = require('crypto');

// The provider to route real money through. Empty = simulated (MVP/demo).
// Supported (wire the adapter when you sign with one): 'flutterwave',
// 'korapay', 'moniepoint', 'providus'.
const PAYMENTS_PROVIDER = (process.env.PAYMENTS_PROVIDER || '').toLowerCase().trim();

// Contractual requirement to verify with any provider before going live.
const PROVIDER_CONTRACT_REQUIREMENT =
  'Funds MUST be held in trust by the licensed provider and released only on ' +
  'CredChain instruction. Money must NOT settle into a CredChain-controlled ' +
  'account. Confirm this is an escrow/trust product, not a collections product.';

function isDemoMode() {
  return process.env.DEMO_MODE !== 'false';
}

function isLive() {
  return Boolean(PAYMENTS_PROVIDER);
}

// Deterministic mock reference so the simulated path is stable + traceable.
function mockRef(seed) {
  const h = crypto.createHash('sha256').update(String(seed)).digest('hex');
  return `sim_${h.slice(0, 24)}`;
}

// ── Provider adapter registry ────────────────────────────────
// Each real adapter implements { openEscrow, releaseEscrow, refundEscrow }.
// Only the simulated adapter ships now; real ones are thin wrappers around the
// provider's virtual-account + transfer endpoints (axios is already a dep).
// Left as explicit TODO stubs so "going live" is a localized, obvious change —
// NOT a silent no-op that looks live but isn't.
const adapters = {
  // eslint-disable-next-line no-unused-vars
  flutterwave: () => { throw new Error('[payments] flutterwave adapter not wired yet — implement openEscrow/releaseEscrow/refundEscrow against Flutterwave virtual accounts + transfers, then remove this throw.'); },
  korapay:     () => { throw new Error('[payments] korapay adapter not wired yet.'); },
  moniepoint:  () => { throw new Error('[payments] moniepoint adapter not wired yet.'); },
  providus:    () => { throw new Error('[payments] providus adapter not wired yet.'); },
};

/**
 * openEscrow — create a per-bounty escrow hold.
 * In LIVE mode: asks the provider to open a virtual account in trust; the
 * employer funds it. Returns provider account details for the employer to pay.
 * In SIM mode: returns a mock hold, mirroring the current anchorHash escrow.
 *
 * @param {object} args { bountyId, employerId, amount, currency, reference }
 * @returns {Promise<{ state, provider, mock, reference, currency, amount, virtualAccount? }>}
 */
async function openEscrow({ bountyId, employerId, amount = 0, currency = 'NGN', reference } = {}) {
  const ref = reference || `${bountyId}|${employerId}|escrow`;

  if (isLive()) {
    const make = adapters[PAYMENTS_PROVIDER];
    if (!make) throw new Error(`[payments] unknown PAYMENTS_PROVIDER '${PAYMENTS_PROVIDER}'.`);
    const adapter = make();                    // throws until implemented (by design)
    return adapter.openEscrow({ bountyId, employerId, amount, currency, reference: ref });
  }

  if (!isDemoMode()) {
    throw new Error('[payments] no PAYMENTS_PROVIDER configured and DEMO_MODE=false — refusing to simulate money movement in production.');
  }

  // Simulated hold (MVP/demo): no real money, clearly flagged.
  return {
    state: 'held',
    provider: 'simulated',
    mock: true,
    reference: mockRef(`${ref}|open`),
    amount,
    currency,
    heldAt: new Date(),
  };
}

/**
 * releaseEscrow — pay the held funds out to the winner/student.
 * LIVE: instructs the provider to transfer from the trust account to the
 * student's payout destination. SIM: returns a mock release.
 */
async function releaseEscrow({ bountyId, studentId, amount = 0, currency = 'NGN', reference } = {}) {
  const ref = reference || `${bountyId}|${studentId}|release`;

  if (isLive()) {
    const adapter = adapters[PAYMENTS_PROVIDER]();
    return adapter.releaseEscrow({ bountyId, studentId, amount, currency, reference: ref });
  }
  if (!isDemoMode()) {
    throw new Error('[payments] cannot release: no provider and DEMO_MODE=false.');
  }
  return { state: 'released', provider: 'simulated', mock: true, reference: mockRef(`${ref}|release`), releasedAt: new Date() };
}

/**
 * refundEscrow — return held funds to the employer (cancel/decline/auto-release).
 */
async function refundEscrow({ bountyId, employerId, amount = 0, currency = 'NGN', reference } = {}) {
  const ref = reference || `${bountyId}|${employerId}|refund`;

  if (isLive()) {
    const adapter = adapters[PAYMENTS_PROVIDER]();
    return adapter.refundEscrow({ bountyId, employerId, amount, currency, reference: ref });
  }
  if (!isDemoMode()) {
    throw new Error('[payments] cannot refund: no provider and DEMO_MODE=false.');
  }
  return { state: 'refunded', provider: 'simulated', mock: true, reference: mockRef(`${ref}|refund`), releasedAt: new Date() };
}

module.exports = {
  openEscrow,
  releaseEscrow,
  refundEscrow,
  isLive,
  isDemoMode,
  PAYMENTS_PROVIDER,
  PROVIDER_CONTRACT_REQUIREMENT,
};
