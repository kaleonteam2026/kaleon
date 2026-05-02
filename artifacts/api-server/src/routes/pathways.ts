import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, studentProfilesTable, coursesTable, pathwaysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generatePathways } from "../services/aiService.js";
import { calculateCompatibility, interpretScore } from "../services/scoringService.js";

const router = Router();

// Simple in-memory rate limiter: max 5 AI requests per user per hour
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

// POST /api/profiles/:profileId/generate-pathways
router.post("/profiles/:profileId/generate-pathways", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: "Rate limit exceeded. You can generate up to 5 pathway sets per hour. Please try again later." });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const profiles = await db.select().from(studentProfilesTable)
      .where(eq(studentProfilesTable.id, profileId));

    if (profiles.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = profiles[0];
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, profileId));

    const studentData = {
      currentGpa: profile.currentGpa,
      intendedMajor: profile.intendedMajor,
      careerGoal: profile.careerGoal,
      financialSituation: profile.financialSituation,
      transferTimeline: profile.transferTimeline,
      geographicPreference: profile.geographicPreference,
      completedCourses: courses.map(c => c.courseName),
    };

    // Rank universities to feed into AI
    const rankedUnis = (universities as typeof universities).map((uni) => {
      const result = calculateCompatibility(studentData, uni);
      const fit = interpretScore(result.total);
      return { ...uni, _score: result.total, _fit: fit.label };
    }).sort((a, b) => b._score - a._score);

    const pathwayResults = await generatePathways(
      profile as unknown as Record<string, unknown>,
      courses as unknown as Record<string, unknown>[],
      rankedUnis as unknown as Record<string, unknown>[],
      scholarships as unknown as Record<string, unknown>[],
      opportunities as unknown as Record<string, unknown>[]
    );

    // Save pathways to DB
    const savedPathways = await Promise.all(
      pathwayResults.map(async (p) => {
        const inserted = await db.insert(pathwaysTable).values({
          profileId,
          universityId: p.university,
          compatibilityScore: p.compatibilityScore,
          pathwayType: p.type,
          reportJson: p as unknown as Record<string, unknown>,
          isSelected: "false",
        }).returning();
        return inserted[0];
      })
    );

    res.json(savedPathways);
  } catch (err) {
    req.log.error({ err }, "Error generating pathways");
    res.status(500).json({ error: "Failed to generate pathways. Please try again." });
  }
});

// GET /api/profiles/:profileId/pathways
router.get("/profiles/:profileId/pathways", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const pathways = await db.select().from(pathwaysTable)
      .where(eq(pathwaysTable.profileId, profileId));
    res.json(pathways);
  } catch (err) {
    req.log.error({ err }, "Error fetching pathways");
    res.status(500).json({ error: "Failed to fetch pathways" });
  }
});

// GET /api/pathways/:pathwayId
router.get("/pathways/:pathwayId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const pathwayId = parseInt(req.params.pathwayId);
    const pathways = await db.select().from(pathwaysTable)
      .where(eq(pathwaysTable.id, pathwayId));

    if (pathways.length === 0) {
      res.status(404).json({ error: "Pathway not found" });
      return;
    }

    res.json(pathways[0]);
  } catch (err) {
    req.log.error({ err }, "Error fetching pathway");
    res.status(500).json({ error: "Failed to fetch pathway" });
  }
});

// POST /api/pathways/:pathwayId/select
router.post("/pathways/:pathwayId/select", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const pathwayId = parseInt(req.params.pathwayId);

    const pathway = await db.select().from(pathwaysTable)
      .where(eq(pathwaysTable.id, pathwayId));

    if (pathway.length === 0) {
      res.status(404).json({ error: "Pathway not found" });
      return;
    }

    await db.update(pathwaysTable)
      .set({ isSelected: "false" })
      .where(eq(pathwaysTable.profileId, pathway[0].profileId));

    const updated = await db.update(pathwaysTable)
      .set({ isSelected: "true" })
      .where(eq(pathwaysTable.id, pathwayId))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Error selecting pathway");
    res.status(500).json({ error: "Failed to select pathway" });
  }
});

export default router;
