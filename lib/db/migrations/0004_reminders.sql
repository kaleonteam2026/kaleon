-- Migration: deadline reminder system (Task #16).

CREATE TABLE IF NOT EXISTS "reminder_prefs" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL UNIQUE REFERENCES "student_profiles"("id"),
  "enabled" text NOT NULL DEFAULT 'true',
  "channel_in_app" text NOT NULL DEFAULT 'true',
  "channel_email" text NOT NULL DEFAULT 'false',
  "lead_days" json NOT NULL DEFAULT '[30,14,7,1]'::json,
  "last_run_day" text,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "reminders" (
  "id" serial PRIMARY KEY,
  "profile_id" integer NOT NULL REFERENCES "student_profiles"("id"),
  "deadline_id" text NOT NULL,
  "deadline_label" text NOT NULL,
  "deadline_date" text NOT NULL,
  "lead_days" integer NOT NULL,
  "category" text NOT NULL,
  "priority" text NOT NULL,
  "url" text,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'unread',
  "snooze_until" timestamp,
  "email_sent" text NOT NULL DEFAULT 'false',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Uniqueness must include deadline_date so the SAME deadline_id (e.g. "tag")
-- can fire again in the next annual cycle.
DROP INDEX IF EXISTS "reminders_profile_deadline_lead_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "reminders_profile_deadline_lead_date_idx"
  ON "reminders" ("profile_id", "deadline_id", "lead_days", "deadline_date");
