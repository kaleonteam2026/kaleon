import { Router, type IRouter } from "express";
import { db, seoPagesTable, seoSignupClicksTable, articulationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  ALL_CCS,
  ALL_UNIS,
  ALL_MAJORS,
  findCC,
  findUni,
  findMajor,
  generatePage,
  uniSlug,
  SEED_ARTICULATIONS,
  articulationKey,
  hasVerifiedArticulation,
  gpaRangeFor,
  type ArticulationEntry,
  type CC,
  type Uni,
  type Major,
} from "../services/seoGenerator";
import { ssrShell, escapeHtml } from "../services/seoSsr";

const router: IRouter = Router();

// Trusted public origin for canonicals, OG, JSON-LD, and sitemap. Pinned via
// SEO_PUBLIC_ORIGIN; falls back to the first $REPLIT_DOMAINS host on https.
// Request Host/X-Forwarded-Proto are NEVER reflected, to prevent host-header
// poisoning from leaking into the persisted JSON-LD.
const ALLOWED_HOST_RE = /^[a-z0-9.-]+(?::\d{1,5})?$/i;
const PUBLIC_ORIGIN = (() => {
  const fromEnv = process.env.SEO_PUBLIC_ORIGIN?.trim();
  if (fromEnv && /^https?:\/\/[a-z0-9.-]+(?::\d{1,5})?$/i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  const firstDomain = process.env.REPLIT_DOMAINS?.split(",")[0]?.trim();
  if (firstDomain && ALLOWED_HOST_RE.test(firstDomain)) return `https://${firstDomain}`;
  return "http://localhost";
})();

function getOrigin(_req: unknown): string {
  return PUBLIC_ORIGIN;
}

function setCacheable(res: { setHeader: (k: string, v: string) => void }, seconds = 86400) {
  res.setHeader("Cache-Control", `public, max-age=${seconds}, stale-while-revalidate=${seconds * 7}`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
}

async function loadArticulation(cc: CC, uni: Uni, major: Major): Promise<{
  entry: ArticulationEntry | null;
  fetchedAt: Date | null;
}> {
  try {
    const rows = await db
      .select()
      .from(articulationsTable)
      .where(
        and(
          eq(articulationsTable.fromSlug, cc.slug),
          eq(articulationsTable.toSlug, uniSlug(uni)),
          eq(articulationsTable.majorSlug, major.slug),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (row) {
      return {
        entry: {
          agreementCycle: row.agreementCycle,
          rows: row.rows,
          sourceUrl: row.sourceUrl ?? undefined,
          fetchedAt: row.fetchedAt.toISOString(),
        },
        fetchedAt: row.fetchedAt,
      };
    }
  } catch {
    // DB not available — fall through to seed
  }
  const seed = SEED_ARTICULATIONS[articulationKey(cc, uni, major)];
  return { entry: seed ?? null, fetchedAt: null };
}

async function getOrCreatePage(cc: CC, uni: Uni, major: Major, origin: string) {
  const { entry: articulation, fetchedAt: artFetchedAt } = await loadArticulation(cc, uni, major);

  try {
    const existing = await db
      .select()
      .from(seoPagesTable)
      .where(
        and(
          eq(seoPagesTable.fromSlug, cc.slug),
          eq(seoPagesTable.toSlug, uniSlug(uni)),
          eq(seoPagesTable.majorSlug, major.slug),
        ),
      )
      .limit(1);
    const cached = existing[0];
    // Invalidate the cached page if the articulation has been refreshed since
    // the page was last rendered. This keeps articulation tables current with
    // the latest ASSIST.org agreement cycle.
    if (cached && (!artFetchedAt || cached.updatedAt >= artFetchedAt)) {
      return cached;
    }
  } catch {
    // DB not available — fall through to fresh generation
  }

  const generated = generatePage(cc, uni, major, origin, articulation);
  try {
    const [inserted] = await db
      .insert(seoPagesTable)
      .values({
        fromSlug: cc.slug,
        toSlug: uniSlug(uni),
        majorSlug: major.slug,
        title: generated.title,
        metaDescription: generated.metaDescription,
        contentHtml: generated.contentHtml,
        schemaJson: generated.schemaJson,
        wordCount: generated.wordCount,
      })
      .onConflictDoUpdate({
        target: [seoPagesTable.fromSlug, seoPagesTable.toSlug, seoPagesTable.majorSlug],
        set: {
          title: generated.title,
          metaDescription: generated.metaDescription,
          contentHtml: generated.contentHtml,
          schemaJson: generated.schemaJson,
          wordCount: generated.wordCount,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (inserted) return inserted;
  } catch {
    // ignore — return ephemeral
  }
  return {
    fromSlug: cc.slug,
    toSlug: uniSlug(uni),
    majorSlug: major.slug,
    title: generated.title,
    metaDescription: generated.metaDescription,
    contentHtml: generated.contentHtml,
    schemaJson: generated.schemaJson,
    wordCount: generated.wordCount,
  };
}

// Hub index — /transfer
//
// Only CCs that have at least one verified ASSIST articulation entry are
// linked from the hub / sitemap. This guarantees every live transfer page
// renders a real, dated articulation table — no generic-prose-only pages.
function ccHasAnyVerifiedCombo(cc: CC): boolean {
  for (const uni of ALL_UNIS) {
    for (const major of ALL_MAJORS) {
      if (hasVerifiedArticulation(cc, uni, major)) return true;
    }
  }
  return false;
}
function ccVerifiedUnis(cc: CC): Uni[] {
  return ALL_UNIS.filter((u) => ALL_MAJORS.some((m) => hasVerifiedArticulation(cc, u, m)));
}
function ccUniVerifiedMajors(cc: CC, uni: Uni): Major[] {
  return ALL_MAJORS.filter((m) => hasVerifiedArticulation(cc, uni, m));
}

router.get("/transfer", (req, res) => {
  const origin = getOrigin(req);
  const verifiedCCs = ALL_CCS.filter(ccHasAnyVerifiedCombo);
  const cards = verifiedCCs
    .map((cc) => {
      const unis = ccVerifiedUnis(cc);
      const combos = unis.reduce((sum, u) => sum + ccUniVerifiedMajors(cc, u).length, 0);
      return `<a class="dyp-card" href="/transfer/${escapeHtml(cc.slug)}">
      <h3>${escapeHtml(cc.name)}</h3>
      <p>${escapeHtml(cc.city)} · ${combos} verified ASSIST guide${combos === 1 ? "" : "s"} across ${unis.length} school${unis.length === 1 ? "" : "s"}</p>
    </a>`;
    })
    .join("");

  const body = `
    <div class="dyp-breadcrumbs"><a href="/">// HOME</a> / TRANSFER GUIDES</div>
    <h1>California CC Transfer Guides</h1>
    <p>Each guide is built on a real, dated ASSIST.org articulation table plus the most recent published transfer-admit GPA range from the UC Infocenter / CSU campus reports. We only publish a page when we have verified data for that combo — pick your community college to see the verified guides we have today.</p>
    <div class="dyp-grid">${cards}</div>
  `;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "California Community College Transfer Guides",
      url: `${origin}/transfer`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
        { "@type": "ListItem", position: 2, name: "Transfer Guides", item: `${origin}/transfer` },
      ],
    },
  ];

  setCacheable(res);
  res.send(
    ssrShell({
      title: "California CC Transfer Guides | DYP",
      description: `Verified ASSIST.org-backed transfer guides across ${verifiedCCs.length} California community colleges, with real articulation tables and current published transfer-admit GPA ranges.`,
      canonical: `${origin}/transfer`,
      origin,
      schemaJsons: schema.map((s) => JSON.stringify(s)),
      bodyHtml: body,
      ogType: "website",
    }),
  );
});

// CC index — /transfer/:fromSlug
router.get("/transfer/:fromSlug", (req, res) => {
  const cc = findCC(req.params.fromSlug);
  if (!cc) { res.status(404).send("Not found"); return; }
  const verifiedUnis = ccVerifiedUnis(cc);
  if (verifiedUnis.length === 0) { res.status(404).send("Not found"); return; }
  const origin = getOrigin(req);
  const cards = verifiedUnis
    .map((uni) => {
      const majorCount = ccUniVerifiedMajors(cc, uni).length;
      return `<a class="dyp-card" href="/transfer/${escapeHtml(cc.slug)}/${escapeHtml(uniSlug(uni))}">
      <h3>${escapeHtml(uni.name)}</h3>
      <p>${escapeHtml(uni.system)} · ${escapeHtml(uni.location)} · ${majorCount} verified major${majorCount === 1 ? "" : "s"}</p>
    </a>`;
    })
    .join("");

  const body = `
    <div class="dyp-breadcrumbs"><a href="/">// HOME</a> / <a href="/transfer">TRANSFER</a> / ${escapeHtml(cc.name.toUpperCase())}</div>
    <h1>Transfer from ${escapeHtml(cc.name)}</h1>
    <p>${escapeHtml(cc.name)} is in ${escapeHtml(cc.city)} (${escapeHtml(cc.district)}) and serves about ${cc.enrollment.toLocaleString()} students. Top transfer destinations include ${escapeHtml(cc.topTransferTo.join(", "))}. Pick your target school to see major-by-major guides.</p>
    <div class="dyp-grid">${cards}</div>
  `;
  setCacheable(res);
  res.send(
    ssrShell({
      title: `Transfer from ${cc.name} — UC & CSU guides | DYP`,
      description: `${cc.name} transfer guides for ${verifiedUnis.length} UC/CSU campus${verifiedUnis.length === 1 ? "" : "es"} with verified ASSIST.org articulation and Fall 2024 published admit GPA ranges.`,
      canonical: `${origin}/transfer/${cc.slug}`,
      origin,
      schemaJsons: [
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Transfer Guides", item: `${origin}/transfer` },
            { "@type": "ListItem", position: 2, name: cc.name, item: `${origin}/transfer/${cc.slug}` },
          ],
        }),
      ],
      bodyHtml: body,
      ogType: "website",
    }),
  );
});

// CC + Uni index — /transfer/:fromSlug/:toSlug
router.get("/transfer/:fromSlug/:toSlug", (req, res) => {
  const cc = findCC(req.params.fromSlug);
  const uni = findUni(req.params.toSlug);
  if (!cc || !uni) { res.status(404).send("Not found"); return; }
  const verifiedMajors = ccUniVerifiedMajors(cc, uni);
  if (verifiedMajors.length === 0) { res.status(404).send("Not found"); return; }
  const origin = getOrigin(req);
  const cards = verifiedMajors
    .map(
      (m) => `<a class="dyp-card" href="/transfer/${escapeHtml(cc.slug)}/${escapeHtml(uniSlug(uni))}/${escapeHtml(m.slug)}">
      <h3>${escapeHtml(m.name)}</h3>
      <p>${escapeHtml(m.category)} · target GPA ~${(uni.gpaRangeRecommended ?? 3.5).toFixed(2)}${m.impacted ? " · impacted" : ""}</p>
    </a>`,
    )
    .join("");

  const body = `
    <div class="dyp-breadcrumbs"><a href="/transfer">// TRANSFER</a> / <a href="/transfer/${escapeHtml(cc.slug)}">${escapeHtml(cc.name.toUpperCase())}</a> / ${escapeHtml(uni.name.toUpperCase())}</div>
    <h1>${escapeHtml(cc.name)} → ${escapeHtml(uni.name)}</h1>
    <p>Pick a major to see the full transfer guide from ${escapeHtml(cc.name)} to ${escapeHtml(uni.name)} (${escapeHtml(uni.system)}, ${escapeHtml(uni.location)}). Each guide covers GPA targets, prerequisites, IGETC strategy, and a 2-year pathway.</p>
    <div class="dyp-grid">${cards}</div>
  `;
  setCacheable(res);
  res.send(
    ssrShell({
      title: `${cc.name} → ${uni.name} transfer guides by major | DYP`,
      description: `${cc.name} to ${uni.name} transfer guides across ${verifiedMajors.length} verified major${verifiedMajors.length === 1 ? "" : "s"}: real ASSIST.org articulation rows and current published admit GPA ranges.`,
      canonical: `${origin}/transfer/${cc.slug}/${uniSlug(uni)}`,
      origin,
      schemaJsons: [
        JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Transfer Guides", item: `${origin}/transfer` },
            { "@type": "ListItem", position: 2, name: cc.name, item: `${origin}/transfer/${cc.slug}` },
            { "@type": "ListItem", position: 3, name: uni.name, item: `${origin}/transfer/${cc.slug}/${uniSlug(uni)}` },
          ],
        }),
      ],
      bodyHtml: body,
      ogType: "website",
    }),
  );
});

// Leaf page — /transfer/:fromSlug/:toSlug/:majorSlug
router.get("/transfer/:fromSlug/:toSlug/:majorSlug", async (req, res) => {
  const cc = findCC(req.params.fromSlug);
  const uni = findUni(req.params.toSlug);
  const major = findMajor(req.params.majorSlug);
  if (!cc || !uni || !major) { res.status(404).send("Not found"); return; }
  // Only render leaf transfer guides backed by a verified ASSIST articulation
  // (matches the sitemap surface). Combos without articulation 404 instead of
  // serving generic prereq prose.
  if (!hasVerifiedArticulation(cc, uni, major)) { res.status(404).send("Not found"); return; }

  const origin = getOrigin(req);
  const page = await getOrCreatePage(cc, uni, major, origin);
  const range = gpaRangeFor(uni, major);
  const gpaCell = range
    ? `${range.p25.toFixed(2)}–${range.p75.toFixed(2)} (median ${range.median.toFixed(2)}, Fall 2024 admits)`
    : `~${(uni.gpaRangeRecommended ?? 3.5).toFixed(2)} (campus-level estimate; published per-major range not yet ingested)`;

  const summary = `<div class="dyp-summary"><dl>
    <dt>From</dt><dd>${escapeHtml(cc.name)} (${escapeHtml(cc.city)})</dd>
    <dt>To</dt><dd>${escapeHtml(uni.name)} — ${escapeHtml(uni.system)}, ${escapeHtml(uni.location)}</dd>
    <dt>Major</dt><dd>${escapeHtml(major.name)}${major.impacted ? " · impacted" : ""}</dd>
    <dt>Admit GPA</dt><dd>${escapeHtml(gpaCell)}</dd>
  </dl></div>`;

  // Internal links — only surface combos that actually exist (have a verified
  // ASSIST articulation entry) so every related link resolves to a real page.
  const related = ALL_MAJORS.filter((m) => m.slug !== major.slug && hasVerifiedArticulation(cc, uni, m))
    .slice(0, 6)
    .map(
      (m) => `<li><a href="/transfer/${escapeHtml(cc.slug)}/${escapeHtml(uniSlug(uni))}/${escapeHtml(m.slug)}">${escapeHtml(cc.name)} → ${escapeHtml(uni.name)} for ${escapeHtml(m.name)}</a></li>`,
    )
    .join("");

  const otherSchools = ALL_UNIS.filter(
    (u) => uniSlug(u) !== uniSlug(uni) && hasVerifiedArticulation(cc, u, major),
  )
    .slice(0, 6)
    .map(
      (u) => `<li><a href="/transfer/${escapeHtml(cc.slug)}/${escapeHtml(uniSlug(u))}/${escapeHtml(major.slug)}">${escapeHtml(cc.name)} → ${escapeHtml(u.name)} for ${escapeHtml(major.name)}</a></li>`,
    )
    .join("");

  const relatedSection = related
    ? `<h2>Related guides at ${escapeHtml(uni.name)}</h2><ul>${related}</ul>`
    : "";
  const otherSchoolsSection = otherSchools
    ? `<h2>${escapeHtml(major.name)} at other schools</h2><ul>${otherSchools}</ul>`
    : "";
  const relatedBlock = related || otherSchools
    ? `<div class="dyp-related">${relatedSection}${otherSchoolsSection}</div>`
    : "";

  const body = `
    <div class="dyp-breadcrumbs"><a href="/transfer">// TRANSFER</a> / <a href="/transfer/${escapeHtml(cc.slug)}">${escapeHtml(cc.name.toUpperCase())}</a> / <a href="/transfer/${escapeHtml(cc.slug)}/${escapeHtml(uniSlug(uni))}">${escapeHtml(uni.name.toUpperCase())}</a> / ${escapeHtml(major.name.toUpperCase())}</div>
    <h1>Transfer from ${escapeHtml(cc.name)} to ${escapeHtml(uni.name)} for ${escapeHtml(major.name)}</h1>
    ${summary}
    ${page.contentHtml}
    ${relatedBlock}
    <div class="dyp-disclaimer">DYP is an AI-powered planning tool, not an official advisor. Articulation rows are sourced from ASSIST.org and admit GPA ranges from UC Infocenter / CSU campus reports; pathway commentary is AI-assisted. Verify with your community college counselor and ASSIST.org before making transfer decisions.</div>
  `;

  setCacheable(res);
  res.send(
    ssrShell({
      title: page.title,
      description: page.metaDescription,
      canonical: `${origin}/transfer/${cc.slug}/${uniSlug(uni)}/${major.slug}`,
      origin,
      schemaJsons: [page.schemaJson],
      bodyHtml: body,
    }),
  );
});

// Signup CTA tracker — only accepts known slug combos and an internal `next` path.
function safeInternalPath(raw: unknown): string {
  if (typeof raw !== "string") return "/";
  // Reject protocol-relative (//evil.com) and absolute (http://...) URLs.
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return "/";
  // Reject backslash tricks and control chars.
  if (/[\\\r\n\t]/.test(raw)) return "/";
  if (raw.length > 512) return "/";
  return raw;
}

router.get("/transfer-signup", async (req, res) => {
  const fromSlug = String(req.query.from ?? "");
  const toSlug = String(req.query.to ?? "");
  const majorSlug = String(req.query.major ?? "");
  const next = safeInternalPath(req.query.next);

  const cc = findCC(fromSlug);
  const uni = findUni(toSlug);
  const major = findMajor(majorSlug);
  if (cc && uni && major) {
    try {
      await db.insert(seoSignupClicksTable).values({
        fromSlug: cc.slug,
        toSlug: uniSlug(uni),
        majorSlug: major.slug,
        referrer: req.get("referer") ?? null,
        userAgent: req.get("user-agent") ?? null,
      });
    } catch (err) {
      req.log.warn({ err }, "Failed to log SEO signup click");
    }
  }
  res.redirect(302, next);
});

// robots.txt
router.get("/robots.txt", (req, res) => {
  const origin = getOrigin(req);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(`User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${origin}/sitemap.xml\n`);
});

// sitemap.xml — all combos
router.get("/sitemap.xml", (req, res) => {
  const origin = getOrigin(req);
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = [];
  urls.push(`<url><loc>${origin}/transfer</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  for (const cc of ALL_CCS) {
    const unis = ccVerifiedUnis(cc);
    if (unis.length === 0) continue;
    urls.push(`<url><loc>${origin}/transfer/${cc.slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`);
    for (const uni of unis) {
      const majors = ccUniVerifiedMajors(cc, uni);
      if (majors.length === 0) continue;
      urls.push(`<url><loc>${origin}/transfer/${cc.slug}/${uniSlug(uni)}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>`);
      for (const m of majors) {
        urls.push(`<url><loc>${origin}/transfer/${cc.slug}/${uniSlug(uni)}/${m.slug}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.5</priority></url>`);
      }
    }
  }
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
});

export default router;
