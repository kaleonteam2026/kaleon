import type { Request } from "express";
import { logger } from "./logger";
import type { TavilyResult } from "./tavily";

const COOLDOWN_MS = 10_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const DAILY_CAP = Number(process.env["TAVILY_DAILY_CAP"] ?? 50);

const lastCallByUser = new Map<string, number>();
const cache = new Map<string, { at: number; result: TavilyResult }>();
let dailyCount = 0;
let dailyWindowStart = Date.now();

function rolloverDailyWindow() {
  const now = Date.now();
  if (now - dailyWindowStart >= 24 * 60 * 60 * 1000) {
    dailyCount = 0;
    dailyWindowStart = now;
  }
}

function pruneCache() {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (now - v.at > CACHE_TTL_MS) cache.delete(k);
  }
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
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
  const key = `${endpoint}::${normalizeQuery(cacheKey)}`;

  pruneCache();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    logger.info({ tavilyCall: true, userId, endpoint, cacheHit: true }, "Tavily cache hit");
    return { ok: true, result: hit.result };
  }

  const last = lastCallByUser.get(userId) ?? 0;
  const sinceLast = Date.now() - last;
  if (sinceLast < COOLDOWN_MS) {
    const wait = Math.ceil((COOLDOWN_MS - sinceLast) / 1000);
    return { ok: false, status: 429, error: `Please wait ${wait}s before searching again.` };
  }

  rolloverDailyWindow();
  if (dailyCount >= DAILY_CAP) {
    logger.warn({ tavilyCall: true, userId, endpoint, dailyCount, cap: DAILY_CAP }, "Tavily daily cap reached");
    return { ok: false, status: 429, error: "Daily live-search quota reached. Try again tomorrow." };
  }

  lastCallByUser.set(userId, Date.now());
  dailyCount += 1;
  logger.info({ tavilyCall: true, userId, endpoint, cacheHit: false, dailyCount, cap: DAILY_CAP }, "Tavily live call");

  const result = await call();
  cache.set(key, { at: Date.now(), result });
  return { ok: true, result };
}
