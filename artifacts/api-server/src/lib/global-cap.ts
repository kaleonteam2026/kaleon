import { db, aiDailyUsage } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const DEFAULT_CAP = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getCap(): number {
  const raw = process.env.AI_DAILY_CAP;
  if (!raw) return DEFAULT_CAP;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CAP;
}

export async function incrementGlobalAi(): Promise<{ allowed: boolean; cap: number; used: number }> {
  const day = todayKey();
  const cap = getCap();

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
  const cap = getCap();
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
