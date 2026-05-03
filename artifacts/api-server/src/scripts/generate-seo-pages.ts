// Upserts every (CC × UC/CSU × major) combo into `seo_pages`. Idempotent.
// Usage: pnpm --filter @workspace/api-server exec tsx src/scripts/generate-seo-pages.ts [origin]
import { db, seoPagesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ALL_CCS, ALL_UNIS, ALL_MAJORS, generatePage, uniSlug } from "../services/seoGenerator";

async function main() {
  const origin = process.argv[2] ?? "https://dyp.app";
  const total = ALL_CCS.length * ALL_UNIS.length * ALL_MAJORS.length;
  console.log(`Generating ${total.toLocaleString()} SEO pages (origin=${origin})…`);

  let done = 0;
  let inserted = 0;
  let updated = 0;
  for (const cc of ALL_CCS) {
    for (const uni of ALL_UNIS) {
      for (const major of ALL_MAJORS) {
        const page = generatePage(cc, uni, major, origin);
        const result = await db
          .insert(seoPagesTable)
          .values({
            fromSlug: cc.slug,
            toSlug: uniSlug(uni),
            majorSlug: major.slug,
            title: page.title,
            metaDescription: page.metaDescription,
            contentHtml: page.contentHtml,
            schemaJson: page.schemaJson,
            wordCount: page.wordCount,
          })
          .onConflictDoUpdate({
            target: [seoPagesTable.fromSlug, seoPagesTable.toSlug, seoPagesTable.majorSlug],
            set: {
              title: page.title,
              metaDescription: page.metaDescription,
              contentHtml: page.contentHtml,
              schemaJson: page.schemaJson,
              wordCount: page.wordCount,
              updatedAt: new Date(),
            },
          })
          .returning({ id: seoPagesTable.id, createdAt: seoPagesTable.createdAt, updatedAt: seoPagesTable.updatedAt });
        const row = result[0];
        if (row && row.createdAt.getTime() === row.updatedAt.getTime()) inserted++;
        else updated++;
        done++;
        if (done % 500 === 0) console.log(`  ${done}/${total}…`);
      }
    }
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(seoPagesTable);
  console.log(`Done. inserted=${inserted} updated=${updated} total_in_db=${count}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
