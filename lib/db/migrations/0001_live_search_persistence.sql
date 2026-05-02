-- Migration: persist Tavily live-search cache and rate-limit/quota state.
--
-- This DDL is also covered by `pnpm --filter @workspace/db run push`
-- (which the repo's post-merge script runs on deploy), but is checked
-- in here as the canonical reference for the schema change in task #3.

CREATE TABLE IF NOT EXISTS "live_search_cache" (
  "endpoint" text NOT NULL,
  "normalized_query" text NOT NULL,
  "result" json NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "live_search_cache_pkey" PRIMARY KEY ("endpoint", "normalized_query")
);

CREATE TABLE IF NOT EXISTS "live_search_usage" (
  "kind" text NOT NULL,
  "key" text NOT NULL,
  "last_call_at" timestamp with time zone,
  "count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "live_search_usage_pkey" PRIMARY KEY ("kind", "key")
);
