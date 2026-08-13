import { isSupabaseConfigured } from "@/lib/supabase";
import { computeGpaSummary, type StoredCourse } from "@/lib/course-progress";
import { appendDevCourses, deleteDevCompletedCoursesByCodes, getDevCourses } from "@/lib/dev-courses";
import { deleteAllDevPathways, getDevPathways, saveDevPathways, selectDevPathway, type DevPathway } from "@/lib/dev-pathways";
import { getDevProfiles, isAuthBypass, saveDevProfile } from "@/lib/dev-profile";
import {
  deriveCalgetcAreaStates,
  deriveCalgetcSummary,
  deriveIgetcAreaStates,
  deriveIgetcSummary,
  mapCourseToCalgetcArea,
  mapCourseToIgetcArea,
} from "@/lib/ge-requirements";
type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

type MockProfile = {
  id: number;
  userId: string;
  fullName: string;
  communityCollege: string;
  intendedMajor: string;
  careerGoal: string;
  currentGpa?: number;
  transferTimeline: string;
  financialSituation: string;
  isFirstGen: string;
  completionPercent: number;
};

const profile: MockProfile = {
  id: 1,
  userId: "dev",
  fullName: "Dev User",
  communityCollege: "",
  intendedMajor: "",
  careerGoal: "",
  transferTimeline: "",
  financialSituation: "",
  isFirstGen: "",
  completionPercent: 0,
};

let profileCourses: StoredCourse[] = [
];

function getActiveProfile(profileId: number) {
  if (isAuthBypass()) {
    const dev = getDevProfiles().find((item) => item.id === profileId) ?? getDevProfiles()[0];
    if (dev) {
      return {
        ...profile,
        ...dev,
        id: profileId,
      };
    }
  }
  return profile;
}

function persistProfileUpdate(profileId: number, updates: Record<string, unknown>) {
  if (isAuthBypass()) {
    const current = getActiveProfile(profileId);
    saveDevProfile({
      fullName: (updates.fullName as string | undefined) ?? current.fullName,
      communityCollege: (updates.communityCollege as string | undefined) ?? current.communityCollege,
      intendedMajor: (updates.intendedMajor as string | undefined) ?? current.intendedMajor,
      careerGoal: (updates.careerGoal as string | undefined) ?? current.careerGoal,
      currentGpa: (updates.currentGpa as number | undefined) ?? current.currentGpa,
      transferTimeline: (updates.transferTimeline as string | undefined) ?? current.transferTimeline,
      financialSituation: (updates.financialSituation as string | undefined) ?? current.financialSituation,
      isFirstGen: (updates.isFirstGen as string | undefined) ?? current.isFirstGen,
      completionPercent: (updates.completionPercent as number | undefined) ?? current.completionPercent,
    });
    return getActiveProfile(profileId);
  }

  Object.assign(profile, updates);
  return profile;
}

function getCoursesForProfile(profileId: number): StoredCourse[] {
  if (isAuthBypass()) return getDevCourses(profileId);
  return profileCourses;
}

function nextCourseId(courses: StoredCourse[]): number {
  return courses.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1;
}

function persistLatestGpa(profileId: number, latestGpa?: number): void {
  if (!(latestGpa && latestGpa > 0)) return;
  persistProfileUpdate(profileId, { currentGpa: latestGpa });
}

function appendCourses(profileId: number, incoming: Omit<StoredCourse, "id">[], latestGpa?: number): StoredCourse[] {
  if (isAuthBypass()) {
    persistLatestGpa(profileId, latestGpa);
    return appendDevCourses(profileId, incoming);
  }

  const seen = new Set(profileCourses.map(c => c.courseCode ?? c.courseName));
  let nextId = nextCourseId(profileCourses);
  for (const course of incoming) {
    const code = course.courseCode ?? course.courseName;
    if (seen.has(code)) continue;
    seen.add(code);
    profileCourses.push({ ...course, id: nextId++ });
  }
  persistLatestGpa(profileId, latestGpa);
  return profileCourses;
}

function createCourse(
  profileId: number,
  incoming: Omit<StoredCourse, "id">,
): StoredCourse | null {
  const before = getCoursesForProfile(profileId);
  const merged = appendCourses(profileId, [incoming]);
  const after = isAuthBypass() ? merged : getCoursesForProfile(profileId);

  if (after.length <= before.length) {
    return null;
  }

  return after[after.length - 1] ?? null;
}

function replaceCompletedCoursesByCodes(
  profileId: number,
  incoming: Omit<StoredCourse, "id">[],
  replaceCodes: string[],
  latestGpa?: number,
): StoredCourse[] {
  if (isAuthBypass()) {
    persistLatestGpa(profileId, latestGpa);
    deleteDevCompletedCoursesByCodes(profileId, replaceCodes);
    return appendDevCourses(profileId, incoming);
  }

  const normalized = new Set(
    replaceCodes
      .map((code) => code.trim().toUpperCase())
      .filter((code) => code.length > 0),
  );

  if (normalized.size > 0) {
    profileCourses = profileCourses.filter((course) => {
      const code = (course.courseCode ?? "").trim().toUpperCase();
      return !(course.status === "completed" && code && normalized.has(code));
    });
  }

  return appendCourses(profileId, incoming, latestGpa);
}

const pathways: DevPathway[] = [];

const progressEntries = [
  { id: 11, profileId: 1, note: "Met with counselor and confirmed major prep.", createdAt: new Date().toISOString() },
];

/** Pathways returned by the last DeepSeek generate call (dev pass-through). */
let generatedPathways: typeof pathways = [];

/** Last transferability analysis result, cached so the progress page can load it. */
let lastAnalysisResult: Record<string, unknown> = {
  communityCollege: "",
  summary: "",
  bestMatches: [],
  courseAnalysis: [],
  igetcSummary: deriveIgetcSummary([]),
  calgetcSummary: deriveCalgetcSummary([]),
  totalTransferableUnits: 0,
  recommendations: [],
};

function normalizeUnits(units: unknown): number | undefined {
  return typeof units === "number" && units > 0 ? units : undefined;
}

function inferTransferStatus(course: Omit<StoredCourse, "id">): "likely" | "uncertain" | "unlikely" {
  const label = (course.courseCode ?? course.courseName).toUpperCase().replace(/\s+/g, " ").trim();
  if (!normalizeUnits(course.units)) return "uncertain";
  if (/^(RDG|READ|BASIC|DEV|REMED|ESL|VOC|AUTO|COSM|CUL)\s/.test(label)) return "unlikely";
  if (/^(ENGL|COMM|PHIL|MATH|STAT|ART|MUS|DANC|THEA|FILM|PHOT|HIST|POLS|PSYC|SOC|ECON|ANTH|GEOG|BIOL|BIO|CHEM|PHYS|ASTR|GEOL|OCEA|PHS|SPAN|FREN|GERM|ITAL|CHIN|JAPN|KOR|CS|CIS|ENGR)\s/.test(label)) {
    return "likely";
  }
  return "uncertain";
}

function buildPreviewAnalysis(profileCoursesInput: Omit<StoredCourse, "id">[]) {
  const activeProfile = getActiveProfile(profile.id);
  const courseAnalysis = profileCoursesInput.map((course) => {
    const label = course.courseCode ?? course.courseName;
    const units = normalizeUnits(course.units);
    const status = inferTransferStatus(course);
    return {
      courseCode: course.courseCode ?? course.courseName,
      courseName: course.courseName,
      units,
      status,
      igetcArea: mapCourseToIgetcArea(label),
      csuGEArea: mapCourseToCalgetcArea(label),
      assistNote: status === "likely"
        ? "Looks like standard transfer-level coursework, but Kaleon still needs ASSIST.org or advisor review to confirm articulation."
        : status === "unlikely"
          ? "This course may not count as UC or CSU transfer credit and should be reviewed against ASSIST.org."
          : "Kaleon cannot confirm transferability from the saved course record alone. Review units and articulation before relying on this result.",
    };
  });

  const likelyTransferable = courseAnalysis.filter((course) => course.status === "likely");
  const missingUnitCount = courseAnalysis.filter((course) => course.units == null).length;

  return {
    communityCollege: activeProfile.communityCollege,
    summary: likelyTransferable.length > 0
      ? "Kaleon found some courses that look transfer-oriented, but this preview still needs ASSIST.org or counselor verification before you treat them as confirmed."
      : "Kaleon saved your course list, but this preview cannot confirm transfer credit from the available record yet.",
    bestMatches: [],
    courseAnalysis,
    igetcSummary: deriveIgetcSummary(profileCoursesInput),
    calgetcSummary: deriveCalgetcSummary(profileCoursesInput),
    totalTransferableUnits: likelyTransferable.reduce((sum, course) => sum + (course.units ?? 0), 0),
    recommendations: [
      ...(missingUnitCount > 0 ? ["Review earned units for imported courses before relying on unit totals."] : []),
      "Verify transferability on ASSIST.org before treating any course as confirmed.",
      "Use your advisor review to confirm GE areas and major-prep articulation.",
    ],
  };
}

function getPathwaysForProfile(_profileId: number) {
  if (isAuthBypass()) {
    return getDevPathways(_profileId) as typeof pathways;
  }
  return generatedPathways.length > 0 ? generatedPathways : pathways;
}

function json(data: Json, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isApi(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

async function readJsonBody(init?: RequestInit): Promise<Record<string, unknown>> {
  if (!init?.body || typeof init.body !== "string") return {};
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function installMockApi(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const reqUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const url = new URL(reqUrl, window.location.origin);

    if (!isApi(url)) return originalFetch(input, init);

    const { pathname } = url;
    const profileIdMatch = pathname.match(/\/api\/profiles\/(\d+)/);
    const profileId = profileIdMatch ? parseInt(profileIdMatch[1], 10) : profile.id;
    const activeProfile = getActiveProfile(profileId);
    const courses = getCoursesForProfile(profileId);
    const gpaSummary = computeGpaSummary(courses, activeProfile.currentGpa);

    if (pathname === "/api/auth/user") {
      if (isAuthBypass()) return json({ user: { id: "dev", email: "dev@local", firstName: "Dev", lastName: "User" } });
      if (isSupabaseConfigured) return json({ user: null });
      return json({ user: { id: "dev", email: "dev@local", firstName: "Dev", lastName: "User" } });
    }
    if (pathname === "/api/login") return json({ ok: true });
    if (pathname === "/api/logout") return json({ ok: true });

    if (pathname === "/api/profiles" && method === "POST") {
      const body = await readJsonBody(init);
      const saved = persistProfileUpdate(profileId, body);
      return json(saved, 201);
    }
    if (pathname.startsWith("/api/profiles/user/")) return json([activeProfile]);
    if (pathname === `/api/profiles/${profile.id}` && method === "PATCH") {
      const body = await readJsonBody(init);
      const saved = persistProfileUpdate(profileId, body);
      return json({ ...saved });
    }
    if (pathname === `/api/profiles/${profile.id}`) return json(activeProfile);

    if (pathname.endsWith("/courses/bulk") && method === "POST") {
      const body = await readJsonBody(init);
      const incoming = Array.isArray(body.courses) ? body.courses as Omit<StoredCourse, "id">[] : [];
      const latestGpa = typeof body.latestGpa === "number" ? body.latestGpa : undefined;
      const replaceCodes = Array.isArray(body.replaceCodes)
        ? body.replaceCodes.filter((value): value is string => typeof value === "string")
        : [];
      const merged = replaceCodes.length > 0
        ? replaceCompletedCoursesByCodes(profileId, incoming, replaceCodes, latestGpa)
        : appendCourses(profileId, incoming, latestGpa);
      return json({ inserted: incoming.length, courses: merged });
    }
    if (pathname.endsWith("/courses") && method === "GET") return json(courses);
    if (pathname.endsWith("/courses") && method === "POST") {
      const body = await readJsonBody(init);
      const created = createCourse(profileId, {
        courseCode: typeof body.courseCode === "string" ? body.courseCode : undefined,
        courseName: typeof body.courseName === "string" ? body.courseName : "Planned course",
        units: typeof body.units === "number" ? body.units : undefined,
        grade: typeof body.grade === "string" ? body.grade : undefined,
        status: typeof body.status === "string" ? body.status : "planned",
        term: typeof body.term === "string" ? body.term : undefined,
      });

      if (!created) {
        return json({ error: "Course already exists" }, 409);
      }

      return json(created as unknown as Json, 201);
    }
    if (pathname.includes("/gpa-summary")) return json(gpaSummary as unknown as Json);
    if (pathname.includes("/course-catalog")) return json({ college: activeProfile.communityCollege, major: activeProfile.intendedMajor, categories: ["Core"], courses });
    if (pathname.match(/\/api\/profiles\/\d+\/igetc$/) && method === "GET") {
      return json({ areas: deriveIgetcAreaStates(courses) });
    }
    if (pathname.match(/\/api\/profiles\/\d+\/calgetc$/) && method === "GET") {
      return json({ areas: deriveCalgetcAreaStates(courses) });
    }
    if (pathname.match(/\/api\/profiles\/\d+\/igetc\/analyze$/) && method === "POST") {
      return json({
        areas: deriveIgetcAreaStates(courses),
        note: "Derived from saved courses. Verify these matches on ASSIST.org or with a counselor.",
      });
    }
    if (pathname.includes("/transferability-analysis")) {
      if (method === "POST") {
        const body = await readJsonBody(init);
        const incoming = Array.isArray(body.courses) ? body.courses as Omit<StoredCourse, "id">[] : [];
        lastAnalysisResult = buildPreviewAnalysis(incoming);
      }
      return json(lastAnalysisResult as unknown as Json);
    }
    if (pathname.startsWith("/api/courses/") && method === "DELETE") return json({ ok: true });
    if (pathname.match(/\/api\/profiles\/\d+\/courses$/) && method === "DELETE") {
      if (isAuthBypass()) {
        const { saveDevCourses } = await import("@/lib/dev-courses");
        saveDevCourses(profileId, []);
        deleteAllDevPathways(profileId);
      } else {
        profileCourses = [];
      }
      return json({ ok: true });
    }

    if (pathname.includes("/generate-matches")) return json({ ok: true });
    if (pathname.includes("/generate-pathways") && method === "POST") {
      const res = await originalFetch(input, init);
      if (res.ok) {
        const data = await res.clone().json() as { pathways?: typeof pathways } | typeof pathways;
        if (Array.isArray(data)) generatedPathways = data;
        else if (data && typeof data === "object" && Array.isArray(data.pathways)) {
          generatedPathways = data.pathways;
        }
        if (isAuthBypass()) {
          saveDevPathways(profileId, generatedPathways as typeof pathways);
        }
      }
      return res;
    }
    if (pathname.includes("/pathways") && method === "GET") return json(getPathwaysForProfile(profileId));
    if (pathname.match(/\/api\/profiles\/\d+\/pathways\/\d+\/select$/) && method === "POST") {
      const match = pathname.match(/\/api\/profiles\/(\d+)\/pathways\/(\d+)\/select$/);
      const selectedProfileId = match ? parseInt(match[1], 10) : profileId;
      const pathwayId = match ? parseInt(match[2], 10) : 0;
      const ok = isAuthBypass()
        ? selectDevPathway(selectedProfileId, pathwayId)
        : true;
      return json({ ok }, ok ? 200 : 404);
    }
    if (pathname.includes("/generate-guidebook")) return json({ guidebookId: 501 });
    if (pathname.includes("/generate-roadmap")) return json({ roadmapId: 601 });

    if (pathname.startsWith("/api/guidebooks/")) {
      return json({
        id: 501,
        profileId: 1,
        title: "UCLA CS Transfer Guidebook",
        contentMarkdown: "# Guidebook\\n\\n- Complete major prep\\n- Keep GPA above 3.6\\n- Finish TAG alternatives",
        createdAt: new Date().toISOString(),
      });
    }

    if (pathname.startsWith("/api/roadmaps/") && pathname.endsWith("/share") && method === "GET") return json({ enabled: true, token: "demo-roadmap-token" });
    if (pathname.startsWith("/api/roadmaps/") && pathname.endsWith("/share") && method === "POST") return json({ enabled: true, token: "demo-roadmap-token" });
    if (pathname.startsWith("/api/roadmaps/") && pathname.endsWith("/share") && method === "DELETE") return json({ enabled: false });
    if (pathname.startsWith("/api/roadmaps/") && pathname.endsWith("/infographic/status")) return json({ status: "ready", imageUrl: null });
    if (pathname.startsWith("/api/roadmaps/") && pathname.endsWith("/infographic")) return json({ status: "ready", imageUrl: null });
    if (pathname.startsWith("/api/roadmaps/")) {
      return json({
        id: 601,
        profileId: 1,
        title: "Transfer Roadmap",
        items: [
          { id: "r1", title: "Finish Calculus II", status: "in_progress", term: "Fall 2026" },
          { id: "r2", title: "Submit UC application", status: "pending", term: "Nov 2026" },
        ],
      });
    }

    if (pathname.includes("/progress/selected-pathway")) {
      const savedPathways = getPathwaysForProfile(profileId);
      return json((savedPathways.find((row) => row.isSelected === "true") ?? savedPathways[0] ?? null) as unknown as Json);
    }
    if (pathname.includes("/progress/analyses")) return json([]);
    if (pathname.includes("/progress/entry-feedback")) return json({ ok: true });
    if (pathname.includes("/progress/analyze")) return json({ ok: true, analysisId: 1 });
    if (pathname.endsWith("/progress") && method === "GET") return json(progressEntries);
    if (pathname.endsWith("/progress") && method === "POST") return json({ id: Date.now(), note: "New progress entry", createdAt: new Date().toISOString() }, 201);
    if (pathname.startsWith("/api/progress/") && method === "DELETE") return json({ ok: true });

    if (pathname.includes("/exports") && method === "GET") return json({ generatedAt: new Date().toISOString(), exports: [] });
    if (pathname.includes("/exports/") && method === "POST") return json({ ok: true, url: "#" });

    if (pathname === "/api/live/verify-deadlines") return json({ verified: true, changes: [] });
    if (pathname.startsWith("/api/reminders/prefs/")) return json({ enabled: false, channels: [] });
    if (pathname.startsWith("/api/reminders/") && pathname.endsWith("/run")) return json({ ok: true });

    // Passthrough to the real Vite server plugin (uses DeepSeek AI)
    if (pathname === "/api/transcript/parse") {
      return originalFetch(input, init);
    }

    return json({ ok: true });
  };
}
