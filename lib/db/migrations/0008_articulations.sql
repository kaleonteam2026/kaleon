-- Migration: ASSIST.org articulation cache (Task #38).
-- Stores per-(CC, UC/CSU, major) articulation rows pulled from ASSIST.org
-- agreements. The `fetched_at` timestamp drives `seo_pages` cache invalidation
-- so transfer guides refresh whenever a new agreement cycle is ingested.
-- Idempotent so dev DBs already migrated via `drizzle-kit push` are unaffected.

CREATE TABLE IF NOT EXISTS "articulations" (
  "id" serial PRIMARY KEY,
  "from_slug" text NOT NULL,
  "to_slug" text NOT NULL,
  "major_slug" text NOT NULL,
  "agreement_cycle" text NOT NULL,
  "rows" jsonb NOT NULL,
  "source_url" text,
  "fetched_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "articulations_combo_idx"
  ON "articulations" ("from_slug", "to_slug", "major_slug");
