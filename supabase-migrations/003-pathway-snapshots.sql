CREATE TABLE pathway_snapshots (
  id                  SERIAL PRIMARY KEY,
  profile_id          INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_label    TEXT NOT NULL,
  -- Snapshot of course state at generation time
  total_units         NUMERIC NOT NULL DEFAULT 0,
  completed_units     NUMERIC NOT NULL DEFAULT 0,
  in_progress_units   NUMERIC NOT NULL DEFAULT 0,
  course_count        INTEGER NOT NULL DEFAULT 0,
  gpa                 NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pathway_snapshots_profile ON pathway_snapshots(profile_id, created_at DESC);

ALTER TABLE pathway_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pathway snapshots" ON pathway_snapshots;
CREATE POLICY "Users can view their own pathway snapshots"
  ON pathway_snapshots FOR SELECT
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own pathway snapshots" ON pathway_snapshots;
CREATE POLICY "Users can insert their own pathway snapshots"
  ON pathway_snapshots FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their own pathway snapshots" ON pathway_snapshots;
CREATE POLICY "Users can update their own pathway snapshots"
  ON pathway_snapshots FOR UPDATE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own pathway snapshots" ON pathway_snapshots;
CREATE POLICY "Users can delete their own pathway snapshots"
  ON pathway_snapshots FOR DELETE
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));
