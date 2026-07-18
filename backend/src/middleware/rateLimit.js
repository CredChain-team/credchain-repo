// ─────────────────────────────────────────────────────────────
// CredChain Backend — in-memory rate limiter (zero-dependency)
//
// The verification funnel fires OUTBOUND, often PAID lookups (CAC, KYC). An
// unthrottled registerIssuerStepOne could be spammed to burn money or probe
// the infra. This is a tiny fixed-window limiter — no new npm dependency, no
// Redis — sufficient for a single-node MVP. For multi-node prod, swap the Map
// for a shared store (Redis) behind the same middleware signature.
//
// Usage:  router.post('/issuer/register', rateLimit({ windowMs, max }), handler)
// ─────────────────────────────────────────────────────────────

/**
 * rateLimit — fixed-window limiter middleware factory.
 * @param {object} opts
 * @param {number} opts.windowMs  Window length in ms (default 15 min).
 * @param {number} opts.max       Max requests per key per window (default 30).
 * @param {string} opts.keyPrefix Namespace so different routes don't share buckets.
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 30, keyPrefix = 'rl' } = {}) {
  const hits = new Map(); // key → { count, resetAt }

  // Opportunistic sweep of expired buckets so the Map can't grow unbounded.
  function sweep(now) {
    for (const [k, v] of hits) {
      if (v.resetAt <= now) hits.delete(k);
    }
  }

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    // Key by authenticated user when available, else by IP.
    const who = req.user?.id || req.ip || req.connection?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${who}`;

    if (hits.size > 5000) sweep(now); // cheap guardrail

    let bucket = hits.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        message: `Too many requests. Try again in ${retryAfter}s.`,
      });
    }
    return next();
  };
}

module.exports = { rateLimit };
