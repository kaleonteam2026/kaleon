import { Router } from "express";
import { db, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { tavilySearch } from "../lib/tavily";
import { guardedTavilyCall } from "../lib/tavily-guard";

const router = Router();

router.post("/live/scholarships", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { profileId, query } = req.body as { profileId?: number; query?: string };

    let profileContext = "";
    if (profileId) {
      const [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId));
      if (profile) {
        const bits = [
          profile.intendedMajor ? `intended major ${profile.intendedMajor}` : null,
          profile.currentGpa ? `GPA ${profile.currentGpa}` : null,
          profile.communityCollege ? `attending ${profile.communityCollege}` : null,
          profile.financialSituation ? `financial situation: ${profile.financialSituation}` : null,
          profile.careerGoal ? `career goal: ${profile.careerGoal}` : null,
        ].filter(Boolean).join(", ");
        if (bits) profileContext = ` for a California community college student with ${bits}`;
      }
    }

    const baseQuery = query?.trim() || "open scholarships for California community college transfer students";
    const userQuery = `${baseQuery}${profileContext}. Currently open with deadlines in the next 6 months. Include award amount, deadline date, eligibility, and the official application URL for each.`;

    const guarded = await guardedTavilyCall({
      req,
      endpoint: "scholarships",
      cacheKey: `${baseQuery}|${profileId ?? "anon"}`,
      call: () => tavilySearch({
        query: userQuery,
        searchDepth: "advanced",
        includeAnswer: "advanced",
        maxResults: 8,
      }),
    });

    if (!guarded.ok) { res.status(guarded.status).json({ error: guarded.error }); return; }
    res.json(guarded.result);
  } catch (err) {
    req.log.error({ err }, "Tavily scholarship search failed");
    const message = err instanceof Error ? err.message : "Failed to search scholarships";
    res.status(500).json({ error: message });
  }
});

router.post("/live/verify-deadlines", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { deadlines } = req.body as { deadlines: Array<{ label: string; date: string }> };
    if (!Array.isArray(deadlines) || deadlines.length === 0) {
      res.status(400).json({ error: "deadlines array required" }); return;
    }

    const list = deadlines.slice(0, 14).map((d, i) => `${i + 1}. ${d.label} — listed as ${d.date}`).join("\n");
    const userQuery = `California UC and CSU transfer cycle deadlines for the current cycle. For each of these listed dates, state whether they are still accurate per official UCOP, CSU, CSAC, or studentaid.gov sources, and note any changes:\n\n${list}`;

    const guarded = await guardedTavilyCall({
      req,
      endpoint: "verify-deadlines",
      cacheKey: list,
      call: () => tavilySearch({
        query: userQuery,
        searchDepth: "advanced",
        includeAnswer: "advanced",
        maxResults: 8,
      }),
    });

    if (!guarded.ok) { res.status(guarded.status).json({ error: guarded.error }); return; }
    res.json(guarded.result);
  } catch (err) {
    req.log.error({ err }, "Tavily deadline verify failed");
    const message = err instanceof Error ? err.message : "Failed to verify deadlines";
    res.status(500).json({ error: message });
  }
});

export default router;
