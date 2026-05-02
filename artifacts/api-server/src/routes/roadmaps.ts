import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, studentProfilesTable, coursesTable, pathwaysTable, academicRoadmapsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateAcademicRoadmap } from "../services/aiService.js";

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

// POST /api/pathways/:pathwayId/generate-roadmap
router.post("/pathways/:pathwayId/generate-roadmap", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: "Rate limit exceeded. You can generate up to 5 roadmaps per hour." });
    return;
  }

  try {
    const pathwayId = parseInt(req.params.pathwayId);
    const pathways = await db.select().from(pathwaysTable).where(eq(pathwaysTable.id, pathwayId));

    if (pathways.length === 0) {
      res.status(404).json({ error: "Pathway not found" });
      return;
    }

    const pathway = pathways[0];
    const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, pathway.profileId));

    if (profiles.length === 0) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    const profile = profiles[0];
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, pathway.profileId));

    const markdown = await generateAcademicRoadmap(
      profile as unknown as Record<string, unknown>,
      pathway.reportJson as Record<string, unknown> ?? {},
      courses as unknown as Record<string, unknown>[],
      (scholarships as unknown as Record<string, unknown>[]).slice(0, 15),
      (opportunities as unknown as Record<string, unknown>[]).slice(0, 10)
    );

    const report = pathway.reportJson as Record<string, unknown> | null;
    const university = typeof report?.university === "string" ? report.university : "Unknown";
    const title = `Academic Roadmap — ${profile.fullName ?? "Student"} → ${university}`;

    const roadmap = await db.insert(academicRoadmapsTable).values({
      pathwayId,
      profileId: pathway.profileId,
      contentMarkdown: markdown,
      title,
    }).returning();

    res.json(roadmap[0]);
  } catch (err) {
    req.log.error({ err }, "Error generating academic roadmap");
    res.status(500).json({ error: "Failed to generate academic roadmap. Please try again." });
  }
});

// GET /api/roadmaps/:roadmapId
router.get("/roadmaps/:roadmapId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const roadmaps = await db.select().from(academicRoadmapsTable).where(eq(academicRoadmapsTable.id, roadmapId));

    if (roadmaps.length === 0) {
      res.status(404).json({ error: "Roadmap not found" });
      return;
    }

    res.json(roadmaps[0]);
  } catch (err) {
    req.log.error({ err }, "Error fetching roadmap");
    res.status(500).json({ error: "Failed to fetch roadmap" });
  }
});

// GET /api/profiles/:profileId/roadmaps
router.get("/profiles/:profileId/roadmaps", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const roadmaps = await db.select().from(academicRoadmapsTable).where(eq(academicRoadmapsTable.id, profileId));
    res.json(roadmaps);
  } catch (err) {
    req.log.error({ err }, "Error fetching roadmaps" );
    res.status(500).json({ error: "Failed to fetch roadmaps" });
  }
});

export default router;
