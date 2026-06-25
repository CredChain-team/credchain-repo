// ─────────────────────────────────────────────────────────────
// CredChain — small formatting helpers
// ─────────────────────────────────────────────────────────────

// Truncate a long hash/signature for display: 0xab12…f9c3
export function shortHash(value, head = 8, tail = 6) {
  if (!value) return '—';
  const s = String(value);
  if (s.length <= head + tail + 1) return s;
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
}

// Currency-aware salary display. The Insights engine may return either a bare
// number or an already-formatted string; we respect a string and only format
// raw numbers, using the country module's currency code.
const CURRENCY_SYMBOL = { NGN: '₦', USD: '$', GBP: '£', KES: 'KSh', GHS: '₵', ZAR: 'R', EUR: '€', INR: '₹' };

export function formatSalary(value, currency) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' && /[^\d.,\s]/.test(value)) return value; // already has a symbol/word
  const num = Number(String(value).replace(/[,\s]/g, ''));
  if (Number.isNaN(num)) return String(value);
  const sym = CURRENCY_SYMBOL[currency] || (currency ? `${currency} ` : '');
  return `${sym}${num.toLocaleString('en-US')}`;
}

export function timeAgo(dateish) {
  if (!dateish) return '';
  const d = new Date(dateish);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
