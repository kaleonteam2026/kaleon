-- Migration: AI cost-cap tracking tables (Task #49).
-- These tables back the global+per-user+per-route AI cost caps and the
-- owner-only /admin/usage dashboard. Idempotent so existing dev DBs that
-- already have the tables (created via `drizzle-kit push`) are unaffected.

CREATE TABLE IF NOT EXISTS "ai_daily_usage" (
  "day" date PRIMARY KEY,
  "count" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "ai_user_daily_usage" (
  "day" date NOT NULL,
  "user_id" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("day", "user_id")
);

CREATE TABLE IF NOT EXISTS "ai_route_daily_usage" (
  "day" date NOT NULL,
  "route" text NOT NULL,
  "count" integer NOT NULL DEFAULT 0,
  PRIMARY KEY ("day", "route")
);
