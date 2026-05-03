import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { generateCampusOpportunities, generateCCOpportunities } from "../services/aiService.js";
import { getOwnedProfile } from "../lib/ownership";
import { incrementGlobalAi, globalCapMessage } from "../lib/global-cap";

const router = Router();

// Simple in-memory cache so each entry is only fetched once per server lifetime
const opportunitiesCache = new Map<string, { data: unknown; cachedAt: number }>();
const ccOppsCache = new Map<string, { data: unknown; cachedAt: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Per-user hourly rate limit for CC campus opportunities (profile-keyed, mutable fields)
const CC_OPPS_PER_USER_HOURLY = 3;
const ccOppsRateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkCCOppsRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = ccOppsRateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    ccOppsRateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= CC_OPPS_PER_USER_HOURLY) return false;
  entry.count++;
  return true;
}

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

  // Check cache — keyed by fixed curated university ID, 24-hour TTL
  const cached = opportunitiesCache.get(uniId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
    res.json(cached.data);
    return;
  }

  const cap = await incrementGlobalAi();
  if (!cap.allowed) {
    res.status(429).json({ error: globalCapMessage(cap.cap) });
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
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const profile = owner.profile;
    const collegeName = profile.communityCollege ?? "a California community college";
    const major = profile.intendedMajor ?? "General Studies";
    const city = "California";

    const cacheKey = `${collegeName}__${major}`;
    const cached = ccOppsCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      res.json(cached.data);
      return;
    }

    // Rate limit only applies when an actual AI call is about to be made
    if (!checkCCOppsRateLimit(req.user.id)) {
      res.status(429).json({ error: `Rate limit exceeded. You can request up to ${CC_OPPS_PER_USER_HOURLY} CC opportunity lookups per hour. Please try again later.` });
      return;
    }

    const cap = await incrementGlobalAi();
    if (!cap.allowed) {
      res.status(429).json({ error: globalCapMessage(cap.cap) });
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
