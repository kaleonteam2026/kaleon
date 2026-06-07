-- Guidebooks table
CREATE TABLE IF NOT EXISTS guidebooks (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pathway_id INTEGER REFERENCES pathways(id) ON DELETE SET NULL,
  title TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE guidebooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own guidebooks" ON guidebooks;
CREATE POLICY "Users can view their own guidebooks"
  ON guidebooks FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own guidebooks" ON guidebooks;
CREATE POLICY "Users can insert their own guidebooks"
  ON guidebooks FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own guidebooks" ON guidebooks;
CREATE POLICY "Users can update their own guidebooks"
  ON guidebooks FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own guidebooks" ON guidebooks;
CREATE POLICY "Users can delete their own guidebooks"
  ON guidebooks FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Roadmaps table
CREATE TABLE IF NOT EXISTS roadmaps (
  id SERIAL PRIMARY KEY,
  profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pathway_id INTEGER REFERENCES pathways(id) ON DELETE SET NULL,
  title TEXT,
  content_markdown TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roadmaps" ON roadmaps;
CREATE POLICY "Users can view their own roadmaps"
  ON roadmaps FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own roadmaps" ON roadmaps;
CREATE POLICY "Users can insert their own roadmaps"
  ON roadmaps FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own roadmaps" ON roadmaps;
CREATE POLICY "Users can update their own roadmaps"
  ON roadmaps FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own roadmaps" ON roadmaps;
CREATE POLICY "Users can delete their own roadmaps"
  ON roadmaps FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
