import communityColleges from "../data/community-colleges.json" assert { type: "json" };
import universitiesRaw from "../data/universities.json" assert { type: "json" };
import majors from "../data/transfer-majors.json" assert { type: "json" };
import articulationsRaw from "../data/articulations.json" assert { type: "json" };

interface ArticulationEntry {
  agreementCycle: string;
  rows: string[][];
}
const ARTICULATIONS: Record<string, ArticulationEntry> = Object.fromEntries(
  Object.entries(articulationsRaw as Record<string, unknown>).filter(
    (entry): entry is [string, ArticulationEntry] =>
      !entry[0].startsWith("_") &&
      typeof entry[1] === "object" &&
      entry[1] !== null &&
      Array.isArray((entry[1] as ArticulationEntry).rows),
  ),
);

export interface CC {
  slug: string;
  name: string;
  city: string;
  district: string;
  enrollment: number;
  transferRank: number;
  topTransferTo: string[];
  strengths: string[];
  honors: string;
}

export interface Uni {
  id: string;
  name: string;
  system: string;
  location: string;
  gpaRangeMin?: number;
  gpaRangeRecommended?: number;
  honorsAvailable?: boolean;
  researchAvailable?: boolean;
  internshipAccess?: string;
  officialTransferUrl?: string;
  notes?: string;
  majors?: string[];
}

export interface Major {
  slug: string;
  name: string;
  category: string;
  avgGpa: number;
  impacted: boolean;
  prereqHint: string;
  careers: string[];
}

const TOP_UNIVERSITY_IDS = [
  "ucla", "ucberkeley", "ucsandiego", "ucdavis", "ucirvine", "ucsb",
  "ucsc", "ucriverside", "ucmerced",
  "sdsu", "sjsu", "calpolyslo", "csulb", "csuf", "csunorthridge",
];

export const ALL_CCS: CC[] = communityColleges as CC[];
export const ALL_MAJORS: Major[] = majors as Major[];
export const ALL_UNIS: Uni[] = (universitiesRaw as Uni[]).filter((u) =>
  TOP_UNIVERSITY_IDS.includes(u.id),
);

export function uniSlug(uni: Uni): string {
  return uni.id.replace(/_/g, "-");
}

export function findCC(slug: string): CC | undefined {
  return ALL_CCS.find((c) => c.slug === slug);
}

export function findUni(slug: string): Uni | undefined {
  return ALL_UNIS.find((u) => uniSlug(u) === slug);
}

export function findMajor(slug: string): Major | undefined {
  return ALL_MAJORS.find((m) => m.slug === slug);
}

function gpaTarget(uni: Uni, major: Major): number {
  const base = uni.gpaRangeRecommended ?? 3.5;
  const bump = major.impacted ? 0.1 : 0;
  return Math.min(4.0, Math.round((base + bump) * 100) / 100);
}

function igetcGuidance(major: Major): string {
  if (major.category === "STEM" || major.category === "Health") {
    return "Most STEM and health majors at the UC follow IGETC for STEM, which lets you defer one Area 3 (Arts/Humanities) course or one Area 4 (Social Science) course until after transfer. CSU GE-Breadth is generally a smoother fit for CSU-bound students in these majors.";
  }
  if (major.category === "Business") {
    return "Business majors often complete IGETC in full but should prioritize lower-division business prerequisites (accounting, micro/macro, business calculus, statistics) before GE polish. The CSU pre-business pattern is well aligned with most CC business associate degrees.";
  }
  return "Completing the full IGETC pattern is generally the strongest path for this major. It satisfies lower-division GE for both UC and CSU, which keeps your options open if you decide to pivot between systems.";
}

function articulationParagraph(cc: CC, uni: Uni, major: Major): string {
  const isStem = major.category === "STEM" || major.category === "Health";
  const seq = isStem ? "math, science, and engineering sequences" : "lower-division major preparation";
  return `For ${major.name} transfers from ${cc.name} to ${uni.name}, ASSIST.org is the official source of articulation. Confirm each course on your worksheet against the most recent agreement, because catalog updates can move courses in or out of articulation between cycles. Pay special attention to ${seq}: those tend to drive the largest part of competitiveness in the ${uni.system} review.`;
}

function honorsParagraph(cc: CC, uni: Uni): string {
  const tap = uni.id === "ucla" ? "UCLA's Transfer Alliance Program (TAP) gives priority review to certified honors students from participating California community colleges. " : "";
  return `${cc.name} runs an honors track (${cc.honors}) that can pair well with this transfer pathway. ${tap}Honors certification is not required to be admitted to ${uni.name}, but it is a useful signal of academic readiness, especially for ${uni.system === "UC" ? "competitive UC majors" : "CSU impacted majors"}.`;
}

function gpaParagraph(uni: Uni, major: Major): string {
  const target = gpaTarget(uni, major);
  const minBase = (uni.gpaRangeMin ?? 3.0).toFixed(1);
  return `Recent ${uni.name} transfer admits in ${major.name} have generally landed around a ${target.toFixed(2)} cumulative transferable GPA, with the published minimum closer to a ${minBase}${major.impacted ? "  Because " + major.name + " is an impacted or selective major, the realistic working target is well above the minimum, and major-prep GPA is weighted especially heavily." : "  This major is not currently flagged as impacted, but a strong major-prep GPA still meaningfully improves admission odds."}`;
}

function pathwayParagraph(cc: CC, uni: Uni, major: Major): string {
  const tag = uni.system === "UC" && uni.id !== "ucla" && uni.id !== "ucberkeley" && uni.id !== "ucsandiego"
    ? `${uni.name} participates in the UC Transfer Admission Guarantee (TAG) for many majors. TAG is one of the highest-leverage tools available to ${cc.name} students because it converts admission from a probability into a contract when GPA, unit, and major-prep requirements are met early enough. `
    : uni.system === "UC"
      ? `${uni.name} does not currently offer TAG for ${major.name}, so admission is reviewed holistically. `
      : `${uni.name} uses the CSU eligibility index combined with major-specific supplemental criteria. The Associate Degree for Transfer (ADT) pattern, where available for ${major.name}, gives priority admission with junior standing. `;
  return `${tag}A typical 2-year pathway from ${cc.name} for ${major.name} starts with English composition and the first math/science prerequisite in semester one, layers in major prerequisites and IGETC area courses across semesters two and three, and finishes with the remaining major prep alongside transferable electives in semester four. Students who arrive needing pre-transfer math typically extend to a 3-year plan and use summer terms to stay competitive.`;
}

function careersParagraph(major: Major, uni: Uni): string {
  return `Common destinations after a ${major.name} degree from ${uni.name} include ${major.careers.slice(0, 3).join(", ")}, and ${major.careers[major.careers.length - 1]}. ${uni.name}${uni.internshipAccess === "high" ? " has strong internship and on-campus research access" : " has a developing internship pipeline"}, which matters because junior- and senior-year experience is what most employers and graduate programs actually evaluate.`;
}

function cautionsParagraph(uni: Uni, major: Major): string {
  const cautions: string[] = [];
  if (major.impacted) cautions.push(`${major.name} is impacted at most ${uni.system} campuses, including ${uni.name} — file your TAU/application in the priority window`);
  if (uni.notes) cautions.push(uni.notes);
  cautions.push("Verify everything against ASSIST.org and the campus's transfer admissions page for your application year");
  cautions.push("AI-generated GPA targets and pathway notes are estimates from public data and should be confirmed with your community college transfer counselor");
  return cautions.map((c) => `• ${c}`).join("<br />");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface GeneratedPage {
  title: string;
  metaDescription: string;
  contentHtml: string;
  schemaJson: string;
  wordCount: number;
  canonicalPath: string;
}

export function generatePage(cc: CC, uni: Uni, major: Major, origin: string): GeneratedPage {
  const target = gpaTarget(uni, major);
  const canonicalPath = `/transfer/${cc.slug}/${uniSlug(uni)}/${major.slug}`;
  const title = `Transfer from ${cc.name} to ${uni.name} ${major.name} | DYP`;
  const metaDescription = `Step-by-step transfer guide from ${cc.name} to ${uni.name} for ${major.name}: GPA target (~${target.toFixed(2)}), prerequisites, IGETC strategy, and a 2-year pathway. Built for CA community college students.`;

  const intro = `<p>This guide walks ${cc.name} students through the transfer pathway to <strong>${uni.name}</strong> for a <strong>${major.name}</strong> major. ${cc.name} sits in ${cc.city} and serves roughly ${cc.enrollment.toLocaleString()} students, with ${cc.strengths.includes(major.name) || cc.strengths.some((s) => major.name.toLowerCase().includes(s.toLowerCase())) ? `documented strength in ${major.name}` : `transfer strength in ${cc.strengths.slice(0, 3).join(", ")}`}. ${uni.name} (${uni.system}, ${uni.location}) is one of the more common transfer destinations for students in this region, and the ${major.name} pathway has its own quirks worth planning around.</p>`;

  const articulationKey = `${cc.slug}__${uniSlug(uni)}__${major.slug}`;
  const articulation = ARTICULATIONS[articulationKey];
  const articulationTable = articulation
    ? `<table style="width:100%;border-collapse:collapse;margin:12px 0 16px;font-size:14px"><thead><tr style="background:#0f172a;color:#fff"><th style="padding:8px;text-align:left">${escapeHtml(cc.name)} course</th><th style="padding:8px;text-align:left">Title</th><th style="padding:8px;text-align:left">${escapeHtml(uni.name)} equivalent</th></tr></thead><tbody>${articulation.rows
        .map(
          (r, i) =>
            `<tr style="background:${i % 2 ? "#fff" : "#f1f5f9"}"><td style="padding:8px;border:1px solid #cbd5e1"><strong>${escapeHtml(r[0] ?? "")}</strong></td><td style="padding:8px;border:1px solid #cbd5e1">${escapeHtml(r[1] ?? "")}</td><td style="padding:8px;border:1px solid #cbd5e1">${escapeHtml(r[2] ?? "")}</td></tr>`,
        )
        .join("")}</tbody></table><p style="font-size:12px;color:#64748b">Articulation cycle: ${escapeHtml(articulation.agreementCycle)}. Always confirm against the latest ASSIST.org agreement before enrolling.</p>`
    : "";

  const sections = [
    `<h2>GPA target and competitiveness</h2><p>${gpaParagraph(uni, major)}</p>`,
    `<h2>Prerequisites and major preparation</h2><p>The core ${major.name} prerequisites typically include: ${major.prereqHint}. From ${cc.name}, you will translate these to the locally numbered courses through ASSIST.org. ${articulationParagraph(cc, uni, major)}</p>${articulation ? `<p><strong>Verified articulation (${escapeHtml(articulation.agreementCycle)} cycle):</strong> the table below reflects the published ASSIST.org agreement for this combo.</p>${articulationTable}` : `<p><em>This combo does not yet have a verified course-level articulation table on this page; the prerequisites above describe the typical major-prep pattern. Always pull the latest agreement from ASSIST.org for the exact ${cc.name} → ${uni.name} ${major.name} course numbers.</em></p>`}`,
    `<h2>IGETC vs CSU GE-Breadth</h2><p>${igetcGuidance(major)}</p>`,
    `<h2>2-year pathway from ${cc.name}</h2><p>${pathwayParagraph(cc, uni, major)}</p>`,
    `<h2>Honors and selectivity boosts</h2><p>${honorsParagraph(cc, uni)}</p>`,
    `<h2>Career paths after ${uni.name}</h2><p>${careersParagraph(major, uni)}</p>`,
    `<h2>Things to verify before you apply</h2><p>${cautionsParagraph(uni, major)}</p>`,
  ];

  const nextUrl = `/?utm_source=seo&utm_medium=organic&utm_campaign=transfer-guide&utm_content=${encodeURIComponent(`${cc.slug}__${uniSlug(uni)}__${major.slug}`)}`;
  const ctaUrl = `/transfer-signup?from=${encodeURIComponent(cc.slug)}&to=${encodeURIComponent(uniSlug(uni))}&major=${encodeURIComponent(major.slug)}&next=${encodeURIComponent(nextUrl)}`;
  const cta = `<section class="dyp-cta"><h2>Build your personal plan</h2><p>DYP turns this guide into a personalized roadmap based on your GPA, completed coursework, financial situation, and target schools. It is free to start.</p><p><a class="dyp-cta-btn" href="${escapeHtml(ctaUrl)}" data-cta="signup" rel="nofollow">Start your free transfer plan →</a></p></section>`;

  const articleBody = `${intro}${sections.join("")}${cta}`;
  const wordCount = articleBody.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;

  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: `Transfer from ${cc.name} to ${uni.name} for ${major.name}`,
      description: metaDescription,
      datePublished: new Date().toISOString().slice(0, 10),
      dateModified: new Date().toISOString().slice(0, 10),
      author: { "@type": "Organization", name: "DYP — Do Your Path" },
      publisher: { "@type": "Organization", name: "DYP — Do Your Path" },
      mainEntityOfPage: { "@type": "WebPage", "@id": `${origin}${canonicalPath}` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Transfer Guides", item: `${origin}/transfer` },
        { "@type": "ListItem", position: 2, name: cc.name, item: `${origin}/transfer/${cc.slug}` },
        { "@type": "ListItem", position: 3, name: uni.name, item: `${origin}/transfer/${cc.slug}/${uniSlug(uni)}` },
        { "@type": "ListItem", position: 4, name: major.name, item: `${origin}${canonicalPath}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What GPA do I need to transfer from ${cc.name} to ${uni.name} for ${major.name}?`,
          acceptedAnswer: { "@type": "Answer", text: `Recent admits typically present around a ${target.toFixed(2)} cumulative transferable GPA, with the published minimum closer to ${(uni.gpaRangeMin ?? 3.0).toFixed(1)}.` },
        },
        {
          "@type": "Question",
          name: `Is ${major.name} impacted at ${uni.name}?`,
          acceptedAnswer: { "@type": "Answer", text: major.impacted ? `Yes — ${major.name} is selective at most ${uni.system} campuses, including ${uni.name}. Plan for major-prep completion in the priority window.` : `${major.name} is not currently flagged as impacted at ${uni.name}, but a strong GPA still helps.` },
        },
        {
          "@type": "Question",
          name: `Does ${cc.name} have an articulation agreement with ${uni.name}?`,
          acceptedAnswer: { "@type": "Answer", text: `Yes. Articulation between ${cc.name} and ${uni.name} is published on ASSIST.org. Always confirm against the most recent year before relying on a course substitution.` },
        },
      ],
    },
  ];

  const schemaJson = JSON.stringify(schema);

  return { title, metaDescription, contentHtml: articleBody, schemaJson, wordCount, canonicalPath };
}
