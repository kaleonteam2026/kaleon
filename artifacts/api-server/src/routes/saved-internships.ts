import { Router } from "express";
import { db, savedInternshipsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/profiles/:profileId/saved-internships", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const rows = await db.select().from(savedInternshipsTable).where(eq(savedInternshipsTable.profileId, profileId));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching saved internships");
    res.status(500).json({ error: "Failed to fetch saved internships" });
  }
});

router.post("/profiles/:profileId/saved-internships", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const { internshipSlug, internshipData } = req.body as { internshipSlug: string; internshipData: Record<string, unknown> };
    const existing = await db.select().from(savedInternshipsTable)
      .where(and(eq(savedInternshipsTable.profileId, profileId), eq(savedInternshipsTable.internshipSlug, internshipSlug)));
    if (existing.length > 0) { res.json(existing[0]); return; }
    const [row] = await db.insert(savedInternshipsTable).values({ profileId, internshipSlug, internshipData }).returning();
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Error saving internship");
    res.status(500).json({ error: "Failed to save internship" });
  }
});

router.delete("/profiles/:profileId/saved-internships/:slug", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const internshipSlug = req.params.slug;
    await db.delete(savedInternshipsTable)
      .where(and(eq(savedInternshipsTable.profileId, profileId), eq(savedInternshipsTable.internshipSlug, internshipSlug)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error removing saved internship");
    res.status(500).json({ error: "Failed to remove saved internship" });
  }
});

export default router;
