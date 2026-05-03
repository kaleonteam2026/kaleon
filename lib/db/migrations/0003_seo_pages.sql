-- Migration: programmatic SEO transfer pages and signup CTA tracking (Task #15).

CREATE TABLE IF NOT EXISTS "seo_pages" (
  "id" serial PRIMARY KEY,
  "from_slug" text NOT NULL,
  "to_slug" text NOT NULL,
  "major_slug" text NOT NULL,
  "title" text NOT NULL,
  "meta_description" text NOT NULL,
  "content_html" text NOT NULL,
  "schema_json" text NOT NULL,
  "word_count" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "seo_pages_combo_idx"
  ON "seo_pages" ("from_slug", "to_slug", "major_slug");

CREATE TABLE IF NOT EXISTS "seo_signup_clicks" (
  "id" serial PRIMARY KEY,
  "from_slug" text NOT NULL,
  "to_slug" text NOT NULL,
  "major_slug" text NOT NULL,
  "referrer" text,
  "user_agent" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "seo_signup_clicks_combo_idx"
  ON "seo_signup_clicks" ("from_slug", "to_slug", "major_slug");
