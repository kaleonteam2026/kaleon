import { date, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const aiDailyUsage = pgTable("ai_daily_usage", {
  day: date("day").primaryKey(),
  count: integer("count").notNull().default(0),
});

export type AiDailyUsage = typeof aiDailyUsage.$inferSelect;

export const aiUserDailyUsage = pgTable(
  "ai_user_daily_usage",
  {
    day: date("day").notNull(),
    userId: text("user_id").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.day, t.userId] }),
  }),
);

export type AiUserDailyUsage = typeof aiUserDailyUsage.$inferSelect;
