CREATE TABLE IF NOT EXISTS neural_break_high_scores (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL CHECK (name ~ '^[A-Z0-9 _-]{1,20}$'),
  score BIGINT NOT NULL CHECK (score BETWEEN 0 AND 2147483647),
  survived_time INTEGER NOT NULL CHECK (survived_time BETWEEN 0 AND 604800),
  level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 99),
  location TEXT NOT NULL DEFAULT 'ONLINE' CHECK (location ~ '^[A-Z]{2,6}$'),
  game_mode TEXT NOT NULL CHECK (game_mode IN ('original', 'test')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS neural_break_high_scores_ranking_idx
  ON neural_break_high_scores (
    game_mode,
    score DESC,
    level DESC,
    survived_time DESC,
    created_at DESC,
    id DESC
  );

CREATE TABLE IF NOT EXISTS neural_break_play_counts (
  game_mode TEXT PRIMARY KEY CHECK (game_mode IN ('original', 'test')),
  play_count BIGINT NOT NULL DEFAULT 0 CHECK (play_count >= 0)
);

CREATE TABLE IF NOT EXISTS neural_break_submission_limits (
  client_hash VARCHAR(48) PRIMARY KEY,
  window_started_at TIMESTAMPTZ NOT NULL,
  submission_count SMALLINT NOT NULL CHECK (submission_count > 0)
);
