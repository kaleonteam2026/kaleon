import { Router } from "express";
import { db, igetcProgressTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { getOwnedProfile } from "../lib/ownership";

const router = Router();

router.get("/profiles/:profileId/igetc", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const rows = await db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, profileId));
    res.json(rows.length > 0 ? rows[0] : { areas: {} });
  } catch (err) {
    req.log.error({ err }, "Error fetching IGETC progress");
    res.status(500).json({ error: "Failed to fetch IGETC progress" });
  }
});

router.put("/profiles/:profileId/igetc", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const { areas } = req.body as { areas: Record<string, boolean> };
    const existing = await db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, profileId));
    if (existing.length === 0) {
      const [row] = await db.insert(igetcProgressTable).values({ profileId, areas }).returning();
      res.json(row);
    } else {
      const [row] = await db.update(igetcProgressTable).set({ areas, updatedAt: new Date() })
        .where(eq(igetcProgressTable.profileId, profileId)).returning();
      res.json(row);
    }
  } catch (err) {
    req.log.error({ err }, "Error updating IGETC progress");
    res.status(500).json({ error: "Failed to update IGETC progress" });
  }
});

router.post("/profiles/:profileId/igetc/analyze", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId));
    if (courses.length === 0) { res.json({ areas: {}, note: "No courses found. Add your courses first." }); return; }

    const courseList = courses.map(c => `${c.courseCode ?? ""} ${c.courseName} (${c.units ?? 3} units, ${c.status ?? "completed"})`).join("\n");

    const prompt = `You are a California community college IGETC expert. Given the following list of courses a student has taken, identify which IGETC areas each course likely satisfies. Return ONLY a JSON object with boolean values for these exact keys:
"1a" (English Composition), "1b" (Critical Thinking/Composition), "1c" (Oral Communication, CSU only),
"2" (Math/Quantitative Reasoning), "3a" (Arts), "3b" (Humanities), "4" (Social/Behavioral Sciences),
"5a" (Physical Science), "5b" (Biological Science), "5c" (Laboratory Activity), "6" (Languages Other Than English),
"7" (US History/Gov, CSU only).

Set to true ONLY if you are confident the course satisfies that area based on typical CA CC course naming conventions. When in doubt, set to false.

Student courses:
${courseList}

Respond with ONLY the JSON object, no explanation.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    let areas: Record<string, boolean> = {};
    try { areas = JSON.parse(text.trim()); } catch { areas = {}; }

    res.json({ areas });
  } catch (err) {
    req.log.error({ err }, "Error analyzing IGETC");
    res.status(500).json({ error: "Failed to analyze courses for IGETC" });
  }
});

export default router;
