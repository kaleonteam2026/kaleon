import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const seoPagesTable = pgTable(
  "seo_pages",
  {
    id: serial("id").primaryKey(),
    fromSlug: text("from_slug").notNull(),
    toSlug: text("to_slug").notNull(),
    majorSlug: text("major_slug").notNull(),
    title: text("title").notNull(),
    metaDescription: text("meta_description").notNull(),
    contentHtml: text("content_html").notNull(),
    schemaJson: text("schema_json").notNull(),
    wordCount: integer("word_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull().$onUpdate(() => new Date()),
  },
  (t) => ({
    comboIdx: uniqueIndex("seo_pages_combo_idx").on(t.fromSlug, t.toSlug, t.majorSlug),
  }),
);

export const seoSignupClicksTable = pgTable("seo_signup_clicks", {
  id: serial("id").primaryKey(),
  fromSlug: text("from_slug").notNull(),
  toSlug: text("to_slug").notNull(),
  majorSlug: text("major_slug").notNull(),
  referrer: text("referrer"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SeoPage = typeof seoPagesTable.$inferSelect;
export type SeoSignupClick = typeof seoSignupClicksTable.$inferSelect;
