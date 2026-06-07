-- CalGETC (CSU GE Breadth) progress tracking table
-- Mirrors the IGETC pattern: stores per-profile GE area completion status as JSONB
CREATE TABLE IF NOT EXISTS calgetc (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  areas JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Each profile should have at most one CalGETC record
CREATE UNIQUE INDEX IF NOT EXISTS idx_calgetc_profile_id ON calgetc(profile_id);

ALTER TABLE calgetc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calgetc" ON calgetc;
CREATE POLICY "Users can view their own calgetc"
  ON calgetc FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own calgetc" ON calgetc;
CREATE POLICY "Users can insert their own calgetc"
  ON calgetc FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own calgetc" ON calgetc;
CREATE POLICY "Users can update their own calgetc"
  ON calgetc FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own calgetc" ON calgetc;
CREATE POLICY "Users can delete their own calgetc"
  ON calgetc FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
