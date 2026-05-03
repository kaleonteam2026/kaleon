import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, coursesTable, guidebooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateGuidebook } from "../services/aiService.js";
import { incrementGlobalAi, globalCapMessage } from "../lib/global-cap";
import { getOwnedPathway, getOwnedGuidebook, getOwnedProfile } from "../lib/ownership";
import { resolveAuthedLocale } from "../lib/locale";

const router = Router();

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

// POST /api/pathways/:pathwayId/generate-guidebook
router.post("/pathways/:pathwayId/generate-guidebook", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: `Rate limit exceeded. You can generate up to ${PER_USER_HOURLY} guidebooks per hour.` });
    return;
  }

  try {
    const pathwayId = parseInt(req.params.pathwayId);
    const owner = await getOwnedPathway(pathwayId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Pathway not found" }); return; }

    const cap = await incrementGlobalAi();
    if (!cap.allowed) { res.status(429).json({ error: globalCapMessage(cap.cap) }); return; }

    const pathway = owner.pathway;
    const profile = owner.profile;
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, pathway.profileId));

    const locale = resolveAuthedLocale(profile, req);
    const markdown = await generateGuidebook(
      profile as unknown as Record<string, unknown>,
      pathway.reportJson as Record<string, unknown> ?? {},
      courses as unknown as Record<string, unknown>[],
      (scholarships as unknown as Record<string, unknown>[]).slice(0, 15),
      (opportunities as unknown as Record<string, unknown>[]).slice(0, 10),
      locale
    );

    const report = pathway.reportJson as Record<string, unknown> | null;
    const university = typeof report?.university === "string" ? report.university : "Unknown";
    const title = `Pathwise CC Guidebook — ${profile.fullName ?? "Student"} → ${university}`;

    const guidebook = await db.insert(guidebooksTable).values({
      pathwayId,
      profileId: pathway.profileId,
      contentMarkdown: markdown,
      title,
    }).returning();

    res.json(guidebook[0]);
  } catch (err) {
    req.log.error({ err }, "Error generating guidebook");
    res.status(500).json({ error: "Failed to generate guidebook. Please try again." });
  }
});

// GET /api/guidebooks/:guidebookId
router.get("/guidebooks/:guidebookId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const guidebookId = parseInt(req.params.guidebookId);
    const owner = await getOwnedGuidebook(guidebookId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Guidebook not found" }); return; }

    res.json(owner.guidebook);
  } catch (err) {
    req.log.error({ err }, "Error fetching guidebook");
    res.status(500).json({ error: "Failed to fetch guidebook" });
  }
});

// DELETE /api/guidebooks/:guidebookId
router.delete("/guidebooks/:guidebookId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const guidebookId = parseInt(req.params.guidebookId);
    const owner = await getOwnedGuidebook(guidebookId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Guidebook not found" }); return; }

    await db.delete(guidebooksTable).where(eq(guidebooksTable.id, guidebookId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting guidebook");
    res.status(500).json({ error: "Failed to delete guidebook" });
  }
});

// GET /api/profiles/:profileId/guidebooks
router.get("/profiles/:profileId/guidebooks", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const guidebooks = await db.select().from(guidebooksTable)
      .where(eq(guidebooksTable.profileId, profileId));
    res.json(guidebooks);
  } catch (err) {
    req.log.error({ err }, "Error fetching guidebooks");
    res.status(500).json({ error: "Failed to fetch guidebooks" });
  }
});

export default router;
