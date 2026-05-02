import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

export default router;
