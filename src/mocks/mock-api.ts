import { isSupabaseConfigured } from "@/lib/supabase";
import { computeGpaSummary, type StoredCourse } from "@/lib/course-progress";
import { appendDevCourses, getDevCourses } from "@/lib/dev-courses";
import { isAuthBypass } from "@/lib/dev-profile";
type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const profile = {
  id: 1,
  userId: "dev",
  fullName: "Dev User",
  communityCollege: "Pasadena City College",
  intendedMajor: "Computer Science",
  careerGoal: "Software Engineer",
  currentGpa: 3.7,
  transferTimeline: "Fall 2027",
  financialSituation: "Middle-income (no Pell)",
  isFirstGen: "Yes",
  completionPercent: 72,
};

let profileCourses: StoredCourse[] = [
];

function getCoursesForProfile(profileId: number): StoredCourse[] {
  if (isAuthBypass()) return getDevCourses(profileId);
  return profileCourses;
}

function nextCourseId(courses: StoredCourse[]): number {
  return courses.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1;
}

function appendCourses(profileId: number, incoming: Omit<StoredCourse, "id">[], latestGpa?: number): StoredCourse[] {
  if (isAuthBypass()) {
    if (latestGpa && latestGpa > 0) profile.currentGpa = latestGpa;
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
  if (latestGpa && latestGpa > 0) profile.currentGpa = latestGpa;
  return profileCourses;
}

const pathways = [
  {
    id: 101,
    profileId: 1,
    targetUniversity: "UCLA",
    targetMajor: "Computer Science",
    confidenceScore: 82,
    estimatedAdmissionChance: "Moderate",
    rationale: "Strong GPA and aligned prerequisites.",
    reportJson: {
      type: "moderately_compatible",
      university: "UCLA",
      compatibilityScore: 82,
      whyItFits: "Strong GPA and aligned prerequisites.",
      concerns: "Complete remaining major prep courses.",
      gpaTarget: 3.5,
      requiredUnits: 60,
      courseGaps: ["MATH 280", "PHYS 210", "CS 250"],
      transferTimeline: "Fall 2027",
      scholarshipOptions: ["Cal Grant"],
      internshipRecommendations: ["Tech internship"],
      extracurricularRecommendations: ["CS club"],
      campusOpportunities: [],
      risks: [],
      nextSteps: ["Finish calculus sequence"],
    },
  },
];

const progressEntries = [
  { id: 11, profileId: 1, note: "Met with counselor and confirmed major prep.", createdAt: new Date().toISOString() },
];

/** Pathways returned by the last DeepSeek generate call (dev pass-through). */
let generatedPathways: typeof pathways = [];

function getPathwaysForProfile(_profileId: number) {
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
    const courses = getCoursesForProfile(profileId);
    const gpaSummary = computeGpaSummary(courses, profile.currentGpa);

    if (pathname === "/api/auth/user") {
      if (isAuthBypass()) return json({ user: { id: "dev", email: "dev@local", firstName: "Dev", lastName: "User" } });
      if (isSupabaseConfigured) return json({ user: null });
      return json({ user: { id: "dev", email: "dev@local", firstName: "Dev", lastName: "User" } });
    }
    if (pathname === "/api/login") return json({ ok: true });
    if (pathname === "/api/logout") return json({ ok: true });

    if (pathname === "/api/profiles" && method === "POST") return json(profile, 201);
    if (pathname.startsWith("/api/profiles/user/")) return json([profile]);
    if (pathname === `/api/profiles/${profile.id}` && method === "PATCH") return json({ ...profile });
    if (pathname === `/api/profiles/${profile.id}`) return json(profile);

    if (pathname.endsWith("/courses/bulk") && method === "POST") {
      const body = await readJsonBody(init);
      const incoming = Array.isArray(body.courses) ? body.courses as Omit<StoredCourse, "id">[] : [];
      const latestGpa = typeof body.latestGpa === "number" ? body.latestGpa : undefined;
      const merged = appendCourses(profileId, incoming, latestGpa);
      return json({ inserted: incoming.length, courses: merged });
    }
    if (pathname.endsWith("/courses") && method === "GET") return json(courses);
    if (pathname.endsWith("/courses") && method === "POST") return json({ id: Date.now(), ...courses[0] }, 201);
    if (pathname.includes("/gpa-summary")) return json(gpaSummary as unknown as Json);
    if (pathname.includes("/course-catalog")) return json({ college: profile.communityCollege, major: profile.intendedMajor, categories: ["Core"], courses });
    if (pathname.includes("/transferability-analysis")) {
      return json({
        summary: "Most courses are likely transferable.",
        courseResults: courses.map((c) => ({ ...c, status: "transferable", assistNote: "Matches lower-division prep." })),
        universityMatches: [{ university: "UCLA", system: "UC", matchScore: 84, matchReason: "Strong prep", transferableCount: courses.length, totalCourses: courses.length }],
      });
    }
    if (pathname.startsWith("/api/courses/") && method === "DELETE") return json({ ok: true });

    if (pathname.includes("/generate-matches")) return json({ ok: true });
    if (pathname.includes("/generate-pathways") && method === "POST") {
      const res = await originalFetch(input, init);
      if (res.ok) {
        const data = await res.json() as { pathways?: typeof pathways } | typeof pathways;
        if (Array.isArray(data)) generatedPathways = data;
        else if (data && typeof data === "object" && Array.isArray(data.pathways)) {
          generatedPathways = data.pathways;
        }
      }
      return res;
    }
    if (pathname.includes("/pathways") && method === "GET") return json(getPathwaysForProfile(profileId));
    if (pathname.includes("/select")) return json({ ok: true });
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

    if (pathname.includes("/progress/selected-pathway")) return json(getPathwaysForProfile(profileId)[0] ?? pathways[0]);
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
