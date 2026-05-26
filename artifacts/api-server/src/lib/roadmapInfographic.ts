import { Resvg } from "@resvg/resvg-js";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import crypto from "node:crypto";
import {
  db,
  academicRoadmapsTable,
  studentProfilesTable,
  pathwaysTable,
  coursesTable,
  igetcProgressTable,
  savedInternshipsTable,
  roadmapInfographicsTable,
  type AcademicRoadmap,
  type StudentProfile,
  type Pathway,
  type Course,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { objectStorageClient } from "./objectStorage";
import { getPublicOrigin } from "./platform";

export interface InfographicHashInputs {
  roadmap: AcademicRoadmap;
  profile: StudentProfile;
  pathway: Pathway | null;
  courses: Course[];
  igetcAreas: Record<string, boolean>;
  savedDeadlines: { label: string; date: string }[];
}

const IGETC_AREAS = ["1a", "1b", "1c", "2a", "3a", "3b", "4", "5a", "5b", "5c", "6a"];

export interface InfographicData {
  studentName: string;
  targetSchool: string;
  major: string;
  currentGpa: number | null;
  gpaTarget: number | null;
  terms: { term: string; courses: { name: string; units: number }[]; totalUnits: number }[];
  igetcCompleted: number;
  igetcTotal: number;
  deadlines: { label: string; date: string }[];
  generatedAt: string;
  dashboardUrl: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

export function parseSemesterPlan(markdown: string): InfographicData["terms"] {
  // Find the section heading "## Semester-by-Semester Academic Plan" and read its table.
  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((l) => /^##\s+semester-by-semester/i.test(l.trim()));
  if (headerIdx === -1) return [];

  // Find the next ## heading
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { endIdx = i; break; }
  }
  const section = lines.slice(headerIdx + 1, endIdx);

  // Parse pipe table rows: skip header + separator lines
  const rows: string[][] = [];
  for (const raw of section) {
    const line = raw.trim();
    if (!line.startsWith("|")) continue;
    const cells = line.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
    if (cells.length === 0) continue;
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; // separator
    rows.push(cells);
  }
  if (rows.length === 0) return [];

  // Detect header row
  const header = rows[0].map((c) => c.toLowerCase());
  const isHeader = header.some((c) => c.includes("semester") || c.includes("term") || c.includes("course"));
  const dataRows = isHeader ? rows.slice(1) : rows;

  const semIdx = isHeader ? header.findIndex((c) => c.includes("semester") || c.includes("term")) : 0;
  const courseIdx = isHeader ? header.findIndex((c) => c.includes("course")) : 1;
  const unitsIdx = isHeader ? header.findIndex((c) => c.includes("unit")) : 2;

  const map = new Map<string, { name: string; units: number }[]>();
  let lastTerm = "";
  for (const row of dataRows) {
    const term = (row[semIdx] || lastTerm || "Term").replace(/\*\*/g, "").trim();
    if (term) lastTerm = term;
    const course = (row[courseIdx] || "").replace(/\*\*/g, "").trim();
    if (!course) continue;
    const unitsRaw = unitsIdx >= 0 ? (row[unitsIdx] || "") : "";
    const units = parseFloat(unitsRaw) || 3;
    if (!map.has(lastTerm)) map.set(lastTerm, []);
    map.get(lastTerm)!.push({ name: course, units });
  }

  return Array.from(map.entries()).map(([term, courses]) => ({
    term,
    courses,
    totalUnits: courses.reduce((s, c) => s + c.units, 0),
  }));
}

export function parseDeadlines(markdown: string): { label: string; date: string }[] {
  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((l) => /^##\s+application deadline/i.test(l.trim()));
  if (headerIdx === -1) return [];
  let endIdx = lines.length;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) { endIdx = i; break; }
  }
  const items: { label: string; date: string }[] = [];
  for (const line of lines.slice(headerIdx + 1, endIdx)) {
    const m = line.match(/^\s*-\s*\[[ xX]\]\s*(.+)$/);
    if (!m) continue;
    let text = m[1].trim().replace(/\*\*/g, "");
    // Try to extract a date-ish substring
    const dateMatch = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2}/i);
    let date = "";
    if (dateMatch) {
      date = dateMatch[0];
      text = text.replace(dateMatch[0], "").replace(/[—–-]\s*$/, "").replace(/\(\s*\)/g, "").trim();
    }
    items.push({ label: truncate(text, 60), date: date || "TBD" });
  }
  return items;
}

export interface BuildOptions {
  roadmap: AcademicRoadmap;
  profile: StudentProfile;
  pathway: Pathway | null;
  courses: Course[];
  igetcAreas: Record<string, boolean>;
  savedDeadlines: { label: string; date: string }[];
  dashboardUrl: string;
}

export function buildInfographicData(opts: BuildOptions): InfographicData {
  const { roadmap, profile, pathway, courses, igetcAreas, savedDeadlines, dashboardUrl } = opts;
  const md = roadmap.contentMarkdown ?? "";

  const report = (pathway?.reportJson ?? {}) as Record<string, unknown>;
  const targetSchool = typeof report.university === "string" && report.university
    ? report.university
    : (profile.targetUniversities?.[0] ?? "Target University");
  const gpaTarget = typeof report.gpaTarget === "number" ? report.gpaTarget : null;

  let terms = parseSemesterPlan(md);
  if (terms.length === 0) {
    // Fallback: synthesize from courses table
    const map = new Map<string, { name: string; units: number }[]>();
    for (const c of courses) {
      const term = (c.term ?? "Planned").trim() || "Planned";
      if (!map.has(term)) map.set(term, []);
      map.get(term)!.push({ name: c.courseName, units: c.units ?? 3 });
    }
    terms = Array.from(map.entries()).map(([term, cs]) => ({
      term,
      courses: cs,
      totalUnits: cs.reduce((s, c) => s + c.units, 0),
    }));
  }
  let deadlines = parseDeadlines(md);
  if (deadlines.length === 0) deadlines = savedDeadlines;

  const igetcCompleted = IGETC_AREAS.filter((a) => igetcAreas[a]).length;

  return {
    studentName: profile.fullName ?? "Student",
    targetSchool: String(targetSchool),
    major: profile.intendedMajor ?? "Undeclared",
    currentGpa: profile.currentGpa ?? null,
    gpaTarget,
    terms,
    igetcCompleted,
    igetcTotal: IGETC_AREAS.length,
    deadlines,
    generatedAt: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    dashboardUrl,
  };
}

export function computeVersionHash(inputs: InfographicHashInputs): string {
  const { roadmap, profile, pathway, courses, igetcAreas, savedDeadlines } = inputs;
  const h = crypto.createHash("sha256");
  const push = (s: string) => { h.update(s); h.update("\u0001"); };

  push("roadmap");
  push(String(roadmap.id));
  push(roadmap.contentMarkdown ?? "");
  push(roadmap.title ?? "");
  push(String(roadmap.updatedAt ?? roadmap.createdAt ?? ""));

  push("profile");
  push(profile.fullName ?? "");
  push(String(profile.currentGpa ?? ""));
  push(profile.intendedMajor ?? "");
  push(JSON.stringify(profile.targetUniversities ?? []));

  push("pathway");
  if (pathway) {
    push(String(pathway.id));
    push(JSON.stringify(pathway.reportJson ?? null));
  }

  push("courses");
  const sortedCourses = [...courses].sort((a, b) => a.id - b.id);
  for (const c of sortedCourses) {
    push(`${c.id}|${c.term ?? ""}|${c.courseName}|${c.units ?? ""}|${c.status ?? ""}|${c.grade ?? ""}`);
  }

  push("igetc");
  const igetcKeys = Object.keys(igetcAreas).sort();
  for (const k of igetcKeys) push(`${k}=${igetcAreas[k] ? 1 : 0}`);

  push("deadlines");
  const sortedDeadlines = [...savedDeadlines].sort((a, b) => (a.label + a.date).localeCompare(b.label + b.date));
  for (const d of sortedDeadlines) push(`${d.date}|${d.label}`);

  return h.digest("hex").slice(0, 24);
}

// ---------- SVG ----------

const W = 1600;
// Default page height — used as a hint for PDF pagination. The actual rendered
// SVG height grows dynamically when the content (terms or deadlines) overflows.
const H_DEFAULT = 2000;

// Wrap a string into at most `maxLines` lines, each at most `maxChars` chars.
// Prefers breaking on whitespace; truncates the last line with an ellipsis if
// the text still doesn't fit.
function wrapText(s: string, maxChars: number, maxLines: number): string[] {
  if (s.length <= maxChars) return [s];
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + " " + w).length <= maxChars) {
      cur += " " + w;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  // If we ran out of lines but still have remaining words, ellipsize the last.
  const consumed = lines.join(" ").length + (lines.length - 1); // approx with spaces
  if (consumed < s.length) {
    const last = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] = truncate(last + " " + s.slice(consumed).trim(), maxChars);
  }
  // Hard-wrap any individual line that is still too long (no spaces case).
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxChars) {
      if (i < lines.length - 1) lines[i] = lines[i].slice(0, maxChars);
      else lines[i] = truncate(lines[i], maxChars);
    }
  }
  return lines;
}

export interface InfographicLayout {
  width: number;
  height: number;
  pageHeightHint: number;
}

export function computeInfographicLayout(data: InfographicData): InfographicLayout {
  // Mirror renderInfographicSvg's grid math exactly, including the zero-term
  // edge case (no rows, no cells). Using `|| 1` here would diverge from the
  // SVG and corrupt PDF pagination height for empty roadmaps.
  const cols = Math.min(3, Math.max(1, data.terms.length));
  const rows = Math.ceil(data.terms.length / cols);
  const cellW = (W - 160 - (cols - 1) * 24) / Math.max(1, cols);
  const charsPerLine = Math.max(20, Math.floor((cellW - 110) / 9));
  const courseLineH = 32;

  // Determine the tallest term card so all cards in the grid share one height.
  let maxLinesInAnyTerm = 0;
  for (const t of data.terms) {
    let lines = 0;
    for (const c of t.courses) {
      lines += wrapText(c.name, charsPerLine, 2).length;
    }
    if (lines > maxLinesInAnyTerm) maxLinesInAnyTerm = lines;
  }
  const cellH = Math.max(360, 100 + maxLinesInAnyTerm * courseLineH + 24);

  const gridStartY = 720;
  const deadlinesY = gridStartY + rows * (cellH + 24) + 24;
  const deadlineRows = Math.max(1, Math.ceil((data.deadlines.length || 1) / 4));
  const deadlinesEnd = deadlinesY + 60 + deadlineRows * (120 + 16);
  // Footer is a 240px band that starts 24px below the deadlines section. This
  // must match renderInfographicSvg exactly so the PDF pagination math agrees
  // with the rasterized image dimensions.
  const footerY = deadlinesEnd + 24;
  const height = Math.max(H_DEFAULT, footerY + 240);
  return { width: W, height, pageHeightHint: H_DEFAULT };
}

export async function renderInfographicSvg(data: InfographicData): Promise<string> {
  const qrPngDataUrl = await QRCode.toDataURL(data.dashboardUrl, {
    margin: 1,
    width: 280,
    color: { dark: "#1e1b4b", light: "#ffffff" },
  });

  const igetcPct = data.igetcTotal > 0 ? data.igetcCompleted / data.igetcTotal : 0;
  const ringR = 90;
  const ringC = 2 * Math.PI * ringR;
  const ringDash = ringC * igetcPct;

  // Term grid: dynamic rows; up to 3 columns wide. Cell height grows with the
  // tallest card (after wrapping long course names) so nothing is silently
  // dropped when a student has many courses per term.
  const grid = data.terms;
  const cols = Math.min(3, Math.max(1, grid.length));
  const rows = Math.ceil(grid.length / cols);
  const gridStartX = 80;
  const gridStartY = 720;
  const cellW = (W - 160 - (cols - 1) * 24) / Math.max(1, cols);
  // Approx chars per line for body text inside a cell, leaving room for the
  // right-aligned units label.
  const charsPerLine = Math.max(20, Math.floor((cellW - 110) / 9));
  const courseLineH = 32;

  let maxLinesInAnyTerm = 0;
  const wrappedTerms = grid.map((t) => {
    const wrapped = t.courses.map((c) => ({
      ...c,
      lines: wrapText(c.name, charsPerLine, 2),
    }));
    const totalLines = wrapped.reduce((s, c) => s + c.lines.length, 0);
    if (totalLines > maxLinesInAnyTerm) maxLinesInAnyTerm = totalLines;
    return { ...t, wrapped };
  });
  const cellH = Math.max(360, 100 + maxLinesInAnyTerm * courseLineH + 24);

  const termCards = wrappedTerms.map((t, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = gridStartX + c * (cellW + 24);
    const y = gridStartY + r * (cellH + 24);
    let lineCursor = 0;
    const courseLines = t.wrapped.map((cs) => {
      const firstLineY = y + 100 + lineCursor * courseLineH;
      const nameSvg = cs.lines.map((ln, li) => {
        const ty = firstLineY + li * courseLineH;
        return `<text x="${x + 24}" y="${ty}" font-family="Inter, sans-serif" font-size="18" fill="#334155">${escapeXml(ln)}</text>`;
      }).join("");
      const unitsSvg = `<text x="${x + cellW - 24}" y="${firstLineY}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="16" fill="#64748b">${cs.units}u</text>`;
      lineCursor += cs.lines.length;
      return nameSvg + unitsSvg;
    }).join("");
    return `
      <g>
        <rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
        <rect x="${x}" y="${y}" width="${cellW}" height="56" rx="20" fill="#4f46e5"/>
        <rect x="${x}" y="${y + 36}" width="${cellW}" height="20" fill="#4f46e5"/>
        <text x="${x + 24}" y="${y + 36}" font-family="Inter, sans-serif" font-size="20" font-weight="700" fill="#ffffff">${escapeXml(truncate(t.term, 28))}</text>
        <text x="${x + cellW - 24}" y="${y + 36}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="16" fill="#c7d2fe">${t.totalUnits} units</text>
        ${courseLines}
      </g>
    `;
  }).join("");

  // Deadlines: 4 per row, wrapping to additional rows when needed.
  const deadlinesY = gridStartY + rows * (cellH + 24) + 24;
  const deadlineCols = 4;
  const deadlineGap = 16;
  const deadlineW = (W - 160 - (deadlineCols - 1) * deadlineGap) / deadlineCols;
  const deadlineH = 120;
  const deadlineRowGap = 16;
  const deadlineCards = data.deadlines.map((d, i) => {
    const r = Math.floor(i / deadlineCols);
    const c = i % deadlineCols;
    const dx = 80 + c * (deadlineW + deadlineGap);
    const dy = deadlinesY + 60 + r * (deadlineH + deadlineRowGap);
    return `
      <g>
        <rect x="${dx}" y="${dy}" width="${deadlineW}" height="${deadlineH}" rx="16" fill="#fef3c7" stroke="#fde68a" stroke-width="2"/>
        <text x="${dx + 20}" y="${dy + 36}" font-family="JetBrains Mono, monospace" font-size="18" font-weight="700" fill="#b45309">${escapeXml(d.date)}</text>
        <text x="${dx + 20}" y="${dy + 70}" font-family="Inter, sans-serif" font-size="16" fill="#78350f">${escapeXml(truncate(d.label, 36))}</text>
      </g>
    `;
  }).join("");
  const deadlineRows = Math.max(1, Math.ceil(data.deadlines.length / deadlineCols));
  const deadlinesEnd = deadlinesY + 60 + deadlineRows * (deadlineH + deadlineRowGap);

  const footerY = deadlinesEnd + 24;
  const H = Math.max(H_DEFAULT, footerY + 240);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4f46e5"/>
      <stop offset="1" stop-color="#7c3aed"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#f8fafc"/>

  <!-- Header -->
  <rect x="0" y="0" width="${W}" height="380" fill="url(#bg)"/>
  <text x="80" y="100" font-family="Inter, sans-serif" font-size="22" font-weight="600" fill="#c7d2fe" letter-spacing="2">PATHWISE CC · ACADEMIC ROADMAP</text>
  <text x="80" y="180" font-family="Inter, sans-serif" font-size="56" font-weight="800" fill="#ffffff">${escapeXml(truncate(data.studentName, 30))}</text>
  <text x="80" y="240" font-family="Inter, sans-serif" font-size="34" font-weight="500" fill="#e0e7ff">→ ${escapeXml(truncate(data.targetSchool, 40))}</text>
  <text x="80" y="290" font-family="Inter, sans-serif" font-size="22" fill="#c7d2fe">${escapeXml(truncate(data.major, 60))}</text>

  <!-- Stats strip -->
  <g>
    <rect x="80" y="420" width="380" height="240" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <text x="270" y="466" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#64748b" letter-spacing="2">CURRENT GPA</text>
    <text x="270" y="560" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="80" font-weight="800" fill="#1e1b4b">${data.currentGpa !== null ? data.currentGpa.toFixed(2) : "—"}</text>
    <text x="270" y="610" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#64748b">Target: ${data.gpaTarget !== null ? data.gpaTarget.toFixed(2) : "—"}</text>
  </g>

  <!-- IGETC ring -->
  <g transform="translate(${W / 2}, 540)">
    <rect x="-180" y="-120" width="360" height="240" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <text x="0" y="-74" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#64748b" letter-spacing="2">IGETC PROGRESS</text>
    <g transform="translate(0, 16)">
      <circle r="${ringR}" fill="none" stroke="#e2e8f0" stroke-width="18"/>
      <circle r="${ringR}" fill="none" stroke="#4f46e5" stroke-width="18"
              stroke-dasharray="${ringDash} ${ringC}" stroke-linecap="round"
              transform="rotate(-90)"/>
      <text x="0" y="-2" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="44" font-weight="800" fill="#1e1b4b">${Math.round(igetcPct * 100)}%</text>
      <text x="0" y="32" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" fill="#64748b">${data.igetcCompleted} of ${data.igetcTotal} areas</text>
    </g>
  </g>

  <!-- Generated date card -->
  <g>
    <rect x="${W - 460}" y="420" width="380" height="240" rx="20" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <text x="${W - 270}" y="466" text-anchor="middle" font-family="Inter, sans-serif" font-size="16" font-weight="600" fill="#64748b" letter-spacing="2">GENERATED</text>
    <text x="${W - 270}" y="530" text-anchor="middle" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="#1e1b4b">${escapeXml(data.generatedAt)}</text>
    <text x="${W - 270}" y="580" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#64748b">${data.terms.length} term${data.terms.length === 1 ? "" : "s"} planned</text>
    <text x="${W - 270}" y="615" text-anchor="middle" font-family="Inter, sans-serif" font-size="18" fill="#64748b">${data.deadlines.length} key deadline${data.deadlines.length === 1 ? "" : "s"}</text>
  </g>

  <!-- Section title -->
  <text x="80" y="700" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#1e1b4b" letter-spacing="2">SEMESTER-BY-SEMESTER PLAN</text>

  ${termCards}

  <!-- Deadlines section -->
  <text x="80" y="${deadlinesY + 30}" font-family="Inter, sans-serif" font-size="22" font-weight="700" fill="#1e1b4b" letter-spacing="2">KEY DEADLINES</text>
  ${deadlineCards}

  <!-- Footer -->
  <rect x="0" y="${footerY}" width="${W}" height="${H - footerY}" fill="#1e1b4b"/>
  <g transform="translate(80, ${footerY + 40})">
    <rect x="0" y="0" width="160" height="160" rx="12" fill="#ffffff"/>
    <image x="10" y="10" width="140" height="140" href="${qrPngDataUrl}" preserveAspectRatio="xMidYMid meet"/>
  </g>
  <text x="280" y="${footerY + 90}" font-family="Inter, sans-serif" font-size="24" font-weight="700" fill="#ffffff">Scan to view your full dashboard</text>
  <text x="280" y="${footerY + 130}" font-family="Inter, sans-serif" font-size="18" fill="#a5b4fc">Pathwise CC · AI-generated · Always verify with official sources</text>
  <text x="280" y="${footerY + 166}" font-family="Inter, sans-serif" font-size="16" fill="#818cf8">Not a substitute for official academic advising</text>
  <text x="${W - 80}" y="${footerY + 166}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="14" fill="#818cf8">pathwise.cc</text>
</svg>`;
}

export function renderSvgToPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: W },
    background: "#f8fafc",
    font: { loadSystemFonts: true },
  });
  return Buffer.from(resvg.render().asPng());
}

export async function renderInfographicPdf(data: InfographicData, pngBuffer: Buffer): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "LETTER",
      margin: 36,
      info: {
        Title: `${data.studentName} — Pathwise Roadmap`,
        Author: "Pathwise CC",
        Subject: `Academic roadmap for ${data.targetSchool}`,
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - 72;
    const pageH = doc.page.height - 72;
    const layout = computeInfographicLayout(data);
    const imgW = pageW;
    const imgH = imgW * (layout.height / layout.width);

    // When the rendered infographic is taller than a single Letter page, slice
    // it across multiple pages by clipping the page region and offsetting the
    // image upward. This avoids a single page being squashed unreadably small
    // when the student has many terms or deadlines.
    const pages = Math.max(1, Math.ceil(imgH / pageH));
    for (let i = 0; i < pages; i++) {
      if (i > 0) doc.addPage();
      doc.save();
      doc.rect(36, 36, pageW, pageH).clip();
      doc.image(pngBuffer, 36, 36 - i * pageH, { width: imgW });
      doc.restore();
    }
    doc.end();
  });
}

// ---------- Object storage I/O ----------

function bucketAndPath(): { bucketName: string; baseDir: string } {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) throw new Error("PRIVATE_OBJECT_DIR not set");
  const parts = dir.replace(/^\//, "").split("/");
  const bucketName = parts[0];
  const baseDir = parts.slice(1).join("/");
  return { bucketName, baseDir };
}

export async function uploadInfographicAsset(
  filename: string,
  contentType: string,
  body: Buffer,
): Promise<string> {
  const { bucketName, baseDir } = bucketAndPath();
  const objectName = `${baseDir}${baseDir.endsWith("/") || baseDir === "" ? "" : "/"}roadmap-infographics/${filename}`;
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  await file.save(body, {
    contentType,
    resumable: false,
    metadata: { cacheControl: "private, max-age=86400" },
  });
  return `/objects/roadmap-infographics/${filename}`;
}

export async function readInfographicAsset(objectPath: string): Promise<{ body: Buffer; contentType: string }> {
  if (!objectPath.startsWith("/objects/")) throw new Error("Invalid object path");
  const id = objectPath.slice("/objects/".length);
  const { bucketName, baseDir } = bucketAndPath();
  const objectName = `${baseDir}${baseDir.endsWith("/") || baseDir === "" ? "" : "/"}${id}`;
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  if (!exists) throw new Error("Object not found");
  const [meta] = await file.getMetadata();
  const [body] = await file.download();
  return { body, contentType: (meta.contentType as string) || "application/octet-stream" };
}

// ---------- Cache lookup ----------

export interface InfographicCacheRow {
  versionHash: string;
  pngObjectPath: string;
  pdfObjectPath: string;
}

export async function findCachedInfographic(
  roadmapId: number,
  versionHash: string,
): Promise<InfographicCacheRow | null> {
  const rows = await db
    .select()
    .from(roadmapInfographicsTable)
    .where(eq(roadmapInfographicsTable.roadmapId, roadmapId));
  const match = rows.find((r) => r.versionHash === versionHash);
  if (!match) return null;
  return { versionHash: match.versionHash, pngObjectPath: match.pngObjectPath, pdfObjectPath: match.pdfObjectPath };
}

export async function gatherInfographicInputs(roadmapId: number) {
  const [roadmap] = await db.select().from(academicRoadmapsTable).where(eq(academicRoadmapsTable.id, roadmapId));
  if (!roadmap) return null;
  const [profile] = await db.select().from(studentProfilesTable).where(eq(studentProfilesTable.id, roadmap.profileId));
  if (!profile) return null;
  const [pathway] = await db.select().from(pathwaysTable).where(eq(pathwaysTable.id, roadmap.pathwayId));
  const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, roadmap.profileId));
  const igetcRows = await db.select().from(igetcProgressTable).where(eq(igetcProgressTable.profileId, roadmap.profileId));
  const igetcAreas = igetcRows[0]?.areas ?? {};
  const savedInternships = await db.select().from(savedInternshipsTable).where(eq(savedInternshipsTable.profileId, roadmap.profileId));
  const savedDeadlines: { label: string; date: string }[] = [];
  for (const si of savedInternships) {
    const data = si.internshipData as Record<string, unknown>;
    const deadline = data?.deadline as string | undefined;
    const title = (data?.title as string | undefined) ?? si.internshipSlug;
    if (deadline) savedDeadlines.push({ label: title, date: deadline });
  }
  return { roadmap, profile, pathway: pathway ?? null, courses, igetcAreas, savedDeadlines };
}

export function buildDashboardUrl(profileId: number): string {
  return `${getPublicOrigin()}/dashboard/${profileId}`;
}

export function buildShareUrl(token: string): string {
  return `${getPublicOrigin()}/s/${token}`;
}
