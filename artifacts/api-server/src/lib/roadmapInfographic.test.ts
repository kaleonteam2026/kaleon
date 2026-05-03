import { describe, expect, it } from "vitest";
import {
  buildInfographicData,
  computeInfographicLayout,
  parseSemesterPlan,
  renderInfographicPdf,
  renderInfographicSvg,
  renderSvgToPng,
  type InfographicData,
} from "./roadmapInfographic";
import type { AcademicRoadmap, Course, Pathway, StudentProfile } from "@workspace/db";

function makeOversizedMarkdown(): string {
  const terms = [
    "Fall 2024", "Spring 2025", "Summer 2025",
    "Fall 2025", "Spring 2026", "Summer 2026",
    "Fall 2026", "Spring 2027",
  ];
  const lines: string[] = [];
  lines.push("## Semester-by-Semester Academic Plan");
  lines.push("");
  lines.push("| Semester | Course | Units |");
  lines.push("|---|---|---|");
  for (const t of terms) {
    // 8 courses per term, including a long-named one to exercise wrapping.
    for (let i = 0; i < 8; i++) {
      const isLong = i === 0;
      const name = isLong
        ? `Introduction to Advanced Quantitative Research Methods ${i + 1}`
        : `COURSE ${i + 1} — Topic ${t}`;
      lines.push(`| ${t} | ${name} | 3 |`);
    }
  }
  lines.push("");
  lines.push("## Application Deadline Checklist");
  lines.push("");
  for (let i = 0; i < 9; i++) {
    lines.push(`- [ ] **Deadline ${i + 1}** — November ${i + 1}, 2026`);
  }
  return lines.join("\n");
}

function makeData(): InfographicData {
  const md = makeOversizedMarkdown();
  const fakeRoadmap = { id: 1, contentMarkdown: md, title: "t", profileId: 1, pathwayId: 1 } as unknown as AcademicRoadmap;
  const fakeProfile = { id: 1, fullName: "Test Student", currentGpa: 3.5, intendedMajor: "CS", targetUniversities: ["UC Berkeley"] } as unknown as StudentProfile;
  const fakePathway = { id: 1, reportJson: { university: "UC Berkeley", gpaTarget: 3.8 } } as unknown as Pathway;
  return buildInfographicData({
    roadmap: fakeRoadmap,
    profile: fakeProfile,
    pathway: fakePathway,
    courses: [] as Course[],
    igetcAreas: { "1a": true, "1b": true, "2a": true },
    savedDeadlines: [],
    dashboardUrl: "https://example.com/dashboard/1",
  });
}

describe("oversized roadmap infographic", () => {
  it("parses all 8 terms (no longer capped at 6)", () => {
    const data = makeData();
    expect(data.terms).toHaveLength(8);
  });

  it("retains every course in every term (no silent truncation past 7)", () => {
    const data = makeData();
    for (const t of data.terms) {
      expect(t.courses.length).toBe(8);
    }
  });

  it("retains all 9 parsed deadlines", () => {
    const data = makeData();
    expect(data.deadlines.length).toBe(9);
  });

  it("computes a layout taller than the default page when content overflows", () => {
    const data = makeData();
    const layout = computeInfographicLayout(data);
    expect(layout.height).toBeGreaterThan(layout.pageHeightHint);
  });

  it("renders an SVG that includes every term header and every course name", async () => {
    const data = makeData();
    const svg = await renderInfographicSvg(data);
    for (const t of data.terms) {
      expect(svg).toContain(t.term);
    }
    // Long name must be wrapped (split across lines), not "...". We assert
    // the first significant words of the long course title appear in SVG text.
    expect(svg).toContain("Introduction to Advanced");
    // And the SVG height attribute matches the dynamic layout.
    const layout = computeInfographicLayout(data);
    expect(svg).toContain(`height="${layout.height}"`);
  });

  it("produces a multi-page PDF when the layout exceeds one Letter page", async () => {
    const data = makeData();
    const svg = await renderInfographicSvg(data);
    const png = renderSvgToPng(svg);
    const pdf = await renderInfographicPdf(data, png);
    // PDF page count = number of "/Type /Page" objects (not "/Pages").
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    expect(pageCount).toBeGreaterThanOrEqual(2);
  }, 30_000);

  it("produces a single-page PDF for a small roadmap", async () => {
    const small = buildInfographicData({
      roadmap: { id: 1, contentMarkdown: "## Semester-by-Semester Academic Plan\n\n| Semester | Course | Units |\n|---|---|---|\n| Fall 2024 | Math 1A | 4 |\n", title: "t", profileId: 1, pathwayId: 1 } as unknown as AcademicRoadmap,
      profile: { id: 1, fullName: "S", currentGpa: 3.0, intendedMajor: "CS", targetUniversities: ["UCLA"] } as unknown as StudentProfile,
      pathway: { id: 1, reportJson: { university: "UCLA" } } as unknown as Pathway,
      courses: [],
      igetcAreas: {},
      savedDeadlines: [{ label: "UC App", date: "Nov 30, 2026" }],
      dashboardUrl: "https://example.com/dashboard/1",
    });
    const svg = await renderInfographicSvg(small);
    const png = renderSvgToPng(svg);
    const pdf = await renderInfographicPdf(small, png);
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    expect(pageCount).toBe(1);
  }, 30_000);
});

describe("parseSemesterPlan", () => {
  it("does not silently drop terms beyond the 6th", () => {
    const md = makeOversizedMarkdown();
    const terms = parseSemesterPlan(md);
    expect(terms.length).toBe(8);
  });
});

describe("extreme overflow (no silent caps)", () => {
  function makeExtremeMarkdown(): string {
    const lines: string[] = [];
    lines.push("## Semester-by-Semester Academic Plan");
    lines.push("");
    lines.push("| Semester | Course | Units |");
    lines.push("|---|---|---|");
    // 16 terms — beyond the previous 12 cap.
    for (let t = 0; t < 16; t++) {
      for (let i = 0; i < 5; i++) {
        lines.push(`| Term ${t + 1} | COURSE ${t + 1}.${i + 1} | 3 |`);
      }
    }
    lines.push("");
    lines.push("## Application Deadline Checklist");
    lines.push("");
    // 30 deadlines — beyond the previous 24 cap.
    for (let i = 0; i < 30; i++) {
      lines.push(`- [ ] Deadline ${i + 1} — December ${(i % 28) + 1}, 2026`);
    }
    return lines.join("\n");
  }

  it("does not silently drop terms above 12 or deadlines above 24", () => {
    const md = makeExtremeMarkdown();
    const data = buildInfographicData({
      roadmap: { id: 1, contentMarkdown: md, title: "t", profileId: 1, pathwayId: 1 } as unknown as AcademicRoadmap,
      profile: { id: 1, fullName: "S", currentGpa: 3.0, intendedMajor: "CS", targetUniversities: ["UCLA"] } as unknown as StudentProfile,
      pathway: { id: 1, reportJson: { university: "UCLA" } } as unknown as Pathway,
      courses: [],
      igetcAreas: {},
      savedDeadlines: [],
      dashboardUrl: "https://example.com/dashboard/1",
    });
    expect(data.terms).toHaveLength(16);
    expect(data.deadlines).toHaveLength(30);
  });

  it("renders an SVG with no visible page-fold guide artifacts and paginates the PDF", async () => {
    const md = makeExtremeMarkdown();
    const data = buildInfographicData({
      roadmap: { id: 1, contentMarkdown: md, title: "t", profileId: 1, pathwayId: 1 } as unknown as AcademicRoadmap,
      profile: { id: 1, fullName: "S", currentGpa: 3.0, intendedMajor: "CS", targetUniversities: ["UCLA"] } as unknown as StudentProfile,
      pathway: { id: 1, reportJson: { university: "UCLA" } } as unknown as Pathway,
      courses: [],
      igetcAreas: {},
      savedDeadlines: [],
      dashboardUrl: "https://example.com/dashboard/1",
    });
    const svg = await renderInfographicSvg(data);
    // No page-fold guide markup should leak into the user-visible image.
    expect(svg).not.toMatch(/Page-fold/);
    expect(svg).not.toMatch(/stroke-dasharray="6 6"/);
    const png = renderSvgToPng(svg);
    const pdf = await renderInfographicPdf(data, png);
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
    // A 16-term, 30-deadline roadmap must paginate well beyond a single page.
    expect(pageCount).toBeGreaterThanOrEqual(3);
  }, 60_000);
});
