-- Migration: persona + UTM attribution columns on users (Task #34).
-- Captures first-touch ad attribution at signup so cohort performance can be analyzed.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "persona" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "utm_source" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "utm_medium" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "utm_campaign" varchar;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "utm_content" varchar;
