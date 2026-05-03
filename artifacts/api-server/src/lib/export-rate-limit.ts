const buckets = new Map<string, { count: number; resetAt: number }>();

const PER_USER_HOURLY = 20;
const WINDOW_MS = 60 * 60 * 1000;

export function checkExportRateLimit(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const entry = buckets.get(userId);
  if (!entry || entry.resetAt < now) {
    buckets.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (entry.count >= PER_USER_HOURLY) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  entry.count++;
  return { ok: true };
}

export const EXPORT_HOURLY_LIMIT = PER_USER_HOURLY;
