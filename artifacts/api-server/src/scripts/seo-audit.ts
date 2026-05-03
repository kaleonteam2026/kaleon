// SEO auditor: samples generated transfer pages and scores them.
// Usage: pnpm --filter @workspace/api-server exec tsx src/scripts/seo-audit.ts [origin]
import { ALL_CCS, ALL_UNIS, ALL_MAJORS, uniSlug } from "../services/seoGenerator";

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

async function main() {
  const origin = process.argv[2] ?? "http://localhost:80";
  const sample = pickSample();
  console.log(`# SEO Audit Report\n\nSampled ${sample.length} pages from ${origin}\n`);
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
  console.log(`\nResult: ${avg >= 90 && min >= 90 ? "PASS" : "FAIL"}`);
  process.exit(avg >= 90 && min >= 90 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
