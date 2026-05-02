import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { generateCampusOpportunities, generateCCOpportunities } from "../services/aiService.js";
import { db, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Simple in-memory cache so each entry is only fetched once per server lifetime
const opportunitiesCache = new Map<string, { data: unknown; cachedAt: number }>();
const ccOppsCache = new Map<string, { data: unknown; cachedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// GET /api/universities
router.get("/universities", (_req, res) => {
  const list = (universities as typeof universities).map(u => ({
    id: u.id,
    name: u.name,
    system: u.system,
    location: u.location,
  }));
  res.json(list);
});

// GET /api/universities/:uniId/campus-opportunities
router.get("/universities/:uniId/campus-opportunities", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const uniId = req.params.uniId;
  const uni = (universities as typeof universities).find(u => u.id === uniId);

  if (!uni) {
    res.status(404).json({ error: "University not found" });
    return;
  }

  // Check cache
  const cached = opportunitiesCache.get(uniId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    const data = await generateCampusOpportunities(uni.name, uni.system, uni.location);
    opportunitiesCache.set(uniId, { data, cachedAt: Date.now() });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error generating campus opportunities");
    res.status(500).json({ error: "Failed to generate campus opportunities" });
  }
});

// GET /api/profiles/:profileId/cc-campus-opportunities
router.get("/profiles/:profileId/cc-campus-opportunities", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const profileId = parseInt(req.params.profileId);
    const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId));
    if (profiles.length === 0) { res.status(404).json({ error: "Profile not found" }); return; }

    const profile = profiles[0];
    const collegeName = profile.communityCollege ?? "a California community college";
    const major = profile.intendedMajor ?? "General Studies";
    const city = "California";

    const cacheKey = `${collegeName}__${major}`;
    const cached = ccOppsCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    const data = await generateCCOpportunities(collegeName, major, city);
    ccOppsCache.set(cacheKey, { data, cachedAt: Date.now() });
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Error generating CC campus opportunities");
    res.status(500).json({ error: "Failed to generate CC campus opportunities" });
  }
});

export default router;
