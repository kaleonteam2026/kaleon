import { Router } from "express";
import universities from "../data/universities.json" assert { type: "json" };
import { db, studentProfilesTable, coursesTable, pathwaysTable, guidebooksTable, studentProgressTable } from "@workspace/db";
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
    const [courses, pathways, guidebooks, progressEntries] = await Promise.all([
      db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId)),
      db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profileId)),
      db.select().from(guidebooksTable).where(eq(guidebooksTable.profileId, profileId)),
      db.select().from(studentProgressTable).where(eq(studentProgressTable.profileId, profileId)),
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

    // ── Transfer Readiness Score (0–100) ───────────────────────────────────────
    const totalUnits = courses.reduce((sum, c) => sum + (c.units ?? 3), 0);
    const profilePct = profile.completionPercent ?? 0;
    const profileScore = Math.round((profilePct / 100) * 20);          // 0–20
    const gpa = estimatedGpa ?? profile.currentGpa ?? 0;
    const gpaScore = gpa >= 3.7 ? 25 : gpa >= 3.3 ? 22 : gpa >= 3.0 ? 18 : gpa >= 2.7 ? 14 : gpa >= 2.4 ? 9 : gpa > 0 ? 5 : 0; // 0–25
    const unitsScore = totalUnits >= 60 ? 25 : totalUnits >= 45 ? 20 : totalUnits >= 30 ? 14 : totalUnits >= 15 ? 8 : totalUnits > 0 ? 3 : 0; // 0–25
    const hasSelected = pathways.some(p => p.isSelected === "true");
    const pathwayScore = hasSelected ? 15 : pathways.length > 0 ? 7 : 0;  // 0–15
    const guidebookScore = guidebooks.length > 0 ? 5 : 0;                // 0–5
    const progressScore = progressEntries.length >= 5 ? 10 : progressEntries.length >= 2 ? 6 : progressEntries.length >= 1 ? 3 : 0; // 0–10
    const readinessScore = Math.min(100, profileScore + gpaScore + unitsScore + pathwayScore + guidebookScore + progressScore);
    const readinessLabel = readinessScore >= 80 ? "Transfer Ready" : readinessScore >= 60 ? "Getting There" : readinessScore >= 40 ? "Building Momentum" : "Just Starting";

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
      readinessScore,
      readinessLabel,
      readinessBreakdown: {
        profile: profileScore,
        gpa: gpaScore,
        units: unitsScore,
        pathway: pathwayScore,
        guidebook: guidebookScore,
        progress: progressScore,
        totalUnits,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching dashboard summary");
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

export default router;
