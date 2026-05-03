import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  aiDailyUsage,
  aiUserDailyUsage,
  aiRouteDailyUsage,
  liveSearchUsageTable,
  usersTable,
} from "@workspace/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { getCapDefaults } from "../lib/global-cap";
import { getTavilyDailyCap } from "../lib/tavily-guard";

const router = Router();

function parseOwnerIds(): Set<string> {
  const raw = process.env.OWNER_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
  );
}

const OWNER_IDS = parseOwnerIds();

function isOwner(userId: string | undefined): boolean {
  if (!userId) return false;
  return OWNER_IDS.has(userId);
}

/**
 * Owner-only gate. We deliberately return 404 (not 403) for both unauthed
 * and non-owner users so the existence of the admin surface isn't leaked.
 */
function ownerOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated() || !isOwner(req.user?.id)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  next();
}

// ── Static cost table (USD per call) ────────────────────────────────────────
// Best-effort estimates based on average prompt/completion sizes per route,
// blended Anthropic + Tavily token pricing. Tweak as model pricing changes.
const ROUTE_COST_USD: Record<string, number> = {
  chat: 0.01,
  "chat:interview": 0.012,
  "course-catalog": 0.02,
  transferability: 0.025,
  igetc: 0.025,
  pathways: 0.04,
  roadmap: 0.04,
  "roadmap-infographic": 0.04,
  guidebook: 0.04,
  "deep-dive": 0.08,
  "internships-search": 0.04,
  "progress-feedback": 0.02,
  "progress-analyze": 0.03,
  universities: 0.025,
  "campus-opportunities": 0.025,
  "cc-opportunities": 0.025,
  reminders: 0.02,
};
const DEFAULT_PER_CALL_USD = 0.025;
const TAVILY_PER_CALL_USD = 0.008;

function costFor(route: string, count: number): number {
  const unit = ROUTE_COST_USD[route] ?? DEFAULT_PER_CALL_USD;
  return Math.round(unit * count * 1000) / 1000; // 3 dp
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoKey(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// GET /api/admin/usage — owner-only JSON snapshot
router.get("/admin/usage", ownerOnly, async (_req, res) => {
  const today = todayKey();
  const since = daysAgoKey(29); // 30 days inclusive of today
  const sevenDaysAgo = daysAgoKey(6);
  const caps = getCapDefaults();
  const tavilyCap = getTavilyDailyCap();

  // Today + 30-day series for global AI
  const [todayGlobalRows, aiSeriesRows] = await Promise.all([
    db.select().from(aiDailyUsage).where(eq(aiDailyUsage.day, today)),
    db
      .select()
      .from(aiDailyUsage)
      .where(gte(aiDailyUsage.day, since))
      .orderBy(aiDailyUsage.day),
  ]);

  // Today per-route
  const routeTodayRows = await db
    .select()
    .from(aiRouteDailyUsage)
    .where(eq(aiRouteDailyUsage.day, today))
    .orderBy(desc(aiRouteDailyUsage.count));

  // 30-day per-route totals (for cost attribution)
  const routeRangeRows = await db
    .select({
      route: aiRouteDailyUsage.route,
      count: sql<number>`SUM(${aiRouteDailyUsage.count})::int`.as("count"),
    })
    .from(aiRouteDailyUsage)
    .where(gte(aiRouteDailyUsage.day, since))
    .groupBy(aiRouteDailyUsage.route);

  // Top users (today + last 7d)
  const [topUsersToday, topUsers7d] = await Promise.all([
    db
      .select({ userId: aiUserDailyUsage.userId, count: aiUserDailyUsage.count })
      .from(aiUserDailyUsage)
      .where(eq(aiUserDailyUsage.day, today))
      .orderBy(desc(aiUserDailyUsage.count))
      .limit(10),
    db
      .select({
        userId: aiUserDailyUsage.userId,
        count: sql<number>`SUM(${aiUserDailyUsage.count})::int`.as("count"),
      })
      .from(aiUserDailyUsage)
      .where(gte(aiUserDailyUsage.day, sevenDaysAgo))
      .groupBy(aiUserDailyUsage.userId)
      .orderBy(desc(sql`SUM(${aiUserDailyUsage.count})`))
      .limit(10),
  ]);

  // Hydrate emails for the user lists (best effort)
  const allUserIds = Array.from(
    new Set([...topUsersToday.map((r) => r.userId), ...topUsers7d.map((r) => r.userId)]),
  );
  const userMeta: Record<string, { email: string | null }> = {};
  if (allUserIds.length > 0) {
    const rows = await db
      .select({ id: usersTable.id, email: usersTable.email })
      .from(usersTable)
      .where(sql`${usersTable.id} = ANY(${allUserIds})`);
    for (const r of rows) {
      userMeta[r.id] = { email: r.email ?? null };
    }
  }

  // Tavily today + 30-day series (kind=day, key=YYYY-MM-DD rows)
  const [tavilyTodayRows, tavilySeriesRows] = await Promise.all([
    db
      .select({ count: liveSearchUsageTable.count })
      .from(liveSearchUsageTable)
      .where(
        and(eq(liveSearchUsageTable.kind, "day"), eq(liveSearchUsageTable.key, today)),
      ),
    db
      .select({ day: liveSearchUsageTable.key, count: liveSearchUsageTable.count })
      .from(liveSearchUsageTable)
      .where(and(eq(liveSearchUsageTable.kind, "day"), gte(liveSearchUsageTable.key, since)))
      .orderBy(liveSearchUsageTable.key),
  ]);

  // Build the 30-day densified series so the sparkline has no gaps
  function densify(
    rows: Array<{ day: string; count: number }>,
  ): Array<{ day: string; count: number }> {
    const map = new Map(rows.map((r) => [r.day, r.count]));
    const out: Array<{ day: string; count: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = daysAgoKey(i);
      out.push({ day: d, count: map.get(d) ?? 0 });
    }
    return out;
  }

  const aiSeries = densify(
    aiSeriesRows.map((r) => ({ day: String(r.day), count: r.count })),
  );
  const tavilySeries = densify(
    tavilySeriesRows.map((r) => ({ day: String(r.day), count: r.count })),
  );

  // Per-route 30-day cost breakdown
  const routeBreakdown = routeRangeRows
    .map((r) => ({
      route: r.route,
      count30d: r.count,
      perCallUsd: ROUTE_COST_USD[r.route] ?? DEFAULT_PER_CALL_USD,
      cost30dUsd: costFor(r.route, r.count),
    }))
    .sort((a, b) => b.cost30dUsd - a.cost30dUsd);

  const totalAi30d = aiSeries.reduce((s, r) => s + r.count, 0);
  const totalTavily30d = tavilySeries.reduce((s, r) => s + r.count, 0);
  const totalRouteCost30d = routeBreakdown.reduce((s, r) => s + r.cost30dUsd, 0);
  const totalTavilyCost30d = Math.round(totalTavily30d * TAVILY_PER_CALL_USD * 1000) / 1000;

  res.json({
    today,
    caps: {
      globalAi: caps.global,
      perUserAi: caps.user,
      tavily: tavilyCap,
    },
    today_usage: {
      globalAi: todayGlobalRows[0]?.count ?? 0,
      tavily: tavilyTodayRows[0]?.count ?? 0,
      perRoute: routeTodayRows.map((r) => ({ route: r.route, count: r.count })),
    },
    series_30d: {
      globalAi: aiSeries,
      tavily: tavilySeries,
    },
    top_users: {
      today: topUsersToday.map((r) => ({
        userId: r.userId,
        email: userMeta[r.userId]?.email ?? null,
        count: r.count,
      })),
      last7d: topUsers7d.map((r) => ({
        userId: r.userId,
        email: userMeta[r.userId]?.email ?? null,
        count: r.count,
      })),
    },
    cost_estimate: {
      perCallUsdDefault: DEFAULT_PER_CALL_USD,
      tavilyPerCallUsd: TAVILY_PER_CALL_USD,
      route30d: routeBreakdown,
      total30dUsd: Math.round((totalRouteCost30d + totalTavilyCost30d) * 1000) / 1000,
      totalAiCalls30d: totalAi30d,
      totalTavilyCalls30d: totalTavily30d,
    },
  });
});

export default router;
