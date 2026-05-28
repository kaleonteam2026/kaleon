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

const courses = [
  { id: 1, courseCode: "MATH 180", courseName: "Calculus I", units: 5, grade: "A", status: "completed", term: "Fall 2024" },
  { id: 2, courseCode: "CS 101", courseName: "Intro to Programming", units: 4, grade: "A-", status: "completed", term: "Spring 2025" },
];

const pathways = [
  {
    id: 101,
    profileId: 1,
    targetUniversity: "UCLA",
    targetMajor: "Computer Science",
    confidenceScore: 82,
    estimatedAdmissionChance: "Moderate",
    rationale: "Strong GPA and aligned prerequisites.",
  },
];

const progressEntries = [
  { id: 11, profileId: 1, note: "Met with counselor and confirmed major prep.", createdAt: new Date().toISOString() },
];

function json(data: Json, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isApi(url: URL): boolean {
  return url.pathname.startsWith("/api/");
}

export function installMockApi(): void {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const reqUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const url = new URL(reqUrl, window.location.origin);

    if (!isApi(url)) return originalFetch(input, init);

    const { pathname } = url;

    if (pathname === "/api/auth/user") return json({ user: { id: "dev", email: "dev@local", firstName: "Dev", lastName: "User" } });
    if (pathname === "/api/login") return json({ ok: true });
    if (pathname === "/api/logout") return json({ ok: true });

    if (pathname === "/api/profiles" && method === "POST") return json(profile, 201);
    if (pathname.startsWith("/api/profiles/user/")) return json([profile]);
    if (pathname === `/api/profiles/${profile.id}`) return json(profile);
    if (pathname === `/api/profiles/${profile.id}` && method === "PATCH") return json({ ...profile });

    if (pathname.endsWith("/courses/bulk")) return json({ inserted: courses.length });
    if (pathname.endsWith("/courses") && method === "GET") return json(courses);
    if (pathname.endsWith("/courses") && method === "POST") return json({ id: Date.now(), ...courses[0] }, 201);
    if (pathname.includes("/gpa-summary")) return json({ estimatedGpa: 3.7, totalUnits: 9, completedUnits: 9, inProgressUnits: 0, courseCount: 2 });
    if (pathname.includes("/course-catalog")) return json({ college: profile.communityCollege, major: profile.intendedMajor, categories: ["Core"], courses });
    if (pathname.includes("/transferability-analysis")) {
      return json({
        summary: "Most courses are likely transferable.",
        courseResults: courses.map((c) => ({ ...c, status: "transferable", assistNote: "Matches lower-division prep." })),
        universityMatches: [{ university: "UCLA", system: "UC", matchScore: 84, matchReason: "Strong prep", transferableCount: 2, totalCourses: 2 }],
      });
    }
    if (pathname.startsWith("/api/courses/") && method === "DELETE") return json({ ok: true });

    if (pathname.includes("/generate-matches")) return json({ ok: true });
    if (pathname.includes("/pathways") && method === "GET") return json(pathways);
    if (pathname.includes("/generate-pathways")) return json({ ok: true });
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

    if (pathname.includes("/progress/selected-pathway")) return json(pathways[0]);
    if (pathname.includes("/progress/analyses")) return json([]);
    if (pathname.includes("/progress/entry-feedback")) return json({ ok: true });
    if (pathname.includes("/progress/analyze")) return json({ ok: true, analysisId: 1 });
    if (pathname.endsWith("/progress") && method === "GET") return json(progressEntries);
    if (pathname.endsWith("/progress") && method === "POST") return json({ id: Date.now(), note: "New progress entry", createdAt: new Date().toISOString() }, 201);
    if (pathname.startsWith("/api/progress/") && method === "DELETE") return json({ ok: true });

    if (pathname.includes("/dashboard-summary/")) {
      return json({
        profileCompletionPercent: 72,
        totalCourses: 2,
        completedCourses: 2,
        inProgressCourses: 0,
        estimatedGpa: 3.7,
        savedPathwaysCount: 1,
        guidebooksCount: 1,
        topMatchUniversity: "UCLA",
        topMatchScore: 84,
        chosenTransferSchool: "UCLA",
        chosenTransferScore: 84,
        nextActions: ["Add another semester plan", "Review pathway assumptions"],
        readinessScore: 68,
        readinessLabel: "On Track",
        readinessBreakdown: { profile: 72, gpa: 74, units: 20, pathway: 75, guidebook: 60, progress: 58, totalUnits: 9 },
      });
    }

    if (pathname.includes("/exports") && method === "GET") return json({ generatedAt: new Date().toISOString(), exports: [] });
    if (pathname.includes("/exports/") && method === "POST") return json({ ok: true, url: "#" });

    if (pathname === "/api/live/verify-deadlines") return json({ verified: true, changes: [] });
    if (pathname.startsWith("/api/reminders/prefs/")) return json({ enabled: false, channels: [] });
    if (pathname.startsWith("/api/reminders/") && pathname.endsWith("/run")) return json({ ok: true });

    return json({ ok: true });
  };
}
