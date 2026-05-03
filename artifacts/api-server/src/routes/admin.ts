import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  aiDailyUsage,
  aiUserDailyUsage,
  aiRouteDailyUsage,
  liveSearchUsageTable,
  usersTable,
  seoSignupClicksTable,
} from "@workspace/db";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import {
  ALL_CCS,
  ALL_UNIS,
  ALL_MAJORS,
  uniSlug,
  hasVerifiedArticulation,
} from "../services/seoGenerator";
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

  // ── Today's $ spend (per-route + Tavily) ─────────────────────────────────
  const todayRouteCost = routeTodayRows.reduce(
    (s, r) => s + costFor(r.route, r.count),
    0,
  );
  const todayTavilyCost = (tavilyTodayRows[0]?.count ?? 0) * TAVILY_PER_CALL_USD;
  const todayUsd = Math.round((todayRouteCost + todayTavilyCost) * 1000) / 1000;

  // ── Projected month-end run-rate ─────────────────────────────────────────
  // Average $/day over the trailing 30d window (or last N days with activity)
  // times days remaining in the current calendar month, plus today's spend.
  const now = new Date();
  const daysInMonth = new Date(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
  ).getUTCDate();
  const dayOfMonth = now.getUTCDate();
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
  const avgDailyUsd = (totalRouteCost30d + totalTavilyCost30d) / 30;
  const projectedMonthEndUsd =
    Math.round((todayUsd + avgDailyUsd * daysRemaining) * 1000) / 1000;

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
      todayUsd,
      avgDailyUsd: Math.round(avgDailyUsd * 1000) / 1000,
      projectedMonthEndUsd,
      daysRemainingInMonth: daysRemaining,
    },
  });
});

// ── SEO conversion dashboard ────────────────────────────────────────────────
// Tracks clicks on the transfer-guide signup CTA (logged into
// `seo_signup_clicks` by /transfer-signup). Returns aggregated totals plus a
// daily series for the requested date range, with top + bottom performing
// (cc, school, major) combos so we can prune low-performing programmatic
// pages and double down on winners.

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateOnly(raw: unknown, fallback: Date): Date {
  if (typeof raw === "string" && ISO_DATE_RE.test(raw)) {
    const d = new Date(`${raw}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ccLabel(slug: string): string {
  return ALL_CCS.find((c) => c.slug === slug)?.name ?? slug;
}
function uniLabel(slug: string): string {
  return ALL_UNIS.find((u) => uniSlug(u) === slug)?.name ?? slug;
}
function majorLabel(slug: string): string {
  return ALL_MAJORS.find((m) => m.slug === slug)?.name ?? slug;
}

router.get("/admin/seo-conversions", ownerOnly, async (req, res) => {
  // Default range: last 30 days inclusive of today (UTC).
  const now = new Date();
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const defaultFrom = new Date(defaultTo.getTime() - 29 * 24 * 60 * 60 * 1000);

  let fromDate = parseDateOnly(req.query.from, defaultFrom);
  let toDate = parseDateOnly(req.query.to, defaultTo);
  if (fromDate.getTime() > toDate.getTime()) {
    [fromDate, toDate] = [toDate, fromDate];
  }
  // Strict exclusive upper bound — anything strictly before (toDate + 1 day),
  // so a row at midnight UTC of the day after `to` is NOT included.
  const toExclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

  const whereRange = and(
    gte(seoSignupClicksTable.createdAt, fromDate),
    lt(seoSignupClicksTable.createdAt, toExclusive),
  );

  const dayExpr = sql<string>`to_char(${seoSignupClicksTable.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`;

  // Combo universe = the actual live SEO surface. A leaf transfer page only
  // renders (and only appears in the sitemap) when there is a verified
  // ASSIST articulation for the (CC, uni, major) combo — see routes/seo.ts.
  // The `seo_pages` table is a render cache and intentionally contains
  // entries for non-live combos too, so we do NOT use it as the universe
  // here. We left-join click counts for the selected range so live combos
  // with zero clicks still show up — exactly the prune candidates.
  const livePages: Array<{ fromSlug: string; toSlug: string; majorSlug: string }> = [];
  for (const cc of ALL_CCS) {
    for (const uni of ALL_UNIS) {
      const us = uniSlug(uni);
      for (const major of ALL_MAJORS) {
        if (hasVerifiedArticulation(cc, uni, major)) {
          livePages.push({ fromSlug: cc.slug, toSlug: us, majorSlug: major.slug });
        }
      }
    }
  }

  const [
    totalRow,
    seriesRows,
    rangeComboRows,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)::int`.as("count") })
      .from(seoSignupClicksTable)
      .where(whereRange),
    db
      .select({
        day: dayExpr.as("day"),
        count: sql<number>`COUNT(*)::int`.as("count"),
      })
      .from(seoSignupClicksTable)
      .where(whereRange)
      .groupBy(dayExpr)
      .orderBy(dayExpr),
    db
      .select({
        fromSlug: seoSignupClicksTable.fromSlug,
        toSlug: seoSignupClicksTable.toSlug,
        majorSlug: seoSignupClicksTable.majorSlug,
        count: sql<number>`COUNT(*)::int`.as("count"),
      })
      .from(seoSignupClicksTable)
      .where(whereRange)
      .groupBy(
        seoSignupClicksTable.fromSlug,
        seoSignupClicksTable.toSlug,
        seoSignupClicksTable.majorSlug,
      ),
  ]);

  // Densify daily series so the chart has no gaps.
  const seriesMap = new Map(seriesRows.map((r) => [String(r.day), r.count]));
  const series: Array<{ day: string; count: number }> = [];
  const dayMs = 24 * 60 * 60 * 1000;
  for (let t = fromDate.getTime(); t <= toDate.getTime(); t += dayMs) {
    const k = dayKey(new Date(t));
    series.push({ day: k, count: seriesMap.get(k) ?? 0 });
  }

  // Merge: union of every published combo with every combo that has clicks
  // in-range (clicks may exist for combos whose page row was deleted).
  const clickByKey = new Map<string, number>();
  for (const r of rangeComboRows) {
    clickByKey.set(`${r.fromSlug}__${r.toSlug}__${r.majorSlug}`, r.count);
  }
  const universe = new Map<string, { fromSlug: string; toSlug: string; majorSlug: string }>();
  for (const p of livePages) {
    universe.set(`${p.fromSlug}__${p.toSlug}__${p.majorSlug}`, p);
  }
  for (const r of rangeComboRows) {
    const k = `${r.fromSlug}__${r.toSlug}__${r.majorSlug}`;
    if (!universe.has(k)) {
      universe.set(k, { fromSlug: r.fromSlug, toSlug: r.toSlug, majorSlug: r.majorSlug });
    }
  }

  const combos = Array.from(universe.values())
    .map((p) => {
      const count = clickByKey.get(`${p.fromSlug}__${p.toSlug}__${p.majorSlug}`) ?? 0;
      return {
        fromSlug: p.fromSlug,
        toSlug: p.toSlug,
        majorSlug: p.majorSlug,
        ccName: ccLabel(p.fromSlug),
        schoolName: uniLabel(p.toSlug),
        majorName: majorLabel(p.majorSlug),
        count,
        path: `/transfer/${p.fromSlug}/${p.toSlug}/${p.majorSlug}`,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Roll up by slug across the full combo universe so zero-click slugs
  // appear in the by-CC / by-school / by-major breakdowns too.
  function rollUp(key: "fromSlug" | "toSlug" | "majorSlug", label: (s: string) => string) {
    const m = new Map<string, number>();
    for (const c of combos) {
      const k = c[key];
      m.set(k, (m.get(k) ?? 0) + c.count);
    }
    return Array.from(m.entries())
      .map(([slug, count]) => ({ slug, name: label(slug), count }))
      .sort((a, b) => b.count - a.count);
  }

  const byCc = rollUp("fromSlug", ccLabel);
  const bySchool = rollUp("toSlug", uniLabel);
  const byMajor = rollUp("majorSlug", majorLabel);

  const top = combos.filter((c) => c.count > 0).slice(0, 10);
  // True low performers: zero-click pages first, then lowest counts.
  const bottom = [...combos]
    .sort((a, b) => a.count - b.count)
    .slice(0, 10);

  const convertedCombos = combos.filter((c) => c.count > 0).length;
  const zeroClickCombos = combos.length - convertedCombos;

  res.json({
    range: {
      from: dayKey(fromDate),
      to: dayKey(toDate),
      days: series.length,
    },
    totals: {
      clicks: totalRow[0]?.count ?? 0,
      uniqueCombos: convertedCombos,
      publishedCombos: combos.length,
      zeroClickCombos,
    },
    series,
    byCc,
    bySchool,
    byMajor,
    combos,
    top,
    bottom,
  });
});

export default router;
