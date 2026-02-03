/**
 * In-memory rate limiter. For production consider Upstash Redis.
 */

const windows = new Map<string, { count: number; resetAt: number }>();

const defaultWindowMs = 60_000; // 1 minute

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number = defaultWindowMs
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (now >= entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + windowMs;
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }
  return { ok: true };
}

export function getClientIdentifier(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}
