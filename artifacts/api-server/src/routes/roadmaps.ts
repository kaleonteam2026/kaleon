import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, coursesTable, academicRoadmapsTable, roadmapInfographicsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { generateAcademicRoadmap } from "../services/aiService.js";
import { incrementGlobalAi, globalCapMessage } from "../lib/global-cap";
import { getOwnedPathway, getOwnedRoadmap, getOwnedProfile } from "../lib/ownership";
import { getRequestLocale, profileLocale } from "../lib/locale";
import {
  buildDashboardUrl,
  buildInfographicData,
  computeVersionHash,
  findCachedInfographic,
  gatherInfographicInputs,
  readInfographicAsset,
  renderInfographicPdf,
  renderInfographicSvg,
  renderSvgToPng,
  uploadInfographicAsset,
} from "../lib/roadmapInfographic";
import crypto from "node:crypto";

const router = Router();

const PER_USER_HOURLY = 3;
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(userId);
  if (!entry || entry.resetAt < now) {
    rateLimiter.set(userId, { count: 1, resetAt: now + 3600000 });
    return true;
  }
  if (entry.count >= PER_USER_HOURLY) return false;
  entry.count++;
  return true;
}

// POST /api/pathways/:pathwayId/generate-roadmap
router.post("/pathways/:pathwayId/generate-roadmap", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!checkRateLimit(req.user.id)) {
    res.status(429).json({ error: `Rate limit exceeded. You can generate up to ${PER_USER_HOURLY} roadmaps per hour.` });
    return;
  }

  try {
    const pathwayId = parseInt(req.params.pathwayId);
    const owner = await getOwnedPathway(pathwayId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Pathway not found" }); return; }

    const cap = await incrementGlobalAi();
    if (!cap.allowed) { res.status(429).json({ error: globalCapMessage(cap.cap) }); return; }

    const pathway = owner.pathway;
    const profile = owner.profile;
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, pathway.profileId));

    const locale = getRequestLocale(req) || profileLocale(profile);
    const markdown = await generateAcademicRoadmap(
      profile as unknown as Record<string, unknown>,
      pathway.reportJson as Record<string, unknown> ?? {},
      courses as unknown as Record<string, unknown>[],
      (scholarships as unknown as Record<string, unknown>[]).slice(0, 15),
      (opportunities as unknown as Record<string, unknown>[]).slice(0, 10),
      locale
    );

    const report = pathway.reportJson as Record<string, unknown> | null;
    const university = typeof report?.university === "string" ? report.university : "Unknown";
    const title = `Academic Roadmap — ${profile.fullName ?? "Student"} → ${university}`;

    const roadmap = await db.insert(academicRoadmapsTable).values({
      pathwayId,
      profileId: pathway.profileId,
      contentMarkdown: markdown,
      title,
    }).returning();

    res.json(roadmap[0]);
  } catch (err) {
    req.log.error({ err }, "Error generating academic roadmap");
    res.status(500).json({ error: "Failed to generate academic roadmap. Please try again." });
  }
});

// GET /api/roadmaps/:roadmapId
router.get("/roadmaps/:roadmapId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }

    res.json(owner.roadmap);
  } catch (err) {
    req.log.error({ err }, "Error fetching roadmap");
    res.status(500).json({ error: "Failed to fetch roadmap" });
  }
});

// GET /api/profiles/:profileId/roadmaps
router.get("/profiles/:profileId/roadmaps", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const profileId = parseInt(req.params.profileId);
    const owner = await getOwnedProfile(profileId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Profile not found" }); return; }

    const roadmaps = await db.select().from(academicRoadmapsTable).where(eq(academicRoadmapsTable.profileId, profileId));
    res.json(roadmaps);
  } catch (err) {
    req.log.error({ err }, "Error fetching roadmaps" );
    res.status(500).json({ error: "Failed to fetch roadmaps" });
  }
});

// POST /api/roadmaps/:roadmapId/infographic — generate (or use cached) PNG+PDF
router.post("/roadmaps/:roadmapId/infographic", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }

    const inputs = await gatherInfographicInputs(roadmapId);
    if (!inputs) { res.status(404).json({ error: "Roadmap data unavailable" }); return; }
    const { roadmap, profile, pathway, courses, igetcAreas, savedDeadlines } = inputs;

    const versionHash = computeVersionHash({ roadmap, profile, pathway, courses, igetcAreas, savedDeadlines });

    const cached = await findCachedInfographic(roadmapId, versionHash);
    if (cached) {
      res.json({
        cached: true,
        versionHash,
        pngUrl: `/api/roadmaps/${roadmapId}/infographic/png?v=${versionHash}`,
        pdfUrl: `/api/roadmaps/${roadmapId}/infographic/pdf?v=${versionHash}`,
      });
      return;
    }

    // First-time generation: count one AI cap unit
    const cap = await incrementGlobalAi();
    if (!cap.allowed) { res.status(429).json({ error: globalCapMessage(cap.cap) }); return; }

    const data = buildInfographicData({
      roadmap,
      profile,
      pathway,
      courses,
      igetcAreas,
      savedDeadlines,
      dashboardUrl: buildDashboardUrl(profile.id),
    });

    const svg = await renderInfographicSvg(data);
    const png = renderSvgToPng(svg);
    const pdf = await renderInfographicPdf(data, png);

    const id = `${roadmapId}-${versionHash}-${crypto.randomUUID().slice(0, 8)}`;
    const pngObjectPath = await uploadInfographicAsset(`${id}.png`, "image/png", png);
    const pdfObjectPath = await uploadInfographicAsset(`${id}.pdf`, "application/pdf", pdf);

    await db.insert(roadmapInfographicsTable).values({
      roadmapId,
      profileId: profile.id,
      versionHash,
      pngObjectPath,
      pdfObjectPath,
    }).onConflictDoNothing();

    res.json({
      cached: false,
      versionHash,
      pngUrl: `/api/roadmaps/${roadmapId}/infographic/png?v=${versionHash}`,
      pdfUrl: `/api/roadmaps/${roadmapId}/infographic/pdf?v=${versionHash}`,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating roadmap infographic");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate infographic" });
  }
});

// GET /api/roadmaps/:roadmapId/infographic/:format — download cached asset
router.get("/roadmaps/:roadmapId/infographic/:format", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const format = req.params.format;
    if (format !== "png" && format !== "pdf") {
      res.status(400).json({ error: "Invalid format" }); return;
    }
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }

    const inputs = await gatherInfographicInputs(roadmapId);
    if (!inputs) { res.status(404).json({ error: "Roadmap not found" }); return; }
    const versionHash = computeVersionHash(inputs);
    const cached = await findCachedInfographic(roadmapId, versionHash);
    if (!cached) { res.status(404).json({ error: "Infographic not generated yet" }); return; }

    const objectPath = format === "png" ? cached.pngObjectPath : cached.pdfObjectPath;
    const asset = await readInfographicAsset(objectPath);

    const filename = `pathwise-roadmap-${roadmapId}.${format}`;
    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(asset.body);
  } catch (err) {
    req.log.error({ err }, "Error serving roadmap infographic");
    if (!res.headersSent) res.status(500).json({ error: "Failed to download infographic" });
  }
});

export default router;
