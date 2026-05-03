import { Router } from "express";
import { and, eq } from "drizzle-orm";
import universities from "../data/universities.json" assert { type: "json" };
import { db, universityDeepDivesTable, type DeepDiveReport } from "@workspace/db";
import { tavilySearch } from "../lib/tavily";
import { getOwnedProfile } from "../lib/ownership";
import { checkAiCapAvailable, enforceAiCap, getGlobalAiUsage, getUserAiUsage } from "../lib/global-cap";
import { synthesizeDeepDive, type DeepDiveSectionInput } from "../services/aiService.js";
import { getRequestLocale } from "../lib/locale.js";

const router = Router();

const TTL_DAYS = 30;
const TTL_MS = TTL_DAYS * 24 * 60 * 60 * 1000;

const DISCLAIMER =
  "Deep Dive reports are AI-synthesized from public web sources and may contain inaccuracies or outdated information. Always verify with the university's official admissions office and assist.org.";

function normalizeMajor(m: string | null | undefined): string {
  return (m ?? "general").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Cache key embeds locale so each language gets its own cached report. */
function majorCacheKey(major: string, locale: string): string {
  return `${major}::${locale}`;
}

async function readFreshReport(uniId: string, majorKey: string) {
  const rows = await db
    .select()
    .from(universityDeepDivesTable)
    .where(and(eq(universityDeepDivesTable.universityId, uniId), eq(universityDeepDivesTable.major, majorKey)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;
  return row;
}

// GET /api/universities/:uniId/deep-dive?profileId=N — returns cached report only
router.get("/universities/:uniId/deep-dive", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const uniId = req.params.uniId;
    const profileId = parseInt(String(req.query.profileId ?? ""));
    if (!Number.isFinite(profileId)) { res.status(400).json({ error: "profileId required" }); return; }

    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const major = normalizeMajor(owner.profile.intendedMajor);
    const locale = getRequestLocale(req);
    const row = await readFreshReport(uniId, majorCacheKey(major, locale));
    if (!row) { res.status(404).json({ error: "No fresh deep dive cached" }); return; }
    const usage = await getGlobalAiUsage();
    res.json({ cached: true, report: row.reportJson, expiresAt: row.expiresAt, generatedAt: row.createdAt, aiCredits: usage });
  } catch (err) {
    req.log.error({ err }, "Failed to read deep dive");
    res.status(500).json({ error: "Failed to read deep dive" });
  }
});

// POST /api/universities/:uniId/deep-dive  body: { profileId }
router.post("/universities/:uniId/deep-dive", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const uniId = req.params.uniId;
    const uni = (universities as typeof universities).find((u) => u.id === uniId);
    if (!uni) { res.status(404).json({ error: "University not found" }); return; }

    const { profileId } = req.body as { profileId?: number };
    if (!Number.isFinite(profileId)) { res.status(400).json({ error: "profileId required" }); return; }

    const owner = await getOwnedProfile(profileId!, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const majorDisplay = owner.profile.intendedMajor?.trim() || "General Studies";
    const major = normalizeMajor(owner.profile.intendedMajor);
    const locale = getRequestLocale(req);
    const majorKey = majorCacheKey(major, locale);

    // Cache hit returns immediately, no AI cap consumed.
    const cached = await readFreshReport(uniId, majorKey);
    if (cached) {
      const [global, user] = await Promise.all([
        getGlobalAiUsage(),
        getUserAiUsage(req.user.id),
      ]);
      res.json({
        cached: true,
        report: cached.reportJson,
        expiresAt: cached.expiresAt,
        generatedAt: cached.createdAt,
        aiCredits: { ...global, user, global },
      });
      return;
    }

    // Pre-flight check (no increment yet) so we don't waste research effort if
    // either the per-user or global cap is already exhausted. Final consumption
    // happens just before the (expensive) synthesis call so failed source-
    // gathering doesn't consume a credit.
    const preCheck = await checkAiCapAvailable(req.user.id);
    if (!preCheck.ok) {
      res.status(preCheck.status).json({ error: preCheck.error });
      return;
    }

    const queries: { key: DeepDiveSectionInput["key"]; title: string; query: string; topic?: "general" | "news"; days?: number }[] = [
      { key: "admissions", title: "Admissions", query: `${uni.name} transfer admit rate, transfer GPA medians, and transfer requirements for ${majorDisplay} from California community colleges. Cite official admissions and institutional research pages.` },
      { key: "cost", title: "Cost of Attendance", query: `${uni.name} total cost of attendance for transfer students this academic year — tuition, housing, food, books — including in-state vs out-of-state where relevant.` },
      { key: "outcomes", title: "Major Outcomes", query: `${uni.name} ${majorDisplay} program: graduate outcomes, post-graduation salary, top employers, and internship placement for undergraduates.` },
      { key: "campus_life", title: "Campus Life", query: `${uni.name} student life and culture: housing options, transfer student community, safety, diversity, and notable student organizations.` },
      { key: "news", title: "Recent News", query: `${uni.name} recent campus news in the last 12 months — admissions changes, policy changes, notable events.`, topic: "news", days: 365 },
    ];

    const tavilyResults = await Promise.all(
      queries.map((q) =>
        tavilySearch({
          query: q.query,
          searchDepth: "advanced",
          includeAnswer: "advanced",
          maxResults: 6,
          topic: q.topic,
          days: q.days,
        }).catch((err: unknown) => {
          req.log.warn({ err, key: q.key }, "Tavily section search failed");
          return { answer: "", citations: [] };
        }),
      ),
    );

    const sectionInputs: DeepDiveSectionInput[] = queries.map((q, i) => ({
      key: q.key,
      title: q.title,
      rawAnswer: tavilyResults[i].answer,
      citations: tavilyResults[i].citations.slice(0, 6),
    }));

    const totalCitations = sectionInputs.reduce((n, s) => n + s.citations.length, 0);
    if (totalCitations === 0) {
      res.status(502).json({ error: "Source gathering failed for all sections. Please try again later." });
      return;
    }

    // Reserve the AI credit only now, right before the expensive synthesis call.
    const cap = await enforceAiCap(req.user.id, "deep-dive");
    if (!cap.allowed) {
      res.status(cap.status).json({ error: cap.error });
      return;
    }

    const synthesized = await synthesizeDeepDive(uni.name, majorDisplay, sectionInputs, locale);

    const report: DeepDiveReport = {
      universityId: uni.id,
      universityName: uni.name,
      major: majorDisplay,
      generatedAt: new Date().toISOString(),
      sections: synthesized,
      disclaimer: DISCLAIMER,
    };

    const expiresAt = new Date(Date.now() + TTL_MS);
    await db
      .insert(universityDeepDivesTable)
      .values({ universityId: uni.id, major: majorKey, reportJson: report, expiresAt })
      .onConflictDoUpdate({
        target: [universityDeepDivesTable.universityId, universityDeepDivesTable.major],
        set: { reportJson: report, expiresAt, createdAt: new Date() },
      });

    res.json({
      cached: false,
      report,
      expiresAt: expiresAt.toISOString(),
      generatedAt: report.generatedAt,
      aiCredits: {
        used: cap.global.used,
        cap: cap.global.cap,
        remaining: Math.max(0, cap.global.cap - cap.global.used),
        global: { used: cap.global.used, cap: cap.global.cap, remaining: Math.max(0, cap.global.cap - cap.global.used) },
        user: { used: cap.user.used, cap: cap.user.cap, remaining: Math.max(0, cap.user.cap - cap.user.used) },
      },
    });
  } catch (err) {
    req.log.error({ err }, "Failed to generate deep dive");
    const message = err instanceof Error ? err.message : "Failed to generate deep dive";
    res.status(500).json({ error: message });
  }
});

export default router;
