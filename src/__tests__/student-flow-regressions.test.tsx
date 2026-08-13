import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { Route } from "wouter";
import { AuthProvider } from "@/contexts/auth-context";
import ProgressPage from "@/pages/progress";
import PlanPage from "@/pages/plan";
import PathwaysPage from "@/pages/pathways";
import { saveDevCourses } from "@/lib/dev-courses";
import { saveDevPathways, selectDevPathway, type DevPathway } from "@/lib/dev-pathways";
import { saveDevProfile } from "@/lib/dev-profile";
import type { StoredCourse } from "@/lib/course-progress";

const PROFILE_ID = 1;

const BASE_PROFILE = {
  fullName: "Dev User",
  communityCollege: "American River College",
  intendedMajor: "Biotechnology",
  careerGoal: "Transfer",
  currentGpa: 2.75,
  transferTimeline: "Fall 2027",
  financialSituation: "Middle-income (no Pell)",
  isFirstGen: "Yes",
  completionPercent: 60,
};

function makePathway(id: number, selected: boolean, gaps: string[]): DevPathway {
  return {
    id,
    profileId: PROFILE_ID,
    pathwayType: id === 1 ? "moderately_compatible" : "most_compatible",
    compatibilityScore: id === 1 ? 78 : 83,
    isSelected: selected ? "true" : "false",
    generationLabel: "Pathway 1",
    reportJson: {
      type: id === 1 ? "moderately_compatible" : "most_compatible",
      university: id === 1 ? "UC Davis" : "San Jose State University",
      compatibilityScore: id === 1 ? 78 : 83,
      whyItFits: "Matches the saved coursework and transfer goals.",
      concerns: "A few major-prep courses are still open.",
      riskAnalysis: "Impacted major review remains the main uncertainty.",
      gpaTarget: 3.2,
      requiredUnits: 60,
      courseGaps: gaps,
      coursesAnalyzed: ["ENGL 110", "CS 221"],
      transferTimeline: "Target Fall 2027 transfer.",
      scholarshipOptions: ["Transfer grant"],
      internshipRecommendations: ["Campus research"],
      extracurricularRecommendations: ["Engineering club"],
      campusOpportunities: [
        {
          name: "EOP",
          type: "program",
          description: "First-gen support and advising.",
          admitProfileNote: "Helpful for transfer transition support.",
        },
      ],
      risks: [],
      nextSteps: ["Meet with a counselor about sequencing."],
    },
  };
}

function makeGeneratedPathway(
  id: number,
  pathwayType: NonNullable<DevPathway["pathwayType"]>,
  university: string,
  gaps: string[],
  selected = false,
): DevPathway {
  const base = makePathway(id, selected, gaps);
  const baseReport = base.reportJson!;
  return {
    ...base,
    pathwayType,
    compatibilityScore: pathwayType === "least_compatible" ? 71 : pathwayType === "moderately_compatible" ? 82 : 88,
    isSelected: selected ? "true" : "false",
    generationLabel: "Pathway 2",
    reportJson: {
      ...baseReport,
      type: pathwayType,
      university,
      compatibilityScore: pathwayType === "least_compatible" ? 71 : pathwayType === "moderately_compatible" ? 82 : 88,
      courseGaps: gaps,
    },
  };
}

async function renderRoute(path: string, routePath: string, element: ReactNode) {
  window.history.pushState({}, "", path);
  const container = document.createElement("div");
  document.body.appendChild(container);
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(container);

  root.render(
    <AuthProvider>
      <Route path={routePath}>{() => element}</Route>
    </AuthProvider>,
  );

  return {
    container,
    root,
    cleanup() {
      root.unmount();
      document.body.removeChild(container);
    },
  };
}

function queryButton(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes(label)) as HTMLButtonElement | undefined;
}

function queryButtons(container: HTMLElement, label: string): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll("button")).filter((button) => button.textContent?.includes(label)) as HTMLButtonElement[];
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  window.history.pushState({}, "", "/");
  saveDevProfile(BASE_PROFILE);
});

describe("student-flow regressions", () => {
  it("replaces stale transcript-derived completed rows while preserving planned and in-progress work", async () => {
    saveDevCourses(PROFILE_ID, [
      { id: 1, courseCode: "CS 221", courseName: "CS 221", units: 3, status: "completed", term: "Fall 2024" },
      { id: 2, courseCode: "INFO 3", courseName: "INFO 3", units: 0, status: "completed", term: "Fall 2024" },
      { id: 3, courseCode: "RT 3", courseName: "RT 3", units: 0, status: "completed", term: "Fall 2024" },
      { id: 4, courseCode: "COUN 100", courseName: "Transfer Seminar", status: "planned", term: "Spring 2027" },
      { id: 5, courseCode: "CHEM 101", courseName: "General Chemistry", units: 4, status: "in_progress", term: "Fall 2026" },
    ]);

    const payload = {
      latestGpa: 2.75,
      replaceCodes: ["CS 221", "INFO 3", "RT 3"],
      courses: [
        { courseCode: "CS 221", courseName: "Computer Org & Assem. Lang", units: 3, grade: "A", term: "Fall 2024", status: "completed" },
        { courseCode: "MATH 120", courseName: "Calculus I", units: 4, grade: "B", term: "Spring 2024", status: "completed" },
      ],
    };

    const saveResponse = await fetch(`/api/profiles/${PROFILE_ID}/courses/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(saveResponse.ok).toBe(true);

    const firstPass = await fetch(`/api/profiles/${PROFILE_ID}/courses`).then((response) => response.json()) as StoredCourse[];
    expect(firstPass.map((course) => course.courseCode)).toEqual([
      "COUN 100",
      "CHEM 101",
      "CS 221",
      "MATH 120",
    ]);
    expect(firstPass.find((course) => course.courseCode === "CS 221")?.courseName).toBe("Computer Org & Assem. Lang");
    expect(firstPass.some((course) => course.courseCode === "INFO 3")).toBe(false);
    expect(firstPass.some((course) => course.courseCode === "RT 3")).toBe(false);
    expect(firstPass.find((course) => course.courseCode === "COUN 100")?.status).toBe("planned");
    expect(firstPass.find((course) => course.courseCode === "CHEM 101")?.status).toBe("in_progress");

    const summary = await fetch(`/api/profiles/${PROFILE_ID}/gpa-summary`).then((response) => response.json()) as { estimatedGpa: number; totalUnits: number };
    expect(summary.estimatedGpa).toBe(2.75);
    expect(summary.totalUnits).toBe(11);

    const secondSave = await fetch(`/api/profiles/${PROFILE_ID}/courses/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    expect(secondSave.ok).toBe(true);

    const secondPass = await fetch(`/api/profiles/${PROFILE_ID}/courses`).then((response) => response.json()) as StoredCourse[];
    expect(secondPass).toHaveLength(4);
    expect(secondPass.filter((course) => course.courseCode === "CS 221")).toHaveLength(1);
  });

  it("shows useful Progress information even when no pathway is selected", async () => {
    saveDevCourses(PROFILE_ID, [
      { id: 1, courseCode: "ENGL 110", courseName: "College Composition", units: 3, grade: "A", status: "completed", term: "Fall 2023" },
    ]);

    const view = await renderRoute(`/progress/${PROFILE_ID}`, "/progress/:profileId", <ProgressPage />);
    try {
      await vi.waitFor(() => {
        expect(view.container.textContent).toContain("Pathway needed");
      });

      expect(view.container.textContent).toContain("Choose a pathway");
      expect(view.container.textContent).toContain("College Composition");
      expect(view.container.textContent).toContain("3 units");
    } finally {
      view.cleanup();
    }
  });

  it("adds suggested courses to the plan in dev mode, persists them, and removes them from open gaps", async () => {
    saveDevCourses(PROFILE_ID, [
      { id: 1, courseCode: "ENGL 110", courseName: "College Composition", units: 3, grade: "A", status: "completed", term: "Fall 2023" },
      { id: 2, courseCode: "CHEM 101", courseName: "General Chemistry", units: 4, status: "in_progress", term: "Fall 2026" },
    ]);
    saveDevPathways(PROFILE_ID, [
      makePathway(1, true, ["MATH 120 Calculus I", "CHEM 101 General Chemistry"]),
    ]);

    const planView = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(planView.container.textContent).toContain("MATH 120");
      });

      const addButton = queryButton(planView.container, "Add to plan");
      expect(addButton).toBeTruthy();
      addButton?.click();

      await vi.waitFor(() => {
        expect(planView.container.textContent).toContain("MATH 120 · Calculus I");
      });
      expect(queryButton(planView.container, "Add to plan")).toBeUndefined();
    } finally {
      planView.cleanup();
    }

    const savedCourses = await fetch(`/api/profiles/${PROFILE_ID}/courses`).then((response) => response.json()) as StoredCourse[];
    expect(savedCourses.find((course) => course.courseCode === "MATH 120")?.status).toBe("planned");

    const progressView = await renderRoute(`/progress/${PROFILE_ID}`, "/progress/:profileId", <ProgressPage />);
    try {
      await vi.waitFor(() => {
        expect(progressView.container.textContent).toContain("MATH 120 · Calculus I");
      });
      expect(progressView.container.textContent).toContain("Planned");
    } finally {
      progressView.cleanup();
    }

    const refreshedPlan = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(refreshedPlan.container.textContent).toContain("MATH 120 · Calculus I");
      });
      expect(queryButton(refreshedPlan.container, "Add to plan")).toBeUndefined();
    } finally {
      refreshedPlan.cleanup();
    }
  });

  it("recalculates Plan suggestions after a test-only pathway selection change", async () => {
    saveDevPathways(PROFILE_ID, [
      makePathway(1, true, ["MATH 120 Calculus I"]),
      makePathway(2, false, ["PHYS 150 Physics I"]),
    ]);

    const firstView = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(firstView.container.textContent).toContain("MATH 120");
      });
      expect(firstView.container.textContent).not.toContain("PHYS 150");
    } finally {
      firstView.cleanup();
    }

    expect(selectDevPathway(PROFILE_ID, 2)).toBe(true);

    const secondView = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(secondView.container.textContent).toContain("PHYS 150");
      });
      expect(secondView.container.textContent).not.toContain("MATH 120");
    } finally {
      secondView.cleanup();
    }
  });

  it("generates mocked pathways, keeps the selected pathway canonical, and prevents duplicate add-to-plan persistence", async () => {
    saveDevCourses(PROFILE_ID, [
      { id: 1, courseCode: "ENGL 110", courseName: "College Composition", units: 3, grade: "A", status: "completed", term: "Fall 2023" },
      { id: 2, courseCode: "CHEM 101", courseName: "General Chemistry", units: 4, status: "in_progress", term: "Fall 2026" },
    ]);

    const generated = [
      makeGeneratedPathway(101, "least_compatible", "Sonoma State University", ["HIST 101 World History"]),
      makeGeneratedPathway(102, "moderately_compatible", "UC Davis", ["PHYS 150 Physics I"]),
      makeGeneratedPathway(103, "most_compatible", "CSU Long Beach", ["MATH 130 Calculus II"]),
    ];

    const baseFetch = window.fetch.bind(window);
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const reqUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (reqUrl.includes(`/api/profiles/${PROFILE_ID}/generate-pathways`) && (init?.method ?? "GET").toUpperCase() === "POST") {
        saveDevPathways(PROFILE_ID, generated);
        return Promise.resolve(new Response(JSON.stringify({
          pathways: generated,
          progressSummary: {
            completedUnits: 7,
            graduationRequirement: 60,
            unitsRemaining: 53,
            percentComplete: 12,
            courseAnalysis: "The saved transcript already covers 7 units.",
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }));
      }
      return baseFetch(input, init);
    });
    vi.stubGlobal("fetch", fetchMock);

    const pathwaysView = await renderRoute(`/pathways/${PROFILE_ID}`, "/pathways/:profileId", <PathwaysPage />);
    try {
      await vi.waitFor(() => {
        expect(queryButton(pathwaysView.container, "Compare transfer pathways")).toBeTruthy();
      });

      queryButton(pathwaysView.container, "Compare transfer pathways")?.click();

      await vi.waitFor(() => {
        expect(pathwaysView.container.textContent).toContain("CSU Long Beach");
      });
      expect(fetchMock.mock.calls.filter(([url, init]) => {
        const reqUrl = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
        return reqUrl.includes(`/api/profiles/${PROFILE_ID}/generate-pathways`) && (init?.method ?? "GET").toUpperCase() === "POST";
      })).toHaveLength(1);

      const savedAfterGenerate = await fetch(`/api/profiles/${PROFILE_ID}/pathways`).then((response) => response.json()) as DevPathway[];
      expect(savedAfterGenerate).toHaveLength(3);

      const makePrimaryButtons = queryButtons(pathwaysView.container, "Make Primary");
      expect(makePrimaryButtons).toHaveLength(3);
      makePrimaryButtons[2]?.click();

      await vi.waitFor(() => {
        expect(queryButton(pathwaysView.container, "Primary Pathway")).toBeTruthy();
      });
    } finally {
      pathwaysView.cleanup();
      vi.unstubAllGlobals();
    }

    const selectedAfterGenerate = await fetch(`/api/profiles/${PROFILE_ID}/pathways`).then((response) => response.json()) as DevPathway[];
    expect(selectedAfterGenerate.find((pathway) => pathway.isSelected === "true")?.reportJson?.university).toBe("CSU Long Beach");

    const progressForSafety = await renderRoute(`/progress/${PROFILE_ID}`, "/progress/:profileId", <ProgressPage />);
    try {
      await vi.waitFor(() => {
        expect(progressForSafety.container.textContent).toContain("CSU Long Beach");
      });
      expect(progressForSafety.container.textContent).toContain("MATH 130 Calculus II");
      expect(progressForSafety.container.textContent).not.toContain("PHYS 150 Physics I");
    } finally {
      progressForSafety.cleanup();
    }

    const planForSafety = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(planForSafety.container.textContent).toContain("MATH 130");
      });

      const addButton = queryButton(planForSafety.container, "Add to plan");
      expect(addButton).toBeTruthy();
      addButton?.click();
      addButton?.click();

      await vi.waitFor(() => {
        expect(planForSafety.container.textContent).toContain("MATH 130 · Calculus II");
      });
      expect(queryButton(planForSafety.container, "Add to plan")).toBeUndefined();
    } finally {
      planForSafety.cleanup();
    }

    const savedCourses = await fetch(`/api/profiles/${PROFILE_ID}/courses`).then((response) => response.json()) as StoredCourse[];
    expect(savedCourses.filter((course) => course.courseCode === "MATH 130" && course.status === "planned")).toHaveLength(1);

    const progressWithPlan = await renderRoute(`/progress/${PROFILE_ID}`, "/progress/:profileId", <ProgressPage />);
    try {
      await vi.waitFor(() => {
        expect(progressWithPlan.container.textContent).toContain("MATH 130 · Calculus II");
      });
      expect(progressWithPlan.container.textContent).toContain("Planned");
    } finally {
      progressWithPlan.cleanup();
    }

    const selectResponse = await fetch(`/api/profiles/${PROFILE_ID}/pathways/102/select`, {
      method: "POST",
      credentials: "include",
    });
    expect(selectResponse.ok).toBe(true);

    const selectedAfterChange = await fetch(`/api/profiles/${PROFILE_ID}/pathways`).then((response) => response.json()) as DevPathway[];
    expect(selectedAfterChange.find((pathway) => pathway.isSelected === "true")?.reportJson?.university).toBe("UC Davis");

    const progressForMatch = await renderRoute(`/progress/${PROFILE_ID}`, "/progress/:profileId", <ProgressPage />);
    try {
      await vi.waitFor(() => {
        expect(progressForMatch.container.textContent).toContain("UC Davis");
      });
      expect(progressForMatch.container.textContent).toContain("PHYS 150 Physics I");
      expect(progressForMatch.container.textContent).not.toContain("MATH 130 Calculus II");
    } finally {
      progressForMatch.cleanup();
    }

    const planForMatch = await renderRoute(`/plan/${PROFILE_ID}`, "/plan/:profileId", <PlanPage />);
    try {
      await vi.waitFor(() => {
        expect(planForMatch.container.textContent).toContain("PHYS 150");
      });
      expect(planForMatch.container.textContent).toContain("MATH 130 · Calculus II");
      expect(queryButtons(planForMatch.container, "Add to plan")).toHaveLength(1);
    } finally {
      planForMatch.cleanup();
    }
  });
});
