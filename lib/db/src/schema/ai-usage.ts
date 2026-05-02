import { date, integer, pgTable } from "drizzle-orm/pg-core";

export const aiDailyUsage = pgTable("ai_daily_usage", {
  day: date("day").primaryKey(),
  count: integer("count").notNull().default(0),
});

export type AiDailyUsage = typeof aiDailyUsage.$inferSelect;
