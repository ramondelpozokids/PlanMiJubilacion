/**
 * Rate limit en memoria (por instancia). Suficiente como capa extra en serverless
 * de una sola región; no sustituye WAF perimetral.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): { ok: true; remaining: number } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + opts.windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > opts.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  return { ok: true, remaining: opts.limit - b.count };
}

/** Limpieza ocasional para no crecer sin límite en procesos largos. */
export function pruneRateLimitBuckets(now = Date.now()): void {
  for (const [k, b] of buckets) {
    if (now >= b.resetAt) buckets.delete(k);
  }
}
