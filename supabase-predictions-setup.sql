-- Run this in your Supabase project → SQL Editor → New Query
-- ============================================================
-- SECTION 0: streams table (for live stream channel configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS streams (
  id           SERIAL PRIMARY KEY,
  stream_url   TEXT NOT NULL DEFAULT '',
  title        TEXT NOT NULL DEFAULT 'FIFA World Cup 2026',
  channel_name TEXT,
  channel_logo TEXT,
  language     TEXT DEFAULT 'en',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE streams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read streams"
  ON streams FOR SELECT
  TO anon USING (true);

CREATE POLICY "Public read streams authenticated"
  ON streams FOR SELECT
  TO authenticated USING (true);

-- Insert two default channel rows (Channel 1 and Channel 2)
INSERT INTO streams (stream_url, title, channel_name, language)
VALUES
  ('', 'FIFA World Cup 2026 — Channel 1', 'KooraPlays', 'ar'),
  ('', 'FIFA World Cup 2026 — Channel 2', 'KooraPlays', 'en')
ON CONFLICT DO NOTHING;

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER streams_updated_at
  BEFORE UPDATE ON streams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SECTION 1: match_predictions table (for match outcome voting)
-- ============================================================

CREATE TABLE IF NOT EXISTS match_predictions (
  match_id TEXT NOT NULL,
  outcome  TEXT NOT NULL CHECK (outcome IN ('home', 'draw', 'away')),
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (match_id, outcome)
);

ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read match_predictions"
  ON match_predictions FOR SELECT
  TO anon USING (true);

CREATE OR REPLACE FUNCTION increment_prediction(p_match_id TEXT, p_outcome TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO match_predictions (match_id, outcome, count)
  VALUES (p_match_id, p_outcome, 1)
  ON CONFLICT (match_id, outcome)
  DO UPDATE SET count = match_predictions.count + 1;

  SELECT json_build_object(
    'home',  COALESCE((SELECT count FROM match_predictions WHERE match_id = p_match_id AND outcome = 'home'), 0),
    'draw',  COALESCE((SELECT count FROM match_predictions WHERE match_id = p_match_id AND outcome = 'draw'), 0),
    'away',  COALESCE((SELECT count FROM match_predictions WHERE match_id = p_match_id AND outcome = 'away'), 0),
    'total', COALESCE((SELECT SUM(count) FROM match_predictions WHERE match_id = p_match_id), 0)
  ) INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- SECTION 2: team_votes fixes (for World Cup winner voting)
-- ============================================================

-- 2a. Ensure anon role can SELECT from team_votes directly
--     (fixes "0 votes" bug on desktop browsers)
DROP POLICY IF EXISTS "Public read team_votes" ON team_votes;
CREATE POLICY "Public read team_votes"
  ON team_votes FOR SELECT
  TO anon
  USING (true);

-- Also allow the public role (covers unauthenticated connections)
DROP POLICY IF EXISTS "Anyone can read team_votes" ON team_votes;
CREATE POLICY "Anyone can read team_votes"
  ON team_votes FOR SELECT
  TO public
  USING (true);

-- 2b. SECURITY DEFINER function to read all votes
--     (bypasses RLS completely — the safest fallback for browsers)
CREATE OR REPLACE FUNCTION get_team_votes()
RETURNS TABLE(team_id TEXT, vote_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id, vote_count FROM team_votes ORDER BY vote_count DESC;
$$;

-- Grant execute to anon and public roles
GRANT EXECUTE ON FUNCTION get_team_votes() TO anon;
GRANT EXECUTE ON FUNCTION get_team_votes() TO public;
