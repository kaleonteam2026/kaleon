import { pgTable, text, serial, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articulationsTable = pgTable(
  "articulations",
  {
    id: serial("id").primaryKey(),
    fromSlug: text("from_slug").notNull(),
    toSlug: text("to_slug").notNull(),
    majorSlug: text("major_slug").notNull(),
    agreementCycle: text("agreement_cycle").notNull(),
    rows: jsonb("rows").$type<string[][]>().notNull(),
    sourceUrl: text("source_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    comboIdx: uniqueIndex("articulations_combo_idx").on(t.fromSlug, t.toSlug, t.majorSlug),
  }),
);

export const insertArticulationSchema = createInsertSchema(articulationsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertArticulation = z.infer<typeof insertArticulationSchema>;
export type Articulation = typeof articulationsTable.$inferSelect;
