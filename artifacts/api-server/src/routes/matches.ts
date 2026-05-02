import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { calculateCompatibility, interpretScore } from "../services/scoringService.js";
import { db, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getOwnedProfile } from "../lib/ownership";

type University = typeof universities[number];

const router = Router();

// POST /api/profiles/:profileId/generate-matches
router.post("/profiles/:profileId/generate-matches", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const profile = owner.profile;
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, profileId));

    const studentData = {
      currentGpa: profile.currentGpa,
      intendedMajor: profile.intendedMajor,
      careerGoal: profile.careerGoal,
      financialSituation: profile.financialSituation,
      transferTimeline: profile.transferTimeline,
      geographicPreference: profile.geographicPreference,
      completedCourses: courses.map(c => c.courseName),
    };

    const matches = universities.map((uni: University) => {
      const result = calculateCompatibility(studentData, uni);
      const fit = interpretScore(result.total);

      return {
        universityId: uni.id,
        name: uni.name,
        system: uni.system,
        location: uni.location,
        compatibilityScore: result.total,
        fitLabel: fit.label,
        fitColor: fit.color,
        gpaRangeMin: uni.gpaRangeMin,
        gpaRangeRecommended: uni.gpaRangeRecommended,
        costCategory: uni.costCategory,
        transferFriendliness: uni.transferFriendliness,
        officialTransferUrl: uni.officialTransferUrl,
        notes: uni.notes,
        breakdown: result.breakdown,
        majors: uni.majors,
        careerTags: uni.careerTags,
      };
    }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(matches);
  } catch (err) {
    req.log.error({ err }, "Error generating matches");
    res.status(500).json({ error: "Failed to generate matches" });
  }
});

// GET /api/profiles/:profileId/matches — re-compute on the fly
router.get("/profiles/:profileId/matches", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const profile = owner.profile;
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, profileId));

    const studentData = {
      currentGpa: profile.currentGpa,
      intendedMajor: profile.intendedMajor,
      careerGoal: profile.careerGoal,
      financialSituation: profile.financialSituation,
      transferTimeline: profile.transferTimeline,
      geographicPreference: profile.geographicPreference,
      completedCourses: courses.map(c => c.courseName),
    };

    const matches = universities.map((uni: University) => {
      const result = calculateCompatibility(studentData, uni);
      const fit = interpretScore(result.total);

      return {
        universityId: uni.id,
        name: uni.name,
        system: uni.system,
        location: uni.location,
        compatibilityScore: result.total,
        fitLabel: fit.label,
        fitColor: fit.color,
        gpaRangeMin: uni.gpaRangeMin,
        gpaRangeRecommended: uni.gpaRangeRecommended,
        costCategory: uni.costCategory,
        transferFriendliness: uni.transferFriendliness,
        officialTransferUrl: uni.officialTransferUrl,
        notes: uni.notes,
        breakdown: result.breakdown,
        majors: uni.majors,
        careerTags: uni.careerTags,
      };
    }).sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    res.json(matches);
  } catch (err) {
    req.log.error({ err }, "Error fetching matches");
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

export default router;
