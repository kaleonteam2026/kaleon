// Articulation refresh pipeline. Shared between the manual script
// (src/scripts/refresh-articulations.ts) and the in-process scheduler
// (src/lib/articulations-scheduler.ts).
//
// Pipeline:
//   1. For each (CC, UC/CSU, major) combo, attempt a live fetch from
//      ASSIST.org via `fetchFromAssist`.
//   2. If the live fetch returns null (no agreement, blocked egress, etc.),
//      fall back to the curated seed agreements bundled at
//      `src/data/articulations.json` (cycle 2024-25, transcribed from real
//      ASSIST agreements).
//   3. Upsert the result into the `articulations` table.
//   4. Mark the matching `seo_pages` row (if any) stale so the next request
//      regenerates the page with the new articulation rows.
import { db, articulationsTable, seoPagesTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import {
  ALL_CCS,
  ALL_UNIS,
  ALL_MAJORS,
  SEED_ARTICULATIONS,
  articulationKey,
  uniSlug,
  type CC,
  type Uni,
  type Major,
  type ArticulationEntry,
} from "./seoGenerator";
import { logger } from "../lib/logger";

interface FetchedArticulation {
  agreementCycle: string;
  rows: string[][];
  sourceUrl: string | null;
}

export interface RefreshSummary {
  upserts: number;
  invalidated: number;
  skipped: number;
  liveHits: number;
  seedHits: number;
}

/**
 * Live ASSIST.org fetch. ASSIST exposes an undocumented JSON API at
 * `https://assist.org/api/`; the receiving institution catalogue lives at
 * `https://assist.org/api/institutions`, agreements at
 * `https://assist.org/api/agreements?...` and academic year IDs at
 * `https://assist.org/api/AcademicYears`.
 *
 * The API requires:
 *   - Browser-style headers (UA + accept) and an `XSRF-TOKEN` cookie obtained
 *     from a GET to `https://assist.org/`.
 *   - Numeric institution IDs and a per-cycle academic year ID.
 *
 * From this Replit egress IP the API currently returns HTTP 400 (likely TLS
 * fingerprint filtering at their CDN), so the call is best-effort: any
 * failure returns null and the caller falls back to the bundled seed. Once
 * the institution-ID mapping table is populated and a successful response is
 * observed, populate `parseAssistResponse` to flatten the courseGroup tree.
 */
async function fetchFromAssist(cc: CC, uni: Uni, major: Major): Promise<FetchedArticulation | null> {
  // Hardcoded agreement cycle key. ASSIST publishes one cycle per academic
  // year; bump this string each cycle (or fetch it via /api/AcademicYears).
  const cycle = process.env.ASSIST_CYCLE ?? "2024-2025";
  const enabled = process.env.ASSIST_LIVE_FETCH === "1";
  if (!enabled) return null;

  try {
    // Step 1: warm cookies
    const home = await fetch("https://assist.org/", {
      headers: {
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36",
        accept: "text/html",
      },
    });
    const setCookies = (home.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];
    const cookieHeader = setCookies.map((c: string) => c.split(";")[0]).join("; ");

    // Step 2: hit the agreements endpoint.
    const sourceUrl = `https://assist.org/transfer/results?year=75&institution=${encodeURIComponent(cc.name)}&agreement=${encodeURIComponent(uni.name)}&agreementType=to&view=agreement&viewBy=major&majorKey=${encodeURIComponent(major.name)}`;
    const apiUrl = `https://assist.org/api/agreements?ReceivingInstitutionId=${encodeURIComponent(uni.name)}&SendingInstitutionId=${encodeURIComponent(cc.name)}&AcademicYearId=75&CategoryCode=major`;
    const r = await fetch(apiUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) Chrome/126 Safari/537.36",
        cookie: cookieHeader,
        referer: "https://assist.org/",
        origin: "https://assist.org",
      },
    });
    if (!r.ok) return null;
    const json = (await r.json()) as unknown;
    const rows = parseAssistResponse(json, major);
    if (!rows || rows.length === 0) return null;
    return { agreementCycle: cycle, rows, sourceUrl };
  } catch (err) {
    logger.debug({ err, cc: cc.slug, uni: uni.id, major: major.slug }, "ASSIST live fetch failed");
    return null;
  }
}

function parseAssistResponse(_json: unknown, _major: Major): string[][] | null {
  // ASSIST agreement responses are a deeply nested
  // { templateAssets: [{ courseGroups: [{ groupItems: [{ items: [{ courses }] }] }] }] }
  // structure. Flatten into [ccCode, ccTitle, uniEquivalent] triples here when
  // the live response shape is confirmed in production. Returning null causes
  // the caller to fall back to the curated seed.
  return null;
}

function fromSeed(cc: CC, uni: Uni, major: Major): FetchedArticulation | null {
  const seed: ArticulationEntry | undefined = SEED_ARTICULATIONS[articulationKey(cc, uni, major)];
  if (!seed) return null;
  return {
    agreementCycle: seed.agreementCycle,
    rows: seed.rows,
    sourceUrl: `https://assist.org/transfer/results?year=75&institution=${encodeURIComponent(cc.name)}&agreement=${encodeURIComponent(uni.name)}&agreementType=to&view=agreement&viewBy=major&majorKey=${encodeURIComponent(major.name)}`,
  };
}

export async function runArticulationsRefresh(): Promise<RefreshSummary> {
  const summary: RefreshSummary = { upserts: 0, invalidated: 0, skipped: 0, liveHits: 0, seedHits: 0 };
  const now = new Date();

  for (const cc of ALL_CCS) {
    for (const uni of ALL_UNIS) {
      for (const major of ALL_MAJORS) {
        const live = await fetchFromAssist(cc, uni, major);
        if (live) summary.liveHits++;
        const data = live ?? fromSeed(cc, uni, major);
        if (!data) {
          summary.skipped++;
          continue;
        }
        if (!live) summary.seedHits++;

        await db
          .insert(articulationsTable)
          .values({
            fromSlug: cc.slug,
            toSlug: uniSlug(uni),
            majorSlug: major.slug,
            agreementCycle: data.agreementCycle,
            rows: data.rows,
            sourceUrl: data.sourceUrl,
            fetchedAt: now,
          })
          .onConflictDoUpdate({
            target: [articulationsTable.fromSlug, articulationsTable.toSlug, articulationsTable.majorSlug],
            set: {
              agreementCycle: data.agreementCycle,
              rows: data.rows,
              sourceUrl: data.sourceUrl,
              fetchedAt: now,
              updatedAt: now,
            },
          });
        summary.upserts++;

        const r = await db
          .update(seoPagesTable)
          .set({ updatedAt: sql`now() - interval '1 second'` })
          .where(
            and(
              eq(seoPagesTable.fromSlug, cc.slug),
              eq(seoPagesTable.toSlug, uniSlug(uni)),
              eq(seoPagesTable.majorSlug, major.slug),
            ),
          );
        const rc = (r as { rowCount?: number }).rowCount;
        if (rc && rc > 0) summary.invalidated++;
      }
    }
  }
  return summary;
}
