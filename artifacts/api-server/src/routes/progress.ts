import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import {
  db, studentProfilesTable, coursesTable, pathwaysTable,
  studentProgressTable, progressAnalysesTable, guidebooksTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateProgressAnalysis, generateEntryFeedback } from "../services/aiService.js";

const router = Router();

const rateLimiter = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

// POST /api/profiles/:profileId/progress — log a new entry
router.post("/profiles/:profileId/progress", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const { entryType, title, description, entryDate, numericValue, metadata } = req.body as Record<string, unknown>;

    if (!entryType || !title) {
      res.status(400).json({ error: "entryType and title are required" });
      return;
    }

    const entry = await db.insert(studentProgressTable).values({
      profileId,
      entryType: String(entryType),
      title: String(title),
      description: description ? String(description) : null,
      entryDate: entryDate ? String(entryDate) : null,
      numericValue: numericValue != null ? Number(numericValue) : null,
      metadata: metadata as Record<string, unknown> ?? null,
    }).returning();

    res.json(entry[0]);
  } catch (err) {
    req.log.error({ err }, "Error logging progress entry");
    res.status(500).json({ error: "Failed to log progress entry" });
  }
});

// POST /api/profiles/:profileId/progress/entry-feedback — instant AI feedback on a logged entry
router.post("/profiles/:profileId/progress/entry-feedback", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const { entryId } = req.body as { entryId: number };

    const [entries, profiles, pathways] = await Promise.all([
      db.select().from(studentProgressTable).where(eq(studentProgressTable.profileId, profileId)).orderBy(desc(studentProgressTable.createdAt)),
      db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId)),
      db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId)),
    ]);

    if (profiles.length === 0) { res.status(404).json({ error: "Profile not found" }); return; }

    const entry = entries.find(e => e.id === entryId);
    if (!entry) { res.status(404).json({ error: "Entry not found" }); return; }

    const selectedPathway = pathways.find(p => p.isSelected === "true") ?? null;
    const pathwayReport = selectedPathway ? (selectedPathway.reportJson as Record<string, unknown>) : null;

    // Pull guidebook for this pathway
    let guidebookMarkdown: string | null = null;
    if (selectedPathway) {
      const guidebooks = await db.select().from(guidebooksTable)
        .where(eq(guidebooksTable.pathwayId, selectedPathway.id))
        .orderBy(desc(guidebooksTable.createdAt))
        .limit(1);
      if (guidebooks.length > 0) guidebookMarkdown = guidebooks[0].contentMarkdown ?? null;
    }

    // Collect GPA history for context
    const gpaEntries = entries
      .filter(e => e.entryType === "gpa_update" && e.numericValue != null)
      .map(e => ({
        id: e.id,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        entryDate: e.entryDate,
        numericValue: e.numericValue,
      }));

    const result = await generateEntryFeedback(
      {
        id: entry.id,
        entryType: entry.entryType,
        title: entry.title,
        description: entry.description,
        entryDate: entry.entryDate,
        numericValue: entry.numericValue,
      },
      profiles[0] as unknown as Record<string, unknown>,
      pathwayReport,
      guidebookMarkdown,
      gpaEntries,
    );

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error generating entry feedback");
    res.status(500).json({ error: "Failed to generate feedback. Please try again." });
  }
});

// GET /api/profiles/:profileId/progress — list all entries newest-first
router.get("/profiles/:profileId/progress", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const entries = await db.select().from(studentProgressTable)
      .where(eq(studentProgressTable.profileId, profileId))
      .orderBy(desc(studentProgressTable.createdAt));
    res.json(entries);
  } catch (err) {
    req.log.error({ err }, "Error fetching progress");
    res.status(500).json({ error: "Failed to fetch progress" });
  }
});

// DELETE /api/progress/:entryId
router.delete("/progress/:entryId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const entryId = parseInt(req.params.entryId);
    await db.delete(studentProgressTable).where(eq(studentProgressTable.id, entryId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting progress entry");
    res.status(500).json({ error: "Failed to delete entry" });
  }
});

// POST /api/profiles/:profileId/progress/analyze — generate AI progress analysis
router.post("/profiles/:profileId/progress/analyze", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: "Rate limit exceeded. You can generate up to 5 analyses per hour." });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);

    const [profiles, courses, pathways, progressEntries] = await Promise.all([
      db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId)),
      db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId)),
      db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId)),
      db.select().from(studentProgressTable)
        .where(eq(studentProgressTable.profileId, profileId))
        .orderBy(desc(studentProgressTable.createdAt)),
    ]);

    if (profiles.length === 0) { res.status(404).json({ error: "Profile not found" }); return; }

    const profile = profiles[0];
    const selectedPathway = pathways.find(p => p.isSelected === "true") ?? null;

    const result = await generateProgressAnalysis(
      profile as unknown as Record<string, unknown>,
      courses as unknown as Record<string, unknown>[],
      selectedPathway ? (selectedPathway.reportJson as Record<string, unknown>) ?? null : null,
      progressEntries.map(e => ({
        id: e.id,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        entryDate: e.entryDate,
        numericValue: e.numericValue,
      })),
      (scholarships as unknown as Record<string, unknown>[]).slice(0, 10),
      (opportunities as unknown as Record<string, unknown>[]).slice(0, 8),
    );

    const analysis = await db.insert(progressAnalysesTable).values({
      profileId,
      contentMarkdown: result.markdown,
      overallScore: result.overallScore,
      summary: result.summary,
    }).returning();

    res.json(analysis[0]);
  } catch (err) {
    req.log.error({ err }, "Error generating progress analysis");
    res.status(500).json({ error: "Failed to generate progress analysis. Please try again." });
  }
});

// GET /api/profiles/:profileId/progress/selected-pathway — check if pathway is selected
router.get("/profiles/:profileId/progress/selected-pathway", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const pathways = await db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId));
    const selected = pathways.find(p => p.isSelected === "true") ?? null;
    res.json({ hasSelectedPathway: selected !== null, pathway: selected ? (selected.reportJson as Record<string, unknown>) : null });
  } catch (err) {
    req.log.error({ err }, "Error checking selected pathway");
    res.status(500).json({ error: "Failed to check pathway" });
  }
});

// GET /api/profiles/:profileId/progress/analyses — list all saved analyses
router.get("/profiles/:profileId/progress/analyses", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const analyses = await db.select().from(progressAnalysesTable)
      .where(eq(progressAnalysesTable.profileId, profileId))
      .orderBy(desc(progressAnalysesTable.createdAt));
    res.json(analyses);
  } catch (err) {
    req.log.error({ err }, "Error fetching analyses");
    res.status(500).json({ error: "Failed to fetch analyses" });
  }
});

export default router;
