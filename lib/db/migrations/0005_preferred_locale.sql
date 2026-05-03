-- Migration: add preferred_locale to student_profiles (Task #45 multilingual support).

ALTER TABLE "student_profiles"
  ADD COLUMN IF NOT EXISTS "preferred_locale" text DEFAULT 'en';
