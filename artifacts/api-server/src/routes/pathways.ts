import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, coursesTable, pathwaysTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generatePathways } from "../services/aiService.js";
import { getRequestLocale } from "../lib/locale.js";
import { calculateCompatibility, interpretScore } from "../services/scoringService.js";
import { enforceAiCap } from "../lib/global-cap";
import { getOwnedProfile, getOwnedPathway } from "../lib/ownership";

const router = Router();

// Per-user hourly cap (lowered from 5 to 3 for the most expensive endpoint)
const PER_USER_HOURLY = 3;
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= PER_USER_HOURLY) return false;
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
    res.status(429).json({ error: `Rate limit exceeded. You can generate up to ${PER_USER_HOURLY} pathway sets per hour. Please try again later.` });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const cap = await enforceAiCap(req.user.id, "pathways");
    if (!cap.allowed) {
      res.status(cap.status).json({ error: cap.error });
      return;
    }

    const profile = owner.profile;
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
      opportunities as unknown as Record<string, unknown>[],
      getRequestLocale(req),
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
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

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
    const owner = await getOwnedPathway(pathwayId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Pathway not found" }); return; }

    res.json(owner.pathway);
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
    const owner = await getOwnedPathway(pathwayId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Pathway not found" }); return; }

    await db.update(pathwaysTable)
      .set({ isSelected: "false" })
      .where(eq(pathwaysTable.profileId, owner.pathway.profileId));

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
