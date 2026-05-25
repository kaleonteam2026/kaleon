import { Router } from "express";
import { db, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateTransferabilityAnalysis, generateCourseCatalog } from "../services/aiService.js";
import { getOwnedProfile, getOwnedCourse } from "../lib/ownership";
import { enforceAiCap } from "../lib/global-cap";
import { invalidateIgetcAnalysis } from "../lib/igetc-cache";
import { resolveAuthedLocale } from "../lib/locale.js";

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
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

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
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

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

    invalidateIgetcAnalysis(profileId);
    res.status(201).json(course[0]);
  } catch (err) {
    req.log.error({ err }, "Error adding course");
    res.status(500).json({ error: "Failed to add course" });
  }
});

// POST /api/profiles/:profileId/courses/bulk
router.post("/profiles/:profileId/courses/bulk", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) {
      res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" });
      return;
    }
    const body = req.body as { courses?: unknown };
    if (!Array.isArray(body.courses) || body.courses.length === 0) {
      res.status(400).json({ error: "courses array required" });
      return;
    }
    type RawCourse = { courseCode?: unknown; courseName?: unknown; units?: unknown; status?: unknown };
    const values = (body.courses as RawCourse[]).slice(0, 150).map(c => ({
      profileId,
      courseCode: typeof c.courseCode === "string" ? c.courseCode : undefined,
      courseName: typeof c.courseName === "string" && c.courseName
        ? c.courseName
        : typeof c.courseCode === "string" ? c.courseCode : "Unknown",
      units: typeof c.units === "number" ? c.units : undefined,
      status: typeof c.status === "string" ? c.status : "completed",
    }));
    const inserted = await db.insert(coursesTable).values(values).returning();
    invalidateIgetcAnalysis(profileId);
    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Error bulk-adding courses");
    res.status(500).json({ error: "Failed to bulk-add courses" });
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
    const owner = await getOwnedCourse(courseId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Course not found" }); return; }

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

    invalidateIgetcAnalysis(owner.course.profileId);
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
    const owner = await getOwnedCourse(courseId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Course not found" }); return; }

    await db.delete(coursesTable).where(eq(coursesTable.id, courseId));
    invalidateIgetcAnalysis(owner.course.profileId);
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
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

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

// Per-user hourly rate limit for catalog and transferability endpoints
const CATALOG_PER_USER_HOURLY = 3;
const catalogRateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkCatalogRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = catalogRateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    catalogRateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= CATALOG_PER_USER_HOURLY) return false;
  entry.count++;
  return true;
}

const TRANSFER_PER_USER_HOURLY = 3;
const transferRateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkTransferRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = transferRateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    transferRateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= TRANSFER_PER_USER_HOURLY) return false;
  entry.count++;
  return true;
}

router.get("/profiles/:profileId/course-catalog", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profileId = parseInt(req.params.profileId);

  try {
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const profile = owner.profile;

    if (!profile.communityCollege) {
      res.status(400).json({ error: "Please complete your profile with your community college before loading the course catalog." });
      return;
    }

    const college = profile.communityCollege;
    const major = profile.intendedMajor ?? "General Education";
    const locale = resolveAuthedLocale(profile, req);
    const cacheKey = `${college}::${major}::${locale}`;

    const cached = catalogCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < CATALOG_TTL) {
      res.json(cached.data);
      return;
    }

    // Rate limit only applies when an actual AI call is about to be made
    if (!checkCatalogRateLimit(req.user.id)) {
      res.status(429).json({ error: `Rate limit exceeded. You can request up to ${CATALOG_PER_USER_HOURLY} course catalogs per hour. Please try again later.` });
      return;
    }

    const cap = await enforceAiCap(req.user.id, "course-catalog");
    if (!cap.allowed) {
      res.status(cap.status).json({ error: cap.error });
      return;
    }

    const catalog = await generateCourseCatalog(college, major, locale);
    catalogCache.set(cacheKey, { data: catalog, cachedAt: Date.now() });
    res.json(catalog);
  } catch (err) {
    req.log.error({ err }, "Error generating course catalog");
    res.status(500).json({ error: "Failed to generate course catalog" });
  }
});

// POST /api/profiles/:profileId/transferability-analysis
// Rate-limit: one AI call per profile per 10 minutes (plus per-user hourly cap)
const transferabilityCache = new Map<string, { data: unknown; cachedAt: number }>();
const TRANSFER_TTL = 10 * 60 * 1000;

router.post("/profiles/:profileId/transferability-analysis", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const profileId = parseInt(req.params.profileId);

  try {
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    // Check cache (after ownership check to avoid leaking cached data to non-owners)
    const profile = owner.profile;
    const locale = resolveAuthedLocale(profile, req);
    const cacheKey = `${profileId}::${locale}`;
    const cached = transferabilityCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < TRANSFER_TTL) {
      res.json(cached.data);
      return;
    }

    // Fetch all courses
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, profileId));
    if (courses.length === 0) {
      res.status(400).json({ error: "No courses found. Add your courses before running the analysis." });
      return;
    }

    // Rate limit only applies when an actual AI call is about to be made
    if (!checkTransferRateLimit(req.user.id)) {
      res.status(429).json({ error: `Rate limit exceeded. You can request up to ${TRANSFER_PER_USER_HOURLY} transferability analyses per hour. Please try again later.` });
      return;
    }

    const cap = await enforceAiCap(req.user.id, "transferability");
    if (!cap.allowed) {
      res.status(cap.status).json({ error: cap.error });
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

    const result = await generateTransferabilityAnalysis(coursesData, communityCollege, locale);
    transferabilityCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error generating transferability analysis");
    res.status(500).json({ error: "Failed to generate transferability analysis" });
  }
});

export default router;
