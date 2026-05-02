import { Router } from "express";
import { db, igetcProgressTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

router.get("/profiles/:profileId/igetc", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  try {
    const rows = await db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, profileId));
    if (rows.length === 0) { res.json({ areas: {} }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error({ err }, "Error fetching IGETC progress");
    res.status(500).json({ error: "Failed to fetch IGETC progress" });
  }
});

router.put("/profiles/:profileId/igetc", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  const { areas } = req.body as { areas: Record<string, boolean> };
  try {
    const existing = await db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, profileId));
    if (existing.length === 0) {
      const [row] = await db.insert(igetcProgressTable).values({ profileId, areas }).returning();
      res.json(row);
    } else {
      const [row] = await db.update(igetcProgressTable)
        .set({ areas, updatedAt: new Date() })
        .where(eq(igetcProgressTable.profileId, profileId))
        .returning();
      res.json(row);
    }
  } catch (err) {
    req.log.error({ err }, "Error saving IGETC progress");
    res.status(500).json({ error: "Failed to save IGETC progress" });
  }
});

router.post("/profiles/:profileId/igetc/analyze", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const profileId = parseInt(req.params.profileId);
  try {
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId));
    if (courses.length === 0) {
      res.json({ areas: {}, note: "Add courses first to enable AI analysis." });
      return;
    }
    const courseList = courses
      .map(c => `${c.courseCode ?? ""} ${c.courseName} (${c.units ?? 3} units, ${c.status ?? "unknown"}, grade: ${c.grade ?? "unknown"})`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: "You are a California community college IGETC advisor. Given a list of courses, determine which IGETC areas they likely satisfy. Return ONLY valid JSON, no markdown fences, no explanation.",
      messages: [{
        role: "user",
        content: `Analyze these community college courses and return a JSON object indicating which IGETC areas they likely satisfy.\n\nCourses:\n${courseList}\n\nReturn JSON with these exact keys (set to true if likely satisfied, false if not): "1a" (English Composition), "1b" (Critical Thinking & Composition), "1c" (Oral Communication), "2" (Math/Quantitative Reasoning), "3a" (Arts), "3b" (Humanities), "4" (Social & Behavioral Sciences), "5a" (Physical Science), "5b" (Biological Science), "5c" (Lab Activity), "6" (Languages Other Than English), "7" (US History/Gov - CSU only). Only set to true if there is a clear match. Be conservative.`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = text.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    const areas = JSON.parse(cleaned) as Record<string, boolean>;
    res.json({ areas });
  } catch (err) {
    req.log.error({ err }, "Error analyzing IGETC courses");
    res.status(500).json({ error: "Failed to analyze courses" });
  }
});

export default router;
