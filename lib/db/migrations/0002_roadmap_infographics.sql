-- Migration: persist roadmap infographic cache (Task #14).
--
-- Stores object-storage paths for generated PNG/PDF roadmap infographics,
-- keyed by (roadmap, version_hash) so re-downloads of an unchanged roadmap
-- skip both regeneration and the global AI cap.
--
-- This DDL is also covered by `pnpm --filter @workspace/db run push`
-- (which the repo's post-merge script runs on deploy), but is checked
-- in here as the canonical reference for the schema change.

CREATE TABLE IF NOT EXISTS "roadmap_infographics" (
  "id" serial PRIMARY KEY,
  "roadmap_id" integer NOT NULL REFERENCES "academic_roadmaps"("id"),
  "profile_id" integer NOT NULL REFERENCES "student_profiles"("id"),
  "version_hash" text NOT NULL,
  "png_object_path" text NOT NULL,
  "pdf_object_path" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "roadmap_infographics_roadmap_version_idx"
  ON "roadmap_infographics" ("roadmap_id", "version_hash");
