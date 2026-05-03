import { db, aiDailyUsage, aiUserDailyUsage } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";

const DEFAULT_GLOBAL_CAP = 200;
const DEFAULT_USER_CAP = 20;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getGlobalCap(): number {
  const raw = process.env.AI_DAILY_CAP;
  if (!raw) return DEFAULT_GLOBAL_CAP;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_GLOBAL_CAP;
}

function getUserCap(): number {
  const raw = process.env.AI_DAILY_USER_CAP;
  if (!raw) return DEFAULT_USER_CAP;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_USER_CAP;
}

export async function incrementGlobalAi(): Promise<{ allowed: boolean; cap: number; used: number }> {
  const day = todayKey();
  const cap = getGlobalCap();

  const updated = await db
    .insert(aiDailyUsage)
    .values({ day, count: 1 })
    .onConflictDoUpdate({
      target: aiDailyUsage.day,
      set: { count: sql`${aiDailyUsage.count} + 1` },
      setWhere: sql`${aiDailyUsage.count} < ${cap}`,
    })
    .returning({ count: aiDailyUsage.count });

  if (updated.length > 0) {
    return { allowed: true, cap, used: updated[0]!.count };
  }

  const current = await db
    .select({ count: aiDailyUsage.count })
    .from(aiDailyUsage)
    .where(eq(aiDailyUsage.day, day));
  const used = current[0]?.count ?? cap;
  return { allowed: false, cap, used };
}

export async function getGlobalAiUsage(): Promise<{ cap: number; used: number; remaining: number }> {
  const day = todayKey();
  const cap = getGlobalCap();
  const rows = await db
    .select({ count: aiDailyUsage.count })
    .from(aiDailyUsage)
    .where(eq(aiDailyUsage.day, day));
  const used = rows[0]?.count ?? 0;
  return { cap, used, remaining: Math.max(0, cap - used) };
}

export function globalCapMessage(cap: number): string {
  return `The app has reached its global daily AI limit (${cap} generations/day). Please try again tomorrow.`;
}

export async function incrementUserAi(
  userId: string,
): Promise<{ allowed: boolean; cap: number; used: number }> {
  const day = todayKey();
  const cap = getUserCap();

  const updated = await db
    .insert(aiUserDailyUsage)
    .values({ day, userId, count: 1 })
    .onConflictDoUpdate({
      target: [aiUserDailyUsage.day, aiUserDailyUsage.userId],
      set: { count: sql`${aiUserDailyUsage.count} + 1` },
      setWhere: sql`${aiUserDailyUsage.count} < ${cap}`,
    })
    .returning({ count: aiUserDailyUsage.count });

  if (updated.length > 0) {
    return { allowed: true, cap, used: updated[0]!.count };
  }

  const current = await db
    .select({ count: aiUserDailyUsage.count })
    .from(aiUserDailyUsage)
    .where(and(eq(aiUserDailyUsage.day, day), eq(aiUserDailyUsage.userId, userId)));
  const used = current[0]?.count ?? cap;
  return { allowed: false, cap, used };
}

export async function getUserAiUsage(
  userId: string,
): Promise<{ cap: number; used: number; remaining: number }> {
  const day = todayKey();
  const cap = getUserCap();
  const rows = await db
    .select({ count: aiUserDailyUsage.count })
    .from(aiUserDailyUsage)
    .where(and(eq(aiUserDailyUsage.day, day), eq(aiUserDailyUsage.userId, userId)));
  const used = rows[0]?.count ?? 0;
  return { cap, used, remaining: Math.max(0, cap - used) };
}

export function userCapMessage(cap: number): string {
  return `You've hit your personal daily AI limit (${cap} generations/day). It resets at 00:00 UTC.`;
}

/**
 * Combined per-user + global cap enforcement. Increments per-user first
 * (cheaper, more relevant error message), then global. Returns a 429-shaped
 * payload on denial so callers can `res.status(r.status).json({ error: r.error })`.
 *
 * Note: if the per-user check passes but the global check fails, the user
 * unit is still consumed. Acceptable trade-off vs a transactional 2-phase
 * rollback for this volume of traffic.
 */
export type CapReason = "user" | "global";

export async function enforceAiCap(userId: string): Promise<
  | { allowed: true; global: { cap: number; used: number }; user: { cap: number; used: number } }
  | { allowed: false; status: 429; error: string; reason: CapReason }
> {
  const u = await incrementUserAi(userId);
  if (!u.allowed) {
    return { allowed: false, status: 429, error: userCapMessage(u.cap), reason: "user" };
  }
  const g = await incrementGlobalAi();
  if (!g.allowed) {
    return { allowed: false, status: 429, error: globalCapMessage(g.cap), reason: "global" };
  }
  return {
    allowed: true,
    global: { cap: g.cap, used: g.used },
    user: { cap: u.cap, used: u.used },
  };
}

/**
 * Non-incrementing pre-flight check that respects BOTH the per-user and
 * global caps. Use before doing expensive work (e.g. multi-call research)
 * to avoid wasted spend when we know the final reservation will fail.
 */
export async function checkAiCapAvailable(
  userId: string,
): Promise<
  | { ok: true; user: { cap: number; used: number; remaining: number }; global: { cap: number; used: number; remaining: number } }
  | { ok: false; status: 429; error: string; reason: CapReason }
> {
  const [user, global] = await Promise.all([getUserAiUsage(userId), getGlobalAiUsage()]);
  if (user.remaining <= 0) {
    return { ok: false, status: 429, error: userCapMessage(user.cap), reason: "user" };
  }
  if (global.remaining <= 0) {
    return { ok: false, status: 429, error: globalCapMessage(global.cap), reason: "global" };
  }
  return { ok: true, user, global };
}
