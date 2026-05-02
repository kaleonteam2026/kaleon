import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/scholarships
router.get("/scholarships", async (_req, res) => {
  res.json(scholarships);
});

// GET /api/opportunities
router.get("/opportunities", async (_req, res) => {
  res.json(opportunities);
});

// POST /api/profiles/:profileId/recommended-scholarships
router.post("/profiles/:profileId/recommended-scholarships", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
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
    const gpa = profile.currentGpa ?? 0;
    const isFirstGen = profile.isFirstGen === "yes";
    const interests = (profile.interests ?? []) as string[];

    const filtered = scholarships.filter((s) => {
      const minGpa = s.minGpa as number | null;
      if (minGpa && gpa < minGpa - 0.2) return false;
      return true;
    });

    const scored = filtered.map((s) => {
      const tags = (s.eligibilityTags as string[]) ?? [];
      let score = 0;
      if (isFirstGen && tags.some(t => t.includes("first-gen"))) score += 20;
      if (tags.some(t => interests.some(i => i.toLowerCase().includes(t.toLowerCase())))) score += 10;
      if (tags.includes("transfer")) score += 5;
      if (tags.includes("california-resident")) score += 5;
      return { ...s, _relevanceScore: score };
    }).sort((a, b) => b._relevanceScore - a._relevanceScore);

    res.json(scored.slice(0, 20));
  } catch (err) {
    req.log.error({ err }, "Error fetching recommended scholarships");
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

// POST /api/profiles/:profileId/recommended-opportunities
router.post("/profiles/:profileId/recommended-opportunities", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
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
    const careerGoal = (profile.careerGoal ?? "").toLowerCase();
    const intendedMajor = (profile.intendedMajor ?? "").toLowerCase();
    const interests = (profile.interests ?? []) as string[];

    const scored = opportunities.map((opp) => {
      const tags = (opp.eligibilityTags as string[]) ?? [];
      let score = 0;
      if (tags.some(t => careerGoal.includes(t.toLowerCase()) || t.toLowerCase().includes(careerGoal.split(" ")[0] ?? ""))) score += 20;
      if (tags.some(t => intendedMajor.includes(t.toLowerCase()) || t.toLowerCase().includes(intendedMajor.split(" ")[0] ?? ""))) score += 15;
      if (tags.some(t => interests.some(i => i.toLowerCase().includes(t.toLowerCase())))) score += 10;
      if (tags.includes("all-majors")) score += 5;
      return { ...opp, _relevanceScore: score };
    }).sort((a, b) => b._relevanceScore - a._relevanceScore);

    res.json(scored.slice(0, 15));
  } catch (err) {
    req.log.error({ err }, "Error fetching recommended opportunities");
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

export default router;
