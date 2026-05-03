// SEO auditor.
//
// Two passes:
//   1. Live HTTP audit — samples generated transfer pages over HTTP and
//      scores them against on-page SEO rules.
//   2. Long-tail content audit — runs `generatePage` directly (offline)
//      across every newly added community college (the 91 CCs added in
//      task #40, derived programmatically as ALL_CCS minus the first
//      25 seed entries). Asserts each generated page meets the >=400-
//      word bar, contains enough school-specific tokens to be unique,
//      and never falsely claims a verified ASSIST agreement when the
//      seed JSON has none.
//
// Usage:
//   pnpm --filter @workspace/api-server run audit:seo                # both passes
//   pnpm --filter @workspace/api-server run audit:seo http://...     # HTTP origin
//   pnpm --filter @workspace/api-server run audit:seo --offline      # skip HTTP pass
import { ALL_CCS, ALL_UNIS, ALL_MAJORS, uniSlug, generatePage, hasVerifiedArticulation } from "../services/seoGenerator";

const CHECKS = [
  ["doctype", (h: string) => /^<!DOCTYPE html>/i.test(h)],
  ["title >=20 chars", (h: string) => /<title>[^<]{20,}<\/title>/.test(h)],
  ["meta description >=120 chars", (h: string) => /<meta name="description" content="[^"]{120,}/.test(h)],
  ["canonical", (h: string) => /<link rel="canonical"/.test(h)],
  ["single H1", (h: string) => (h.match(/<h1>/g) || []).length === 1],
  [">=5 H2", (h: string) => (h.match(/<h2>/g) || []).length >= 5],
  ["og:title", (h: string) => /og:title/.test(h)],
  ["og:description", (h: string) => /og:description/.test(h)],
  ["og:type", (h: string) => /og:type/.test(h)],
  ["og:site_name", (h: string) => /og:site_name/.test(h)],
  ["twitter:card", (h: string) => /twitter:card/.test(h)],
  ["JSON-LD Article", (h: string) => /"@type":"Article"/.test(h)],
  ["JSON-LD BreadcrumbList", (h: string) => /"@type":"BreadcrumbList"/.test(h)],
  ["JSON-LD FAQPage", (h: string) => /"@type":"FAQPage"/.test(h)],
  ["viewport", (h: string) => /name="viewport"/.test(h)],
  ["theme-color", (h: string) => /name="theme-color"/.test(h)],
  ["fonts.gstatic preconnect", (h: string) => /preconnect.*fonts\.gstatic/.test(h)],
  ["async font load", (h: string) => /media="print" onload/.test(h)],
  ["breadcrumbs HTML", (h: string) => /dyp-breadcrumbs/.test(h)],
  [">=5 internal /transfer/ links", (h: string) => (h.match(/href="\/transfer\//g) || []).length >= 5],
  ["signup CTA wired", (h: string) => /\/transfer-signup\?/.test(h)],
] as const;

function wordCount(html: string): number {
  return html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

async function auditUrl(origin: string, path: string) {
  const res = await fetch(`${origin}${path}`);
  const html = await res.text();
  const failed: string[] = CHECKS.filter(([, fn]) => !fn(html)).map(([n]) => n);
  const words = wordCount(html);
  if (words < 400) failed.push(`word count ${words} < 400`);
  const passed = CHECKS.length + 1 - failed.length;
  const score = Math.round((passed / (CHECKS.length + 1)) * 100);
  return { path, score, words, failed };
}

function pickSample() {
  const sample: { from: string; to: string; major: string }[] = [];
  const ccPicks = [0, 4, 9, 14, 19, 24];
  const uniPicks = [0, 5, 9, 12, 14];
  const majorPicks = [0, 1, 5, 11, 18];
  for (const i of ccPicks) for (const j of uniPicks) for (const k of majorPicks)
    sample.push({ from: ALL_CCS[i]!.slug, to: uniSlug(ALL_UNIS[j]!), major: ALL_MAJORS[k]!.slug });
  return sample;
}

async function httpAudit(origin: string): Promise<boolean> {
  const sample = pickSample();
  console.log(`# SEO Audit Report — Live HTTP\n\nSampled ${sample.length} pages from ${origin}\n`);
  console.log(`| Path | Score | Words | Failures |\n|---|---|---|---|`);
  let total = 0;
  let min = 100;
  for (const s of sample) {
    const r = await auditUrl(origin, `/transfer/${s.from}/${s.to}/${s.major}`);
    total += r.score;
    if (r.score < min) min = r.score;
    console.log(`| ${r.path} | **${r.score}** | ${r.words} | ${r.failed.length ? r.failed.join(", ") : "—"} |`);
  }
  const avg = Math.round(total / sample.length);
  console.log(`\n**Average score: ${avg}/100**  · **Worst: ${min}/100** · Pass threshold: 90`);
  console.log(`Result: ${avg >= 90 && min >= 90 ? "PASS" : "FAIL"}\n`);
  return avg >= 90 && min >= 90;
}

// Long-tail content audit: every newly added CC (everything beyond the
// original 25 seed entries) crossed with a representative sample of
// UCs/CSUs and majors. Runs offline via generatePage so it does not
// depend on the API server being up.
const SEED_COUNT = 25;
const MIN_WORDS = 400;
const MIN_UNIQUE_TOKENS = 6;
const SAMPLE_UNI_IDS = ["ucla", "ucdavis", "sjsu", "ucirvine", "csulb"];
const SAMPLE_MAJOR_SLUGS = ["computer-science", "psychology", "business-administration", "biology"];

interface ContentFailure { kind: string; combo: string; detail: string }

function offlineContentAudit(): boolean {
  const newCcs = ALL_CCS.slice(SEED_COUNT);
  const failures: ContentFailure[] = [];
  const fallbackWords: number[] = [];
  const verifiedClaims: string[] = [];
  const introSeen = new Map<string, string>();
  let checked = 0;

  const unis = SAMPLE_UNI_IDS.map((id) => ALL_UNIS.find((u) => u.id === id)!).filter(Boolean);
  const majors = SAMPLE_MAJOR_SLUGS.map((s) => ALL_MAJORS.find((m) => m.slug === s)!).filter(Boolean);

  for (const cc of newCcs) {
    for (const uni of unis) {
      for (const major of majors) {
        const combo = `${cc.slug}/${uniSlug(uni)}/${major.slug}`;
        const page = generatePage(cc, uni, major, "https://example.com");
        checked++;

        if (page.wordCount < MIN_WORDS) {
          failures.push({ kind: "word-count", combo, detail: `${page.wordCount} < ${MIN_WORDS}` });
        }

        const tokens = [
          cc.name, cc.city, cc.district, cc.honors,
          ...cc.strengths, ...cc.topTransferTo,
          cc.enrollment.toLocaleString(),
        ];
        const present = tokens.filter((t) => t && page.contentHtml.includes(t)).length;
        if (present < MIN_UNIQUE_TOKENS) {
          failures.push({ kind: "uniqueness", combo, detail: `only ${present} CC-specific tokens (need >= ${MIN_UNIQUE_TOKENS})` });
        }

        const isSeeded = hasVerifiedArticulation(cc, uni, major);
        const schema = JSON.parse(page.schemaJson) as Array<{ ["@type"]?: string; mainEntity?: Array<{ name: string; acceptedAnswer: { text: string } }> }>;
        const faq = schema.find((s) => s["@type"] === "FAQPage");
        const articulationQ = faq?.mainEntity?.find((q) => q.name.includes("articulation agreement"));
        const answer = articulationQ?.acceptedAnswer.text ?? "";
        const claimsVerified = /^Yes —/.test(answer);
        if (!isSeeded) {
          fallbackWords.push(page.wordCount);
          if (claimsVerified) {
            failures.push({ kind: "false-verified-claim", combo, detail: `FAQ claims verified articulation though seed has none` });
            verifiedClaims.push(combo);
          }
        }

        const intro = page.contentHtml.slice(0, 240);
        const key = `${uniSlug(uni)}/${major.slug}::${intro}`;
        const existing = introSeen.get(key);
        if (existing && existing !== cc.slug) {
          failures.push({ kind: "duplicate-intro", combo, detail: `intro matches ${existing}` });
        }
        introSeen.set(key, cc.slug);
      }
    }
  }

  const minW = fallbackWords.length ? Math.min(...fallbackWords) : 0;
  const maxW = fallbackWords.length ? Math.max(...fallbackWords) : 0;

  console.log(`# SEO Audit Report — Long-tail Content\n`);
  console.log(`Newly added CCs:      ${newCcs.length} (ALL_CCS[${SEED_COUNT}..])`);
  console.log(`Sampled combinations: ${checked}  (${newCcs.length} CCs × ${unis.length} unis × ${majors.length} majors)`);
  console.log(`Fallback pages:       ${fallbackWords.length}`);
  console.log(`Word range:           ${minW} – ${maxW}  (min required: ${MIN_WORDS})`);
  console.log(`False verified claims: ${verifiedClaims.length}`);
  console.log(`Failures:             ${failures.length}`);
  if (failures.length > 0) {
    for (const f of failures.slice(0, 30)) console.log(`  ✗ [${f.kind}] ${f.combo}: ${f.detail}`);
    if (failures.length > 30) console.log(`  …and ${failures.length - 30} more`);
    console.log(`\nResult: FAIL`);
    return false;
  }
  console.log(`\nResult: PASS`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const offlineOnly = args.includes("--offline");
  const httpOnly = args.includes("--http-only");
  const origin = args.find((a) => /^https?:/.test(a)) ?? "http://localhost:80";

  let httpOk = true;
  let contentOk = true;

  if (!offlineOnly) {
    try {
      httpOk = await httpAudit(origin);
    } catch (err) {
      console.error(`HTTP audit could not reach ${origin}: ${(err as Error).message}`);
      httpOk = false;
    }
  }
  if (!httpOnly) {
    contentOk = offlineContentAudit();
  }

  process.exit(httpOk && contentOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
