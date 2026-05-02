import { Router } from "express";
import { db, coursesTable, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateTransferabilityAnalysis, generateCourseCatalog } from "../services/aiService.js";

const router = Router();

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

// GET /api/profiles/:profileId/courses
router.get("/profiles/:profileId/courses", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, profileId));
    res.json(courses);
  } catch (err) {
    req.log.error({ err }, "Error fetching courses");
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

// POST /api/profiles/:profileId/courses
router.post("/profiles/:profileId/courses", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const body = req.body as Record<string, unknown>;

    const course = await db.insert(coursesTable).values({
      profileId,
      courseCode: body.courseCode as string | undefined,
      courseName: body.courseName as string,
      units: body.units as number | undefined,
      grade: body.grade as string | undefined,
      status: body.status as string | undefined,
      term: body.term as string | undefined,
    }).returning();

    res.status(201).json(course[0]);
  } catch (err) {
    req.log.error({ err }, "Error adding course");
    res.status(500).json({ error: "Failed to add course" });
  }
});

// PATCH /api/courses/:courseId
router.patch("/courses/:courseId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const courseId = parseInt(req.params.courseId);
    const body = req.body as Record<string, unknown>;

    const updated = await db.update(coursesTable)
      .set({
        courseCode: body.courseCode as string | undefined,
        courseName: body.courseName as string | undefined,
        units: body.units as number | undefined,
        grade: body.grade as string | undefined,
        status: body.status as string | undefined,
        term: body.term as string | undefined,
      })
      .where(eq(coursesTable.id, courseId))
      .returning();

    res.json(updated[0]);
  } catch (err) {
    req.log.error({ err }, "Error updating course");
    res.status(500).json({ error: "Failed to update course" });
  }
});

// DELETE /api/courses/:courseId
router.delete("/courses/:courseId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const courseId = parseInt(req.params.courseId);
    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting course");
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// GET /api/profiles/:profileId/gpa-summary
router.get("/profiles/:profileId/gpa-summary", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const courses = await db.select().from(coursesTable)
      .where(eq(coursesTable.profileId, profileId));

    let totalPoints = 0;
    let totalUnitsForGpa = 0;
    let totalUnits = 0;
    let completedUnits = 0;
    let inProgressUnits = 0;

    for (const course of courses) {
      const units = course.units ?? 3;
      totalUnits += units;

      if (course.status === "completed" && course.grade) {
        const points = GRADE_POINTS[course.grade];
        if (points !== undefined) {
          totalPoints += points * units;
          totalUnitsForGpa += units;
          completedUnits += units;
        }
      } else if (course.status === "in_progress") {
        inProgressUnits += units;
      }
    }

    const estimatedGpa = totalUnitsForGpa > 0
      ? Math.round((totalPoints / totalUnitsForGpa) * 100) / 100
      : 0;

    res.json({
      estimatedGpa,
      totalUnits,
      completedUnits,
      inProgressUnits,
      courseCount: courses.length,
    });
  } catch (err) {
    req.log.error({ err }, "Error calculating GPA summary");
    res.status(500).json({ error: "Failed to calculate GPA summary" });
  }
});

// GET /api/profiles/:profileId/course-catalog
// Cached per (college, major) pair — 24 hrs since catalogs rarely change
const catalogCache = new Map<string, { data: unknown; cachedAt: number }>();
const CATALOG_TTL = 24 * 60 * 60 * 1000;

router.get("/profiles/:profileId/course-catalog", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profileId = parseInt(req.params.profileId);

  try {
    const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId));
    if (!profiles.length) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const profile = profiles[0];

    if (!profile.communityCollege) {
      res.status(400).json({ error: "Please complete your profile with your community college before loading the course catalog." });
      return;
    }

    const college = profile.communityCollege;
    const major = profile.intendedMajor ?? "General Education";
    const cacheKey = `${college}::${major}`;

    const cached = catalogCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CATALOG_TTL) {
      res.json(cached.data);
      return;
    }

    const catalog = await generateCourseCatalog(college, major);
    catalogCache.set(cacheKey, { data: catalog, cachedAt: Date.now() });
    res.json(catalog);
  } catch (err) {
    req.log.error({ err }, "Error generating course catalog");
    res.status(500).json({ error: "Failed to generate course catalog" });
  }
});

// POST /api/profiles/:profileId/transferability-analysis
// Rate-limit: one AI call per profile per 10 minutes
const transferabilityCache = new Map<number, { data: unknown; cachedAt: number }>();
const TRANSFER_TTL = 10 * 60 * 1000;

router.post("/profiles/:profileId/transferability-analysis", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profileId = parseInt(req.params.profileId);

  // Check cache
  const cached = transferabilityCache.get(profileId);
  if (cached && Date.now() - cached.cachedAt < TRANSFER_TTL) {
    res.json(cached.data);
    return;
  }

  try {
    // Fetch profile for community college name
    const profiles = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, profileId));
    if (!profiles.length) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }
    const profile = profiles[0];

    // Fetch all courses
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId));
    if (courses.length === 0) {
      res.status(400).json({ error: "No courses found. Add your courses before running the analysis." });
      return;
    }

    const communityCollege = profile.communityCollege ?? "a California community college";
    const coursesData = courses.map(c => ({
      courseCode: c.courseCode,
      courseName: c.courseName,
      units: c.units ?? 3,
      grade: c.grade,
      status: c.status,
      term: c.term,
    }));

    const result = await generateTransferabilityAnalysis(coursesData, communityCollege);
    transferabilityCache.set(profileId, { data: result, cachedAt: Date.now() });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error generating transferability analysis");
    res.status(500).json({ error: "Failed to generate transferability analysis" });
  }
});

export default router;
