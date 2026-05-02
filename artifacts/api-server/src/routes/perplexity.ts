import { Router } from "express";
import { db, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { perplexitySearch } from "../lib/perplexity";

const router = Router();

const SCHOLARSHIP_SYSTEM = `You are a California community college transfer scholarship researcher.
Find currently-open scholarships available to California community college students who are planning to transfer.
For each scholarship, return:
- Name of the scholarship
- Award amount (USD)
- Application deadline (date)
- One-line eligibility summary
- Direct application URL

Format your response as a Markdown list. Prioritize scholarships with deadlines in the next 6 months.
Only include scholarships you can verify from your search results. Do not invent any.`;

const DEADLINE_SYSTEM = `You are a California UC and CSU transfer deadlines fact-checker.
Verify whether the listed transfer admission, financial aid, and TAG deadlines are still accurate for the current cycle.
For each item, briefly state whether it is confirmed, has changed, or you could not verify, and cite the source.
Be concise — one short bullet per item. Do not repeat the question.`;

router.post("/perplexity/scholarships", async (req, res) => {
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

    const userQuery = (query?.trim() || "transfer scholarships") +
      profileContext +
      ". Focus on scholarships with deadlines in the next 6 months that are open right now in 2026.";

    const result = await perplexitySearch({
      query: userQuery,
      systemPrompt: SCHOLARSHIP_SYSTEM,
      maxTokens: 1200,
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Perplexity scholarship search failed");
    const message = err instanceof Error ? err.message : "Failed to search scholarships";
    res.status(500).json({ error: message });
  }
});

router.post("/perplexity/verify-deadlines", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const { deadlines } = req.body as { deadlines: Array<{ label: string; date: string }> };
    if (!Array.isArray(deadlines) || deadlines.length === 0) {
      res.status(400).json({ error: "deadlines array required" }); return;
    }

    const list = deadlines.slice(0, 14).map((d, i) => `${i + 1}. ${d.label} — listed as ${d.date}`).join("\n");
    const userQuery = `Please verify the following California UC/CSU transfer cycle deadlines for accuracy. For each, say "confirmed", "changed to <date>", or "could not verify", and cite an official source (UCOP, CSU, CSAC, or studentaid.gov):\n\n${list}`;

    const result = await perplexitySearch({
      query: userQuery,
      systemPrompt: DEADLINE_SYSTEM,
      maxTokens: 900,
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Perplexity deadline verify failed");
    const message = err instanceof Error ? err.message : "Failed to verify deadlines";
    res.status(500).json({ error: message });
  }
});

export default router;
