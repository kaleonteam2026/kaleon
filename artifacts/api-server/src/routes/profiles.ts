import { Router } from "express";
import { db, studentProfilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { getOwnedProfile } from "../lib/ownership";
import { getRequestLocale } from "../lib/locale";

const router = Router();

const SUPPORTED_LOCALES = new Set(["en", "es", "zh", "vi", "tl", "ko", "ar", "ru", "fa"]);

// GET /api/me/locale — current user's stored locale (or null if no profile yet)
router.get("/me/locale", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const rows = await db
      .select({ preferredLocale: studentProfilesTable.preferredLocale })
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, req.user.id))
      .orderBy(desc(studentProfilesTable.updatedAt))
      .limit(1);
    res.json({ locale: rows[0]?.preferredLocale ?? null });
  } catch (err) {
    req.log.error({ err }, "Error fetching user locale");
    res.status(500).json({ error: "Failed to fetch locale" });
  }
});

// PATCH /api/me/locale — persist locale on every profile owned by the user
router.patch("/me/locale", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const body = req.body as { locale?: unknown };
    const requested = typeof body?.locale === "string" ? body.locale : getRequestLocale(req);
    if (!SUPPORTED_LOCALES.has(requested)) {
      res.status(400).json({ error: "Unsupported locale" }); return;
    }
    await db
      .update(studentProfilesTable)
      .set({ preferredLocale: requested, updatedAt: new Date() })
      .where(eq(studentProfilesTable.userId, req.user.id));
    res.json({ locale: requested });
  } catch (err) {
    req.log.error({ err }, "Error updating user locale");
    res.status(500).json({ error: "Failed to update locale" });
  }
});

// POST /api/profiles
router.post("/profiles", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;

    const requestLocale = getRequestLocale(req);
    const profile = await db.insert(studentProfilesTable).values({
      userId,
      preferredLocale: requestLocale,
      fullName: body.fullName as string | undefined,
      communityCollege: body.communityCollege as string | undefined,
      currentGpa: body.currentGpa as number | undefined,
      intendedMajor: body.intendedMajor as string | undefined,
      careerGoal: body.careerGoal as string | undefined,
      financialSituation: body.financialSituation as string | undefined,
      transferTimeline: body.transferTimeline as string | undefined,
      geographicPreference: body.geographicPreference as string | undefined,
      targetUniversities: body.targetUniversities as string[] | undefined,
      longTermAspirations: body.longTermAspirations as string | undefined,
      isFirstGen: body.isFirstGen as string | undefined,
      interests: body.interests as string[] | undefined,
      completionPercent: 0,
    }).returning();

    res.status(201).json(profile[0]);
  } catch (err) {
    req.log.error({ err }, "Error creating profile");
    res.status(500).json({ error: "Failed to create profile" });
  }
});

// GET /api/profiles/user/:userId
router.get("/profiles/user/:userId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (req.params.userId !== req.user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    const profiles = await db.select().from(studentProfilesTable)
      .where(eq(studentProfilesTable.userId, req.params.userId));
    res.json(profiles);
  } catch (err) {
    req.log.error({ err }, "Error fetching profiles");
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
});

// GET /api/profiles/:id
router.get("/profiles/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const owner = await getOwnedProfile(id, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    res.json(owner.profile);
  } catch (err) {
    req.log.error({ err }, "Error fetching profile");
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// PATCH /api/profiles/:id
router.patch("/profiles/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const body = req.body as Record<string, unknown>;

    // Calculate completion percent
    const fields = [
      body.fullName, body.communityCollege, body.currentGpa,
      body.intendedMajor, body.careerGoal, body.financialSituation,
      body.transferTimeline, body.geographicPreference,
    ];

    const owner = await getOwnedProfile(id, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const merged = { ...owner.profile, ...body };
    const allFields = [
      merged.fullName, merged.communityCollege, merged.currentGpa,
      merged.intendedMajor, merged.careerGoal, merged.financialSituation,
      merged.transferTimeline, merged.geographicPreference,
    ];
    const filled = allFields.filter(f => f !== null && f !== undefined && f !== "").length;
    const completionPercent = Math.round((filled / allFields.length) * 100);

    void fields;
    const updated = await db.update(studentProfilesTable)
      .set({
        fullName: body.fullName as string | undefined,
        communityCollege: body.communityCollege as string | undefined,
        currentGpa: body.currentGpa as number | undefined,
        intendedMajor: body.intendedMajor as string | undefined,
        careerGoal: body.careerGoal as string | undefined,
        financialSituation: body.financialSituation as string | undefined,
        transferTimeline: body.transferTimeline as string | undefined,
        geographicPreference: body.geographicPreference as string | undefined,
        targetUniversities: body.targetUniversities as string[] | undefined,
        longTermAspirations: body.longTermAspirations as string | undefined,
        isFirstGen: body.isFirstGen as string | undefined,
        interests: body.interests as string[] | undefined,
        completionPercent: body.completionPercent as number ?? completionPercent,
        updatedAt: new Date(),
      })
      .where(eq(studentProfilesTable.id, id))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Error updating profile");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// DELETE /api/profiles/:id
router.delete("/profiles/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    const owner = await getOwnedProfile(id, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    await db.delete(studentProfilesTable).where(eq(studentProfilesTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting profile");
    res.status(500).json({ error: "Failed to delete profile" });
  }
});

export default router;
