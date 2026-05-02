import { pgTable, text, integer, timestamp, json, primaryKey } from "drizzle-orm/pg-core";

/**
 * Persisted Tavily live-search response cache.
 * 24h TTL is enforced in application code on read.
 */
export const liveSearchCacheTable = pgTable(
  "live_search_cache",
  {
    endpoint: text("endpoint").notNull(),
    normalizedQuery: text("normalized_query").notNull(),
    result: json("result").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.endpoint, t.normalizedQuery] }),
  }),
);

/**
 * Persisted Tavily usage state.
 *
 * A single table holds two kinds of rows, distinguished by `kind`:
 *   - kind="user", key=<userId>     → `last_call_at` tracks the per-user cooldown.
 *   - kind="day",  key=<YYYY-MM-DD> → `count` tracks the global daily quota for that UTC day.
 */
export const liveSearchUsageTable = pgTable(
  "live_search_usage",
  {
    kind: text("kind").notNull(),
    key: text("key").notNull(),
    lastCallAt: timestamp("last_call_at", { withTimezone: true }),
    count: integer("count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.kind, t.key] }),
  }),
);

export type LiveSearchCacheRow = typeof liveSearchCacheTable.$inferSelect;
export type LiveSearchUsageRow = typeof liveSearchUsageTable.$inferSelect;
