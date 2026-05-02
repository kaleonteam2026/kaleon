import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { db, studentProfilesTable, coursesTable, pathwaysTable, guidebooksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { calculateCompatibility, interpretScore } from "../services/scoringService.js";

const router = Router();

// GET /api/dashboard-summary/:profileId
router.get("/dashboard-summary/:profileId", async (req, res) => {
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
    const [courses, pathways, guidebooks] = await Promise.all([
      db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId)),
      db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId)),
      db.select().from(guidebooksTable).where(eq(guidebooksTable.profileId, profileId)),
    ]);

    const completedCourses = courses.filter(c => c.status === "completed");
    const inProgressCourses = courses.filter(c => c.status === "in_progress");

    const GRADE_POINTS: Record<string, number> = {
      "A+": 4.0, "A": 4.0, "A-": 3.7, "B+": 3.3, "B": 3.0, "B-": 2.7,
      "C+": 2.3, "C": 2.0, "C-": 1.7, "D+": 1.3, "D": 1.0, "F": 0.0,
    };
    let totalPoints = 0, totalUnitsForGpa = 0;
    for (const c of completedCourses) {
      if (c.grade && GRADE_POINTS[c.grade] !== undefined) {
        const units = c.units ?? 3;
        totalPoints += GRADE_POINTS[c.grade] * units;
        totalUnitsForGpa += units;
      }
    }
    const estimatedGpa = totalUnitsForGpa > 0
      ? Math.round((totalPoints / totalUnitsForGpa) * 100) / 100
      : null;

    const studentData = {
      currentGpa: profile.currentGpa,
      intendedMajor: profile.intendedMajor,
      careerGoal: profile.careerGoal,
      financialSituation: profile.financialSituation,
      transferTimeline: profile.transferTimeline,
      geographicPreference: profile.geographicPreference,
    };

    let topMatchUniversity: string | null = null;
    let topMatchScore: number | null = null;

    if (profile.intendedMajor || profile.careerGoal) {
      const best = (universities as typeof universities)
        .map(uni => ({
          name: uni.name,
          score: calculateCompatibility(studentData, uni).total,
        }))
        .sort((a, b) => b.score - a.score)[0];
      if (best) {
        topMatchUniversity = best.name;
        topMatchScore = best.score;
      }
    }

    const nextActions: string[] = [];
    if (!profile.fullName) nextActions.push("Complete your student profile to get personalized recommendations");
    if (courses.length === 0) nextActions.push("Add your courses to track your progress and GPA");
    if (courses.length > 0 && pathways.length === 0) nextActions.push("Generate AI pathway recommendations based on your profile");
    if (pathways.length > 0 && !pathways.some(p => p.isSelected === "true")) nextActions.push("Review your pathway options and select your preferred pathway");
    if (pathways.some(p => p.isSelected === "true") && guidebooks.length === 0) nextActions.push("Generate your personalized guidebook for the selected pathway");
    if (guidebooks.length > 0) nextActions.push("Review and download your guidebook, then verify requirements with your counselor");
    if (nextActions.length === 0) nextActions.push("Check your guidebook for upcoming deadlines and action items");

    res.json({
      profileCompletionPercent: profile.completionPercent ?? 0,
      totalCourses: courses.length,
      completedCourses: completedCourses.length,
      inProgressCourses: inProgressCourses.length,
      estimatedGpa,
      savedPathwaysCount: pathways.length,
      guidebooksCount: guidebooks.length,
      topMatchUniversity,
      topMatchScore,
      nextActions,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

export default router;
