import { Router } from "express";
import {
  db, coursesTable, pathwaysTable, internshipSearchesTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateInternshipMatches } from "../services/aiService.js";
import { getRequestLocale } from "../lib/locale.js";
import { enforceAiCap } from "../lib/global-cap";
import { getOwnedProfile } from "../lib/ownership";

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

// POST /api/profiles/:profileId/internships/search
router.post("/profiles/:profileId/internships/search", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: "Rate limit reached. Up to 5 searches per hour." });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const [courses, pathways] = await Promise.all([
      db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId)),
      db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId)),
    ]);

    const cap = await enforceAiCap(req.user.id, "internships-search");
    if (!cap.allowed) { res.status(cap.status).json({ error: cap.error }); return; }

    const profile = owner.profile;
    const selectedPathway = pathways.find(p => p.isSelected === "true") ?? null;

    const result = await generateInternshipMatches(
      profile as unknown as Record<string, unknown>,
      courses as unknown as Record<string, unknown>[],
      selectedPathway ? (selectedPathway.reportJson as Record<string, unknown>) : null,
      getRequestLocale(req),
    );

    const saved = await db.insert(internshipSearchesTable).values({
      profileId,
      resultsJson: result as unknown as Record<string, unknown>,
      summary: (result as { summary?: string }).summary ?? null,
    }).returning();

    res.json(saved[0]);
  } catch (err) {
    req.log.error({ err }, "Error generating internship matches");
    res.status(500).json({ error: "Failed to generate internship matches. Please try again." });
  }
});

// GET /api/profiles/:profileId/internships/searches
router.get("/profiles/:profileId/internships/searches", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const searches = await db.select().from(internshipSearchesTable)
      .where(eq(internshipSearchesTable.profileId, profileId))
      .orderBy(desc(internshipSearchesTable.createdAt));
    res.json(searches);
  } catch (err) {
    req.log.error({ err }, "Error fetching internship searches");
    res.status(500).json({ error: "Failed to fetch searches" });
  }
});

export default router;
