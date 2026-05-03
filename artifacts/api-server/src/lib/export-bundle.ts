import {
  db,
  coursesTable,
  pathwaysTable,
  guidebooksTable,
  studentProgressTable,
  savedInternshipsTable,
  igetcProgressTable,
  type StudentProfile,
  type Course,
  type Pathway,
  type StudentProgress,
  type SavedInternship,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

export interface ProfileBundle {
  profile: StudentProfile;
  courses: Course[];
  pathways: Pathway[];
  selectedPathway: Pathway | null;
  guidebookMarkdown: string | null;
  progress: StudentProgress[];
  savedInternships: SavedInternship[];
  igetcAreas: Record<string, boolean>;
  derived: {
    estimatedGpa: number | null;
    completedUnits: number;
    inProgressUnits: number;
    plannedUnits: number;
    totalUnits: number;
    igetcCompleted: number;
    igetcTotal: number;
    upcomingDeadlines: { label: string; date: string; source: string }[];
  };
}

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

const IGETC_AREAS = ["1a", "1b", "1c", "2a", "3a", "3b", "4", "5a", "5b", "5c", "6a"];

export async function buildProfileBundle(profile: StudentProfile): Promise<ProfileBundle> {
  const [courses, pathways, progress, savedInternships, igetcRows] = await Promise.all([
    db.select().from(coursesTable).where(eq(coursesTable.profileId, profile.id)),
    db.select().from(pathwaysTable).where(eq(pathwaysTable.profileId, profile.id)),
    db.select().from(studentProgressTable).where(eq(studentProgressTable.profileId, profile.id)).orderBy(desc(studentProgressTable.createdAt)),
    db.select().from(savedInternshipsTable).where(eq(savedInternshipsTable.profileId, profile.id)),
    db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, profile.id)),
  ]);

  const selectedPathway = pathways.find((p) => p.isSelected === "true") ?? null;

  let guidebookMarkdown: string | null = null;
  if (selectedPathway) {
    const gb = await db.select().from(guidebooksTable)
      .where(eq(guidebooksTable.pathwayId, selectedPathway.id))
      .orderBy(desc(guidebooksTable.createdAt))
      .limit(1);
    if (gb.length > 0) guidebookMarkdown = gb[0].contentMarkdown ?? null;
  }

  // GPA + units
  let totalPoints = 0;
  let totalUnitsForGpa = 0;
  let completedUnits = 0;
  let inProgressUnits = 0;
  let plannedUnits = 0;
  let totalUnits = 0;
  for (const c of courses) {
    const u = c.units ?? 3;
    totalUnits += u;
    if (c.status === "completed" && c.grade && GRADE_POINTS[c.grade] !== undefined) {
      totalPoints += GRADE_POINTS[c.grade] * u;
      totalUnitsForGpa += u;
      completedUnits += u;
    } else if (c.status === "in_progress") {
      inProgressUnits += u;
    } else if (c.status === "planned") {
      plannedUnits += u;
    }
  }
  const estimatedGpa = totalUnitsForGpa > 0 ? Math.round((totalPoints / totalUnitsForGpa) * 100) / 100 : null;

  const igetcAreas = igetcRows.length > 0 ? igetcRows[0].areas : {};
  const igetcCompleted = IGETC_AREAS.filter((a) => igetcAreas[a]).length;

  // Upcoming deadlines: pull from saved internships data + UC/CSU general dates
  const upcomingDeadlines: { label: string; date: string; source: string }[] = [];
  for (const si of savedInternships) {
    const data = si.internshipData as Record<string, unknown>;
    const deadline = data?.deadline as string | undefined;
    const title = (data?.title as string | undefined) ?? si.internshipSlug;
    if (deadline) upcomingDeadlines.push({ label: title, date: deadline, source: "Saved internship" });
  }
  const tt = profile.transferTimeline ?? "";
  if (tt.toLowerCase().includes("fall")) {
    upcomingDeadlines.push({ label: "UC application opens", date: "August 1", source: "UC Application" });
    upcomingDeadlines.push({ label: "UC application deadline", date: "November 30", source: "UC Application" });
    upcomingDeadlines.push({ label: "Cal State Apply deadline", date: "November 30", source: "CSU" });
    upcomingDeadlines.push({ label: "Cal Grant / FAFSA priority", date: "March 2", source: "CSAC / FAFSA" });
  }

  return {
    profile,
    courses,
    pathways,
    selectedPathway,
    guidebookMarkdown,
    progress,
    savedInternships,
    igetcAreas,
    derived: {
      estimatedGpa,
      completedUnits,
      inProgressUnits,
      plannedUnits,
      totalUnits,
      igetcCompleted,
      igetcTotal: IGETC_AREAS.length,
      upcomingDeadlines,
    },
  };
}

export const IGETC_AREA_NAMES: Record<string, string> = {
  "1a": "1A — English Composition",
  "1b": "1B — Critical Thinking / Composition",
  "1c": "1C — Oral Communication (CSU only)",
  "2a": "2A — Mathematical Concepts",
  "3a": "3A — Arts",
  "3b": "3B — Humanities",
  "4": "4 — Social and Behavioral Sciences",
  "5a": "5A — Physical Sciences",
  "5b": "5B — Biological Sciences",
  "5c": "5C — Lab Science",
  "6a": "6A — Language Other Than English (UC only)",
};

export const IGETC_AREA_KEYS = IGETC_AREAS;
