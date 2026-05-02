import { Router } from "express";
import { db, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOwnedProfile } from "../lib/ownership";

const router = Router();

// POST /api/profiles
router.post("/profiles", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const userId = req.user.id;
    const body = req.body as Record<string, unknown>;

    const profile = await db.insert(studentProfilesTable).values({
      userId,
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
