import { Router } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";
import { getOwnedProfile } from "../lib/ownership";
import { buildProfileBundle, IGETC_AREA_KEYS, IGETC_AREA_NAMES, type ProfileBundle } from "../lib/export-bundle";
import { checkExportRateLimit, EXPORT_HOURLY_LIMIT } from "../lib/export-rate-limit";

const router = Router();

function sanitizeFilename(input: string): string {
  return (input || "student").trim().replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 60) || "student";
}

// GET /api/profiles/:profileId/exports — bundle preview (counts/sections available)
router.get("/profiles/:profileId/exports", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const bundle = await buildProfileBundle(owner.profile);
    res.json({
      profile: {
        fullName: bundle.profile.fullName,
        communityCollege: bundle.profile.communityCollege,
        intendedMajor: bundle.profile.intendedMajor,
        currentGpa: bundle.profile.currentGpa,
      },
      counts: {
        courses: bundle.courses.length,
        savedInternships: bundle.savedInternships.length,
        progressEntries: bundle.progress.length,
        igetcCompleted: bundle.derived.igetcCompleted,
        igetcTotal: bundle.derived.igetcTotal,
        completedUnits: bundle.derived.completedUnits,
        upcomingDeadlines: bundle.derived.upcomingDeadlines.length,
      },
      hasSelectedPathway: bundle.selectedPathway !== null,
      rateLimit: { perHour: EXPORT_HOURLY_LIMIT },
    });
  } catch (err) {
    req.log.error({ err }, "Error building export preview");
    res.status(500).json({ error: "Failed to load export bundle" });
  }
});

// POST /api/profiles/:profileId/exports/resume — PDF
router.post("/profiles/:profileId/exports/resume", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const limit = checkExportRateLimit(req.user.id);
  if (!limit.ok) { res.status(429).json({ error: `Too many exports. Try again in ${limit.retryAfterSec}s.` }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const bundle = await buildProfileBundle(owner.profile);
    const filename = `${sanitizeFilename(bundle.profile.fullName ?? "student")}_resume.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    renderResumePdf(bundle, res);
  } catch (err) {
    req.log.error({ err }, "Error generating resume PDF");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate resume PDF" });
  }
});

// POST /api/profiles/:profileId/exports/transfer-plan — XLSX
router.post("/profiles/:profileId/exports/transfer-plan", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const limit = checkExportRateLimit(req.user.id);
  if (!limit.ok) { res.status(429).json({ error: `Too many exports. Try again in ${limit.retryAfterSec}s.` }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const bundle = await buildProfileBundle(owner.profile);
    const wb = await buildTransferPlanXlsx(bundle);
    const filename = `${sanitizeFilename(bundle.profile.fullName ?? "student")}_transfer_plan.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error generating transfer plan XLSX");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate transfer plan XLSX" });
  }
});

// POST /api/profiles/:profileId/exports/counselor-deck — PPTX
router.post("/profiles/:profileId/exports/counselor-deck", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const limit = checkExportRateLimit(req.user.id);
  if (!limit.ok) { res.status(429).json({ error: `Too many exports. Try again in ${limit.retryAfterSec}s.` }); return; }
  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const bundle = await buildProfileBundle(owner.profile);
    const pptx = buildCounselorDeck(bundle);
    const buf = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const filename = `${sanitizeFilename(bundle.profile.fullName ?? "student")}_counselor_brief.pptx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(buf.length));
    res.end(buf);
  } catch (err) {
    req.log.error({ err }, "Error generating counselor deck PPTX");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate counselor deck PPTX" });
  }
});

// ─── Resume PDF ─────────────────────────────────────────────────────────────
function renderResumePdf(b: ProfileBundle, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  doc.pipe(stream);

  const p = b.profile;
  const name = p.fullName ?? "Student Name";

  // Header
  doc.font("Helvetica-Bold").fontSize(22).text(name, { align: "left" });
  doc.moveDown(0.2);
  const headerBits: string[] = [];
  if (p.communityCollege) headerBits.push(p.communityCollege);
  if (p.intendedMajor) headerBits.push(`${p.intendedMajor} (intended major)`);
  if (p.transferTimeline) headerBits.push(`Targeting transfer ${p.transferTimeline}`);
  doc.font("Helvetica").fontSize(10).fillColor("#444").text(headerBits.join("  •  "));
  doc.moveDown(0.3);
  doc.strokeColor("#222").lineWidth(1).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
  doc.moveDown(0.5);
  doc.fillColor("#000");

  // Summary
  if (p.careerGoal || p.longTermAspirations) {
    section(doc, "Summary");
    const summary = [
      p.careerGoal ? `Career goal: ${p.careerGoal}.` : null,
      p.longTermAspirations ? p.longTermAspirations : null,
    ].filter(Boolean).join(" ");
    doc.font("Helvetica").fontSize(10).fillColor("#222").text(summary, { align: "left" });
    doc.moveDown(0.5);
  }

  // Education
  section(doc, "Education");
  if (p.communityCollege) {
    doc.font("Helvetica-Bold").fontSize(11).text(p.communityCollege);
  }
  const eduLine: string[] = [];
  if (p.intendedMajor) eduLine.push(`Major: ${p.intendedMajor}`);
  if (p.currentGpa != null) eduLine.push(`GPA: ${p.currentGpa.toFixed(2)}`);
  if (b.derived.estimatedGpa != null && b.derived.estimatedGpa !== p.currentGpa) eduLine.push(`Computed GPA: ${b.derived.estimatedGpa.toFixed(2)}`);
  if (b.derived.completedUnits > 0) eduLine.push(`${b.derived.completedUnits} units completed`);
  if (eduLine.length > 0) {
    doc.font("Helvetica").fontSize(10).fillColor("#333").text(eduLine.join("  •  "));
  }
  if (p.transferTimeline) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor("#555").text(`Planned transfer: ${p.transferTimeline}`);
  }
  doc.moveDown(0.5);
  doc.fillColor("#000");

  // Coursework Highlights (completed + in_progress)
  const highlightCourses = b.courses
    .filter((c) => c.status === "completed" || c.status === "in_progress")
    .slice(0, 12);
  if (highlightCourses.length > 0) {
    section(doc, "Coursework Highlights");
    for (const c of highlightCourses) {
      const code = c.courseCode ? `${c.courseCode} — ` : "";
      const grade = c.grade ? `  (${c.grade})` : c.status === "in_progress" ? "  (in progress)" : "";
      doc.font("Helvetica").fontSize(10).fillColor("#222")
        .text(`• ${code}${c.courseName}${grade}`);
    }
    doc.moveDown(0.5);
  }

  // IGETC progress
  if (b.derived.igetcCompleted > 0) {
    section(doc, "IGETC Progress");
    const completed = IGETC_AREA_KEYS.filter((k) => b.igetcAreas[k]).map((k) => IGETC_AREA_NAMES[k] ?? k);
    doc.font("Helvetica").fontSize(10).fillColor("#222")
      .text(`${b.derived.igetcCompleted} of ${b.derived.igetcTotal} areas satisfied: ${completed.join("; ")}`);
    doc.moveDown(0.5);
  }

  // Activities & Internships (saved + opportunity progress entries)
  const opps = b.progress.filter((e) => e.entryType === "opportunity" || e.entryType === "achievement" || e.entryType === "certification");
  if (b.savedInternships.length > 0 || opps.length > 0) {
    section(doc, "Activities, Internships & Honors");
    for (const si of b.savedInternships.slice(0, 8)) {
      const data = si.internshipData as Record<string, unknown>;
      const title = (data?.title as string | undefined) ?? si.internshipSlug;
      const org = (data?.organization as string | undefined) ?? (data?.company as string | undefined);
      const summary = (data?.summary as string | undefined) ?? (data?.description as string | undefined);
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text(`• ${title}${org ? `, ${org}` : ""}`);
      if (summary) doc.font("Helvetica").fontSize(9).fillColor("#444").text(`  ${summary.slice(0, 220)}`, { indent: 8 });
    }
    for (const e of opps.slice(0, 8)) {
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#000").text(`• ${e.title}`);
      if (e.description) doc.font("Helvetica").fontSize(9).fillColor("#444").text(`  ${e.description.slice(0, 220)}`, { indent: 8 });
    }
    doc.moveDown(0.5);
  }

  // Interests
  if (Array.isArray(p.interests) && p.interests.length > 0) {
    section(doc, "Interests");
    doc.font("Helvetica").fontSize(10).fillColor("#222").text(p.interests.join(" • "));
    doc.moveDown(0.5);
  }

  // Footer note
  doc.moveDown(0.5);
  doc.font("Helvetica-Oblique").fontSize(8).fillColor("#888")
    .text(`Generated by Pathwise (Do Your Path) on ${new Date().toLocaleDateString("en-US")}. Verify with your counselor before submitting to UC/CSU applications.`);

  doc.end();
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(title.toUpperCase(), { characterSpacing: 1 });
  doc.strokeColor("#cbd5e1").lineWidth(0.6).moveTo(50, doc.y + 1).lineTo(562, doc.y + 1).stroke();
  doc.moveDown(0.3);
  doc.fillColor("#000");
}

// ─── Transfer Plan XLSX ─────────────────────────────────────────────────────
async function buildTransferPlanXlsx(b: ProfileBundle): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Pathwise";
  wb.created = new Date();

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } },
    alignment: { horizontal: "left", vertical: "middle" },
  };

  // Profile sheet
  const sP = wb.addWorksheet("Profile");
  sP.columns = [{ key: "field", width: 28 }, { key: "value", width: 60 }];
  sP.addRow({ field: "Full name", value: b.profile.fullName ?? "" });
  sP.addRow({ field: "Community college", value: b.profile.communityCollege ?? "" });
  sP.addRow({ field: "Intended major", value: b.profile.intendedMajor ?? "" });
  sP.addRow({ field: "Career goal", value: b.profile.careerGoal ?? "" });
  sP.addRow({ field: "Transfer timeline", value: b.profile.transferTimeline ?? "" });
  sP.addRow({ field: "Geographic preference", value: b.profile.geographicPreference ?? "" });
  sP.addRow({ field: "Financial situation", value: b.profile.financialSituation ?? "" });
  sP.addRow({ field: "First-generation", value: b.profile.isFirstGen ?? "" });
  sP.addRow({ field: "Profile GPA", value: b.profile.currentGpa ?? "" });
  sP.addRow({ field: "Computed GPA", value: b.derived.estimatedGpa ?? "" });
  sP.addRow({ field: "Completed units", value: b.derived.completedUnits });
  sP.addRow({ field: "In-progress units", value: b.derived.inProgressUnits });
  sP.addRow({ field: "Planned units", value: b.derived.plannedUnits });
  sP.addRow({ field: "Selected pathway", value: b.selectedPathway ? `${b.selectedPathway.universityId ?? ""} (${b.selectedPathway.pathwayType ?? "n/a"})` : "Not selected" });
  sP.getColumn(1).font = { bold: true };

  // Courses sheet
  const sC = wb.addWorksheet("Courses");
  sC.columns = [
    { header: "Code", key: "courseCode", width: 12 },
    { header: "Course", key: "courseName", width: 38 },
    { header: "Units", key: "units", width: 8 },
    { header: "Status", key: "status", width: 14 },
    { header: "Grade", key: "grade", width: 10 },
    { header: "Term", key: "term", width: 14 },
  ];
  sC.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const c of b.courses) {
    sC.addRow({
      courseCode: c.courseCode ?? "",
      courseName: c.courseName,
      units: c.units ?? "",
      status: c.status ?? "",
      grade: c.grade ?? "",
      term: c.term ?? "",
    });
  }
  sC.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 6 } };

  // IGETC sheet
  const sI = wb.addWorksheet("IGETC Progress");
  sI.columns = [
    { header: "Area", key: "area", width: 10 },
    { header: "Description", key: "name", width: 50 },
    { header: "Satisfied", key: "done", width: 12 },
  ];
  sI.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const k of IGETC_AREA_KEYS) {
    sI.addRow({ area: k.toUpperCase(), name: IGETC_AREA_NAMES[k] ?? k, done: b.igetcAreas[k] ? "Yes" : "No" });
  }
  sI.addRow({ area: "", name: "Areas satisfied", done: `${b.derived.igetcCompleted} / ${b.derived.igetcTotal}` }).font = { bold: true };

  // Deadlines sheet
  const sD = wb.addWorksheet("Deadlines");
  sD.columns = [
    { header: "Label", key: "label", width: 40 },
    { header: "Date", key: "date", width: 16 },
    { header: "Source", key: "source", width: 22 },
  ];
  sD.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const d of b.derived.upcomingDeadlines) sD.addRow(d);
  if (b.derived.upcomingDeadlines.length === 0) {
    sD.addRow({ label: "No deadlines tracked yet — set your transfer timeline & save internships.", date: "", source: "" });
  }

  // Saved internships sheet
  const sN = wb.addWorksheet("Saved Internships");
  sN.columns = [
    { header: "Title", key: "title", width: 36 },
    { header: "Organization", key: "org", width: 28 },
    { header: "Deadline", key: "deadline", width: 16 },
    { header: "Link", key: "link", width: 50 },
    { header: "Saved", key: "saved", width: 16 },
  ];
  sN.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const si of b.savedInternships) {
    const d = si.internshipData as Record<string, unknown>;
    sN.addRow({
      title: (d?.title as string | undefined) ?? si.internshipSlug,
      org: (d?.organization as string | undefined) ?? (d?.company as string | undefined) ?? "",
      deadline: (d?.deadline as string | undefined) ?? "",
      link: (d?.url as string | undefined) ?? (d?.link as string | undefined) ?? "",
      saved: si.savedAt.toISOString().slice(0, 10),
    });
  }
  if (b.savedInternships.length === 0) {
    sN.addRow({ title: "No saved internships yet.", org: "", deadline: "", link: "", saved: "" });
  }

  // Progress entries sheet
  const sPr = wb.addWorksheet("Progress Log");
  sPr.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Type", key: "type", width: 14 },
    { header: "Title", key: "title", width: 36 },
    { header: "Detail", key: "detail", width: 60 },
  ];
  sPr.getRow(1).eachCell((c) => Object.assign(c, headerStyle));
  for (const p of b.progress) {
    sPr.addRow({
      date: p.entryDate ?? p.createdAt.toISOString().slice(0, 10),
      type: p.entryType,
      title: p.title,
      detail: p.description ?? "",
    });
  }
  if (b.progress.length === 0) {
    sPr.addRow({ date: "", type: "", title: "No progress entries yet.", detail: "" });
  }

  return wb;
}

// ─── Counselor PPTX ────────────────────────────────────────────────────────
function buildCounselorDeck(b: ProfileBundle): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `${b.profile.fullName ?? "Student"} — Counselor Brief`;

  const NAVY = "1E2761";
  const ICE = "CADCFC";
  const CHARCOAL = "0F172A";
  const SLATE = "475569";

  // Slide 1: Profile snapshot
  const s1 = pptx.addSlide();
  s1.background = { color: NAVY };
  s1.addText(b.profile.fullName ?? "Student", { x: 0.5, y: 0.6, w: 12, h: 1.0, fontSize: 44, bold: true, color: "FFFFFF", fontFace: "Calibri" });
  s1.addText("Pathwise Counselor Brief", { x: 0.5, y: 1.7, w: 12, h: 0.5, fontSize: 18, color: ICE, fontFace: "Calibri" });
  s1.addShape(pptx.ShapeType.rect, { x: 0.5, y: 2.6, w: 12, h: 0.04, fill: { color: ICE } });

  const profileFacts = [
    { k: "Community College", v: b.profile.communityCollege ?? "—" },
    { k: "Intended Major", v: b.profile.intendedMajor ?? "—" },
    { k: "Career Goal", v: b.profile.careerGoal ?? "—" },
    { k: "Transfer Timeline", v: b.profile.transferTimeline ?? "—" },
    { k: "Geographic Preference", v: b.profile.geographicPreference ?? "—" },
    { k: "First-Generation", v: b.profile.isFirstGen ?? "—" },
  ];
  profileFacts.forEach((f, i) => {
    const x = i % 2 === 0 ? 0.5 : 6.5;
    const y = 3.0 + Math.floor(i / 2) * 1.2;
    s1.addText(f.k.toUpperCase(), { x, y, w: 5.8, h: 0.35, fontSize: 11, color: ICE, bold: true, fontFace: "Calibri" });
    s1.addText(f.v, { x, y: y + 0.32, w: 5.8, h: 0.7, fontSize: 16, color: "FFFFFF", fontFace: "Calibri" });
  });

  // Slide 2: Pathway
  const s2 = pptx.addSlide();
  s2.background = { color: "FFFFFF" };
  s2.addText("Selected Pathway", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: CHARCOAL, fontFace: "Calibri" });
  if (b.selectedPathway) {
    const r = (b.selectedPathway.reportJson ?? {}) as Record<string, unknown>;
    const uniName = (r.universityName as string | undefined) ?? b.selectedPathway.universityId ?? "Selected university";
    s2.addText(uniName, { x: 0.5, y: 1.3, w: 12, h: 0.6, fontSize: 24, bold: true, color: NAVY, fontFace: "Calibri" });
    s2.addText(`Pathway type: ${b.selectedPathway.pathwayType ?? "n/a"}   •   Compatibility: ${Math.round((b.selectedPathway.compatibilityScore ?? 0))}/100`, {
      x: 0.5, y: 1.95, w: 12, h: 0.4, fontSize: 14, color: SLATE, fontFace: "Calibri",
    });
    const summary = (r.summary as string | undefined) ?? (r.overview as string | undefined) ?? (r.recommendation as string | undefined) ?? "Pathway report saved in Pathwise.";
    s2.addText(summary.slice(0, 700), { x: 0.5, y: 2.5, w: 12, h: 4.3, fontSize: 14, color: CHARCOAL, fontFace: "Calibri" });
  } else {
    s2.addText("No pathway selected yet.", { x: 0.5, y: 1.5, w: 12, h: 0.6, fontSize: 20, color: SLATE, italic: true, fontFace: "Calibri" });
    s2.addText("Recommend the student review the Pathway tab and commit to one university so we can lock in their guidebook and progress tracker.",
      { x: 0.5, y: 2.2, w: 12, h: 1.5, fontSize: 14, color: CHARCOAL, fontFace: "Calibri" });
  }

  // Slide 3: GPA & IGETC
  const s3 = pptx.addSlide();
  s3.background = { color: "FFFFFF" };
  s3.addText("GPA & IGETC", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: CHARCOAL, fontFace: "Calibri" });

  const gpaCard = (x: number, label: string, value: string) => {
    s3.addShape(pptx.ShapeType.roundRect, { x, y: 1.4, w: 3.7, h: 1.7, fill: { color: ICE }, line: { color: NAVY, width: 1 }, rectRadius: 0.1 });
    s3.addText(label.toUpperCase(), { x: x + 0.15, y: 1.55, w: 3.4, h: 0.3, fontSize: 11, bold: true, color: NAVY, fontFace: "Calibri" });
    s3.addText(value, { x: x + 0.15, y: 1.85, w: 3.4, h: 1.1, fontSize: 32, bold: true, color: CHARCOAL, fontFace: "Calibri" });
  };
  gpaCard(0.5, "Profile GPA", b.profile.currentGpa != null ? b.profile.currentGpa.toFixed(2) : "—");
  gpaCard(4.5, "Computed GPA", b.derived.estimatedGpa != null ? b.derived.estimatedGpa.toFixed(2) : "—");
  gpaCard(8.5, "Completed Units", String(b.derived.completedUnits));

  s3.addText(`IGETC: ${b.derived.igetcCompleted} of ${b.derived.igetcTotal} areas satisfied`, {
    x: 0.5, y: 3.4, w: 12, h: 0.5, fontSize: 18, bold: true, color: CHARCOAL, fontFace: "Calibri",
  });
  const igetcBullets = IGETC_AREA_KEYS.map((k) => ({
    text: `${b.igetcAreas[k] ? "✓" : "○"}  ${IGETC_AREA_NAMES[k] ?? k}`,
    options: { color: b.igetcAreas[k] ? "166534" : SLATE, fontSize: 13, bullet: false },
  }));
  s3.addText(igetcBullets, { x: 0.5, y: 4.0, w: 12, h: 3.0, fontFace: "Calibri" });

  // Slide 4: Next Deadlines
  const s4 = pptx.addSlide();
  s4.background = { color: "FFFFFF" };
  s4.addText("Next Deadlines", { x: 0.5, y: 0.4, w: 12, h: 0.7, fontSize: 32, bold: true, color: CHARCOAL, fontFace: "Calibri" });
  const deadlineRows = b.derived.upcomingDeadlines.slice(0, 10);
  if (deadlineRows.length === 0) {
    s4.addText("No deadlines tracked. Set the transfer timeline and save target internships in Pathwise.", {
      x: 0.5, y: 1.5, w: 12, h: 0.8, fontSize: 16, color: SLATE, italic: true, fontFace: "Calibri",
    });
  } else {
    const rows: PptxGenJS.TableRow[] = [
      [
        { text: "Label", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Date", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
        { text: "Source", options: { bold: true, color: "FFFFFF", fill: { color: NAVY } } },
      ],
      ...deadlineRows.map((d) => [
        { text: d.label, options: { color: CHARCOAL } },
        { text: d.date, options: { color: CHARCOAL } },
        { text: d.source, options: { color: SLATE } },
      ] as PptxGenJS.TableCell[]),
    ];
    s4.addTable(rows, { x: 0.5, y: 1.4, w: 12, fontSize: 13, fontFace: "Calibri", colW: [6.5, 2.5, 3.0] });
  }

  // Slide 5: Asks / Next steps
  const s5 = pptx.addSlide();
  s5.background = { color: NAVY };
  s5.addText("Asks for Counselor", { x: 0.5, y: 0.5, w: 12, h: 0.8, fontSize: 32, bold: true, color: "FFFFFF", fontFace: "Calibri" });

  const asks: string[] = [];
  if (!b.selectedPathway) asks.push("Help me commit to a transfer pathway and confirm the university match.");
  if (b.derived.igetcCompleted < b.derived.igetcTotal) {
    asks.push(`Review my IGETC plan — I still need ${b.derived.igetcTotal - b.derived.igetcCompleted} area(s) to complete the pattern.`);
  }
  if (b.derived.completedUnits < 30) asks.push("Audit my unit count — I'm below the 60 transferable units I need by application time.");
  if ((b.profile.currentGpa ?? 0) < 3.5) asks.push("Help me identify GPA-boosting strategies and any retake/EW options that fit my pathway.");
  if (b.savedInternships.length === 0) asks.push("Suggest internships, research, or service opportunities that strengthen my major narrative.");
  if (!b.profile.financialSituation) asks.push("Walk me through Cal Grant / FAFSA / Dream Act so I don't miss a March 2 deadline.");
  if (asks.length === 0) asks.push("Confirm my plan looks good and review my supplemental essays.");

  const askBullets = asks.map((a) => ({ text: a, options: { bullet: { code: "25BA" }, color: ICE, fontSize: 16, paraSpaceAfter: 8 } }));
  s5.addText(askBullets, { x: 0.7, y: 1.5, w: 11.6, h: 5.5, fontFace: "Calibri" });

  s5.addText(`Generated by Pathwise (Do Your Path) on ${new Date().toLocaleDateString("en-US")}.`, {
    x: 0.5, y: 7.0, w: 12, h: 0.4, fontSize: 10, color: ICE, italic: true, fontFace: "Calibri",
  });

  return pptx;
}

export default router;
