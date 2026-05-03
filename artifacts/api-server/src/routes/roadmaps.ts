import { Router } from "express";
import scholarships from "../data/scholarships.json" assert { type: "json" };
import opportunities from "../data/opportunities.json" assert { type: "json" };
import { db, coursesTable, academicRoadmapsTable, roadmapInfographicsTable, roadmapShareLinksTable } from "@workspace/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { generateAcademicRoadmap } from "../services/aiService.js";
import { enforceAiCap } from "../lib/global-cap";
import { getOwnedPathway, getOwnedRoadmap, getOwnedProfile } from "../lib/ownership";
import { resolveAuthedLocale } from "../lib/locale";
import {
  buildDashboardUrl,
  buildInfographicData,
  buildShareUrl,
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

    const cap = await enforceAiCap(req.user.id);
    if (!cap.allowed) { res.status(cap.status).json({ error: cap.error }); return; }

    const pathway = owner.pathway;
    const profile = owner.profile;
    const courses = await db.select().from(coursesTable).where(eq(coursesTable.profileId, pathway.profileId));

    const locale = resolveAuthedLocale(profile, req);
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

// GET /api/roadmaps/:roadmapId/infographic/status — compare current vs latest cached hash
router.get("/roadmaps/:roadmapId/infographic/status", async (req, res) => {
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

    const currentHash = computeVersionHash(inputs);

    const rows = await db
      .select()
      .from(roadmapInfographicsTable)
      .where(eq(roadmapInfographicsTable.roadmapId, roadmapId))
      .orderBy(desc(roadmapInfographicsTable.createdAt));
    const latest = rows[0] ?? null;

    const isStale = !!latest && latest.versionHash !== currentHash;
    const hasCurrent = !!latest && latest.versionHash === currentHash;

    res.json({
      currentHash,
      hasCurrent,
      isStale,
      cached: latest
        ? {
            versionHash: latest.versionHash,
            generatedAt: latest.createdAt,
            pngUrl: `/api/roadmaps/${roadmapId}/infographic/png?v=${latest.versionHash}`,
            pdfUrl: `/api/roadmaps/${roadmapId}/infographic/pdf?v=${latest.versionHash}`,
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching infographic status");
    res.status(500).json({ error: "Failed to fetch infographic status" });
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
      const shareLink = await ensureActiveShareLink(roadmapId, profile.id);
      res.json({
        cached: true,
        versionHash,
        pngUrl: `/api/roadmaps/${roadmapId}/infographic/png?v=${versionHash}`,
        pdfUrl: `/api/roadmaps/${roadmapId}/infographic/pdf?v=${versionHash}`,
        shareUrl: buildShareUrl(shareLink.token),
        shareToken: shareLink.token,
        shareExpiresAt: shareLink.expiresAt,
      });
      return;
    }

    // First-time generation: count one AI cap unit
    const cap = await enforceAiCap(req.user.id);
    if (!cap.allowed) { res.status(cap.status).json({ error: cap.error }); return; }

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

    const shareLink = await ensureActiveShareLink(roadmapId, profile.id);
    res.json({
      cached: false,
      versionHash,
      pngUrl: `/api/roadmaps/${roadmapId}/infographic/png?v=${versionHash}`,
      pdfUrl: `/api/roadmaps/${roadmapId}/infographic/pdf?v=${versionHash}`,
      shareUrl: buildShareUrl(shareLink.token),
      shareToken: shareLink.token,
      shareExpiresAt: shareLink.expiresAt,
    });
  } catch (err) {
    req.log.error({ err }, "Error generating roadmap infographic");
    if (!res.headersSent) res.status(500).json({ error: "Failed to generate infographic" });
  }
});

// ─── Share links ─────────────────────────────────────────────────────────────

const SHARE_TTL_DAYS = 90;

function newShareToken(): string {
  return crypto.randomBytes(12).toString("base64url");
}

async function ensureActiveShareLink(roadmapId: number, profileId: number) {
  const now = new Date();
  const existing = await db
    .select()
    .from(roadmapShareLinksTable)
    .where(and(
      eq(roadmapShareLinksTable.roadmapId, roadmapId),
      isNull(roadmapShareLinksTable.revokedAt),
    ))
    .orderBy(desc(roadmapShareLinksTable.createdAt));
  const active = existing.find((r) => r.expiresAt > now);
  if (active) return active;

  const expiresAt = new Date(now.getTime() + SHARE_TTL_DAYS * 86400_000);
  const [created] = await db.insert(roadmapShareLinksTable).values({
    roadmapId,
    profileId,
    token: newShareToken(),
    expiresAt,
  }).returning();
  return created;
}

// Returns the most recently generated infographic row for this roadmap, or null.
async function findShareableInfographic(roadmapId: number) {
  const rows = await db
    .select()
    .from(roadmapInfographicsTable)
    .where(eq(roadmapInfographicsTable.roadmapId, roadmapId))
    .orderBy(desc(roadmapInfographicsTable.createdAt));
  return rows[0] ?? null;
}

// POST /api/roadmaps/:roadmapId/share — create or fetch active share link
router.post("/roadmaps/:roadmapId/share", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }
    const link = await ensureActiveShareLink(roadmapId, owner.roadmap.profileId);
    res.json({
      token: link.token,
      shareUrl: buildShareUrl(link.token),
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "Error creating share link");
    res.status(500).json({ error: "Failed to create share link" });
  }
});

// GET /api/roadmaps/:roadmapId/share — return current active share link (if any)
router.get("/roadmaps/:roadmapId/share", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }
    const now = new Date();
    const rows = await db
      .select()
      .from(roadmapShareLinksTable)
      .where(and(
        eq(roadmapShareLinksTable.roadmapId, roadmapId),
        isNull(roadmapShareLinksTable.revokedAt),
      ))
      .orderBy(desc(roadmapShareLinksTable.createdAt));
    const active = rows.find((r) => r.expiresAt > now);
    if (!active) { res.json({ active: null }); return; }
    res.json({
      active: {
        token: active.token,
        shareUrl: buildShareUrl(active.token),
        expiresAt: active.expiresAt,
        createdAt: active.createdAt,
      },
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching share link");
    res.status(500).json({ error: "Failed to fetch share link" });
  }
});

// DELETE /api/roadmaps/:roadmapId/share — revoke all active share links
router.delete("/roadmaps/:roadmapId/share", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const roadmapId = parseInt(req.params.roadmapId);
    const owner = await getOwnedRoadmap(roadmapId, req.user.id);
    if (!owner.ok) { res.status(owner.status).json({ error: owner.status === 403 ? "Forbidden" : "Roadmap not found" }); return; }
    await db
      .update(roadmapShareLinksTable)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(roadmapShareLinksTable.roadmapId, roadmapId),
        isNull(roadmapShareLinksTable.revokedAt),
      ));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error revoking share link");
    res.status(500).json({ error: "Failed to revoke share link" });
  }
});

// ─── Public share preview (no auth) ──────────────────────────────────────────

async function resolveShareToken(token: string): Promise<
  | { ok: true; link: typeof roadmapShareLinksTable.$inferSelect }
  | { ok: false; status: 404 | 410; error: string }
> {
  if (!token || token.length < 8 || token.length > 64) {
    return { ok: false, status: 404, error: "Share link not found" };
  }
  const [link] = await db
    .select()
    .from(roadmapShareLinksTable)
    .where(eq(roadmapShareLinksTable.token, token));
  if (!link) return { ok: false, status: 404, error: "Share link not found" };
  if (link.revokedAt) return { ok: false, status: 410, error: "This share link has been revoked by the student." };
  if (link.expiresAt <= new Date()) return { ok: false, status: 410, error: "This share link has expired." };
  return { ok: true, link };
}

// GET /api/share/roadmap/:token — counselor-facing preview metadata
router.get("/share/roadmap/:token", async (req, res) => {
  try {
    const resolved = await resolveShareToken(req.params.token);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }
    const { link } = resolved;
    const inputs = await gatherInfographicInputs(link.roadmapId);
    if (!inputs) { res.status(404).json({ error: "Roadmap not found" }); return; }
    const cached = await findShareableInfographic(link.roadmapId);
    res.json({
      studentName: inputs.profile.fullName ?? "Student",
      targetSchool: (() => {
        const r = (inputs.pathway?.reportJson ?? {}) as Record<string, unknown>;
        return typeof r.university === "string" && r.university
          ? r.university
          : (inputs.profile.targetUniversities?.[0] ?? "Target University");
      })(),
      major: inputs.profile.intendedMajor ?? "Undeclared",
      generatedAt: cached?.createdAt ?? inputs.roadmap.updatedAt ?? inputs.roadmap.createdAt,
      hasInfographic: !!cached,
      pngUrl: `/api/share/roadmap/${link.token}/png`,
      pdfUrl: `/api/share/roadmap/${link.token}/pdf`,
      expiresAt: link.expiresAt,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching shared roadmap");
    res.status(500).json({ error: "Failed to load shared roadmap" });
  }
});

// GET /api/share/roadmap/:token/:format — public download of cached PNG/PDF
router.get("/share/roadmap/:token/:format", async (req, res) => {
  try {
    const format = req.params.format;
    if (format !== "png" && format !== "pdf") {
      res.status(400).json({ error: "Invalid format" }); return;
    }
    const resolved = await resolveShareToken(req.params.token);
    if (!resolved.ok) { res.status(resolved.status).json({ error: resolved.error }); return; }
    const cached = await findShareableInfographic(resolved.link.roadmapId);
    if (!cached) { res.status(404).json({ error: "Infographic not generated yet" }); return; }
    const objectPath = format === "png" ? cached.pngObjectPath : cached.pdfObjectPath;
    const asset = await readInfographicAsset(objectPath);
    const filename = `pathwise-roadmap-${resolved.link.roadmapId}.${format}`;
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.setHeader("Content-Type", asset.contentType);
    res.setHeader("Content-Disposition", `${disposition}; filename="${filename}"`);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(asset.body);
  } catch (err) {
    req.log.error({ err }, "Error serving shared infographic");
    if (!res.headersSent) res.status(500).json({ error: "Failed to download infographic" });
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

    const requestedVersion = typeof req.query.v === "string" ? req.query.v : null;

    let cached: { pngObjectPath: string; pdfObjectPath: string; versionHash: string } | null = null;
    if (requestedVersion) {
      // If the caller asked for a specific version, only serve that exact version.
      // This preserves URL/version semantics: a stable URL must not silently serve
      // a different asset just because a newer one happens to exist.
      cached = await findCachedInfographic(roadmapId, requestedVersion);
      if (!cached) { res.status(404).json({ error: "Requested infographic version not found" }); return; }
    } else {
      // No explicit version requested: fall back to the most recent cached row so
      // that a stale (but still useful) infographic stays downloadable until the
      // user regenerates.
      const rows = await db
        .select()
        .from(roadmapInfographicsTable)
        .where(eq(roadmapInfographicsTable.roadmapId, roadmapId))
        .orderBy(desc(roadmapInfographicsTable.createdAt));
      const latest = rows[0];
      if (!latest) { res.status(404).json({ error: "Infographic not generated yet" }); return; }
      cached = {
        versionHash: latest.versionHash,
        pngObjectPath: latest.pngObjectPath,
        pdfObjectPath: latest.pdfObjectPath,
      };
    }

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
