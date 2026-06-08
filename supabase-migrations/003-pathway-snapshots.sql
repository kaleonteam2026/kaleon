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
