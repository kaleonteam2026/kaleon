-- Migration: short, signed share links for roadmap infographics (Task #35).
--
-- Each row is one share token a student has minted for a given roadmap.
-- Tokens are unique, expire after a fixed TTL (90 days), and can be
-- revoked by setting `revoked_at`. Public preview/download endpoints
-- look up rows by token and treat revoked or expired rows as 410.
--
-- This DDL is also covered by `pnpm --filter @workspace/db run push`
-- (which the repo's post-merge script runs on deploy), but is checked
-- in here as the canonical reference for the schema change.

CREATE TABLE IF NOT EXISTS "roadmap_share_links" (
  "id" serial PRIMARY KEY,
  "roadmap_id" integer NOT NULL REFERENCES "academic_roadmaps"("id"),
  "profile_id" integer NOT NULL REFERENCES "student_profiles"("id"),
  "token" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "revoked_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "roadmap_share_links_token_idx"
  ON "roadmap_share_links" ("token");
