import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { generateCampusOpportunities } from "../services/aiService.js";

const router = Router();

// Simple in-memory cache so each university is only fetched once per server lifetime
const opportunitiesCache = new Map<string, { data: unknown; cachedAt: number }>();
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

export default router;
