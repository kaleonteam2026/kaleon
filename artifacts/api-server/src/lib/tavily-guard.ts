import type { Request } from "express";
import { and, eq, sql } from "drizzle-orm";
import { db, liveSearchCacheTable, liveSearchUsageTable } from "@workspace/db";
import { logger } from "./logger";
import type { TavilyResult } from "./tavily";

const COOLDOWN_MS = 10_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const KIND_USER = "user";
const KIND_DAY = "day";

function resolveDailyCap(): number {
  const raw = process.env["TAVILY_DAILY_CAP"];
  if (raw === undefined) return 20;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    logger.warn({ raw }, "Invalid TAVILY_DAILY_CAP; falling back to 20");
    return 20;
  }
  return Math.floor(parsed);
}
const DAILY_CAP = resolveDailyCap();
export function getTavilyDailyCap(): number {
  return DAILY_CAP;
}

function calendarDayKey(ts: number): string {
  // UTC calendar day so reset is deterministic across server restarts.
  return new Date(ts).toISOString().slice(0, 10);
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

async function getCached(endpoint: string, normalizedQuery: string): Promise<TavilyResult | null> {
  const rows = await db
    .select()
    .from(liveSearchCacheTable)
    .where(
      and(
        eq(liveSearchCacheTable.endpoint, endpoint),
        eq(liveSearchCacheTable.normalizedQuery, normalizedQuery),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const age = Date.now() - new Date(row.createdAt).getTime();
  if (age > CACHE_TTL_MS) {
    await db
      .delete(liveSearchCacheTable)
      .where(
        and(
          eq(liveSearchCacheTable.endpoint, endpoint),
          eq(liveSearchCacheTable.normalizedQuery, normalizedQuery),
        ),
      );
    return null;
  }
  return row.result as TavilyResult;
}

async function setCached(endpoint: string, normalizedQuery: string, result: TavilyResult): Promise<void> {
  await db
    .insert(liveSearchCacheTable)
    .values({ endpoint, normalizedQuery, result: result as unknown as Record<string, unknown> })
    .onConflictDoUpdate({
      target: [liveSearchCacheTable.endpoint, liveSearchCacheTable.normalizedQuery],
      set: { result: result as unknown as Record<string, unknown>, createdAt: new Date() },
    });
}

type ReserveOk = { ok: true; dailyCount: number };
type ReserveDenied = { ok: false; status: number; error: string };

/**
 * Atomically reserves a Tavily call slot for the user, enforcing both the
 * per-user cooldown and the global daily cap inside a single transaction
 * with row-level locks. This avoids the check-then-write race that would
 * otherwise let concurrent requests bypass the cap.
 */
async function reserveSlot(userId: string, dayKey: string): Promise<ReserveOk | ReserveDenied> {
  return db.transaction(async (tx) => {
    // Ensure both rows exist so we can lock them in a deterministic order.
    await tx
      .insert(liveSearchUsageTable)
      .values([
        { kind: KIND_USER, key: userId, lastCallAt: new Date(0), count: 0 },
        { kind: KIND_DAY, key: dayKey, lastCallAt: null, count: 0 },
      ])
      .onConflictDoNothing({ target: [liveSearchUsageTable.kind, liveSearchUsageTable.key] });

    const userRows = await tx
      .select({ lastCallAt: liveSearchUsageTable.lastCallAt })
      .from(liveSearchUsageTable)
      .where(and(eq(liveSearchUsageTable.kind, KIND_USER), eq(liveSearchUsageTable.key, userId)))
      .for("update")
      .limit(1);

    const last = userRows[0]?.lastCallAt ? new Date(userRows[0].lastCallAt).getTime() : 0;
    const sinceLast = Date.now() - last;
    if (sinceLast < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - sinceLast) / 1000);
      return { ok: false, status: 429, error: `Please wait ${wait}s before searching again.` };
    }

    const dayRows = await tx
      .select({ count: liveSearchUsageTable.count })
      .from(liveSearchUsageTable)
      .where(and(eq(liveSearchUsageTable.kind, KIND_DAY), eq(liveSearchUsageTable.key, dayKey)))
      .for("update")
      .limit(1);

    const currentCount = dayRows[0]?.count ?? 0;
    if (currentCount >= DAILY_CAP) {
      return { ok: false, status: 429, error: "Daily live-search quota reached. Try again tomorrow." };
    }

    const updatedDay = await tx
      .update(liveSearchUsageTable)
      .set({ count: sql`${liveSearchUsageTable.count} + 1`, updatedAt: new Date() })
      .where(and(eq(liveSearchUsageTable.kind, KIND_DAY), eq(liveSearchUsageTable.key, dayKey)))
      .returning({ count: liveSearchUsageTable.count });

    await tx
      .update(liveSearchUsageTable)
      .set({ lastCallAt: new Date(), updatedAt: new Date() })
      .where(and(eq(liveSearchUsageTable.kind, KIND_USER), eq(liveSearchUsageTable.key, userId)));

    return { ok: true, dailyCount: updatedDay[0]?.count ?? currentCount + 1 };
  });
}

export type QuotaInfo = {
  remainingToday: number;
  cooldownSecondsLeft: number;
  dailyCap: number;
};

/**
 * Returns the user's current live-search quota state without reserving a slot.
 * Safe to call frequently from the UI.
 */
export async function getQuotaInfo(req: Request): Promise<QuotaInfo> {
  const userId = String((req.user as { id?: number | string } | undefined)?.id ?? "anon");
  const dayKey = calendarDayKey(Date.now());

  const [userRows, dayRows] = await Promise.all([
    db
      .select({ lastCallAt: liveSearchUsageTable.lastCallAt })
      .from(liveSearchUsageTable)
      .where(and(eq(liveSearchUsageTable.kind, KIND_USER), eq(liveSearchUsageTable.key, userId)))
      .limit(1),
    db
      .select({ count: liveSearchUsageTable.count })
      .from(liveSearchUsageTable)
      .where(and(eq(liveSearchUsageTable.kind, KIND_DAY), eq(liveSearchUsageTable.key, dayKey)))
      .limit(1),
  ]);

  const last = userRows[0]?.lastCallAt ? new Date(userRows[0].lastCallAt).getTime() : 0;
  const sinceLast = Date.now() - last;
  const cooldownSecondsLeft = sinceLast < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - sinceLast) / 1000) : 0;

  const used = dayRows[0]?.count ?? 0;
  const remainingToday = Math.max(0, DAILY_CAP - used);

  return { remainingToday, cooldownSecondsLeft, dailyCap: DAILY_CAP };
}

export type GuardResult =
  | { ok: true; result: TavilyResult }
  | { ok: false; status: number; error: string };

export async function guardedTavilyCall(opts: {
  req: Request;
  endpoint: string;
  cacheKey: string;
  call: () => Promise<TavilyResult>;
}): Promise<GuardResult> {
  const { req, endpoint, cacheKey, call } = opts;
  const userId = String((req.user as { id?: number | string } | undefined)?.id ?? "anon");
  const normalizedQuery = normalizeQuery(cacheKey);

  const hit = await getCached(endpoint, normalizedQuery);
  if (hit) {
    logger.info({ tavilyCall: true, userId, endpoint, cacheHit: true }, "Tavily cache hit");
    return { ok: true, result: hit };
  }

  const dayKey = calendarDayKey(Date.now());
  const reservation = await reserveSlot(userId, dayKey);
  if (!reservation.ok) {
    if (reservation.error.startsWith("Daily")) {
      logger.warn(
        { tavilyCall: true, userId, endpoint, cap: DAILY_CAP },
        "Tavily daily cap reached",
      );
    }
    return reservation;
  }

  logger.info(
    {
      tavilyCall: true,
      userId,
      endpoint,
      cacheHit: false,
      dailyCount: reservation.dailyCount,
      cap: DAILY_CAP,
    },
    "Tavily live call",
  );

  const result = await call();
  await setCached(endpoint, normalizedQuery, result);
  return { ok: true, result };
}
