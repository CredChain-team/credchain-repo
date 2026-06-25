// ─────────────────────────────────────────────────────────────
// CredChain Backend — dynamic SVG badge generator (System 5)
// Hand-built SVG (no dependency) so the public /badge route can return a
// live trust pill that re-computes the credential's integrity on every
// request. Navy/blue brand for the verified state; red for tampered/revoked.
// ─────────────────────────────────────────────────────────────

// Brand palette (shared with the CV Studio / frontend): navy + blue.
const NAVY = '#0f2040';
const GREEN = '#10b981';
const RED = '#dc2626';
const AMBER = '#d97706';

/** Escape text for safe inclusion in SVG. */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build a two-segment badge pill: a dark label on the left, a coloured
 * status on the right.
 * @param {string} label   left text (e.g. "CredChain")
 * @param {string} status  right text (e.g. "✓ VERIFIED ACCURATE")
 * @param {string} color   right background colour
 */
function badge(label, status, color) {
  const labelW = Math.max(70, 8 + label.length * 7);
  const statusW = Math.max(150, 16 + status.length * 7.2);
  const w = labelW + statusW;
  const h = 28;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" role="img" aria-label="${esc(label)}: ${esc(status)}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".12"/>
    <stop offset="1" stop-opacity=".12"/>
  </linearGradient>
  <clipPath id="r"><rect width="${w}" height="${h}" rx="6"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="${h}" fill="${NAVY}"/>
    <rect x="${labelW}" width="${statusW}" height="${h}" fill="${color}"/>
    <rect width="${w}" height="${h}" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Segoe UI,Verdana,Geneva,sans-serif" font-size="12" font-weight="600">
    <text x="${labelW / 2}" y="18">${esc(label)}</text>
    <text x="${labelW + statusW / 2}" y="18">${esc(status)}</text>
  </g>
</svg>`;
}

/** Green "verified accurate" badge. */
function verifiedBadge(label = 'CredChain') {
  return badge(label, '✓ VERIFIED ACCURATE', GREEN);
}

/** Red "unverified / expired" badge (tampered or revoked). */
function unverifiedBadge(label = 'CredChain') {
  return badge(label, '\u{1F147} UNVERIFIED / EXPIRED', RED);
}

/** Amber "under review" badge — a revocation the student has disputed. */
function reviewBadge(label = 'CredChain') {
  return badge(label, '⏳ UNDER REVIEW', AMBER);
}

module.exports = { verifiedBadge, unverifiedBadge, reviewBadge, badge };
