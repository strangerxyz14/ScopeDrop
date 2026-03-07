-- ============================================================
-- ScopeDrop Groq Pipeline Schema Migration
-- Drops old enum-based tables and recreates with text columns
-- ============================================================

-- 1. Drop old tables that used enum types (cascade dependencies)
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS raw_signals CASCADE;

-- 2. Drop old enum types
DROP TYPE IF EXISTS article_status CASCADE;
DROP TYPE IF EXISTS business_category CASCADE;

-- ============================================================
-- raw_signals table
-- ============================================================
CREATE TABLE IF NOT EXISTS raw_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  raw_content text,
  source_url text UNIQUE,
  source_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected', 'paused')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_raw_signals_status ON raw_signals(status);
CREATE INDEX IF NOT EXISTS idx_raw_signals_created_at ON raw_signals(created_at DESC);

-- ============================================================
-- articles table
-- ============================================================
CREATE TABLE IF NOT EXISTS articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  summary text NOT NULL,
  content_html text NOT NULL,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  read_time_minutes integer DEFAULT 3,
  source_signal_id uuid REFERENCES raw_signals(id),
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);

-- ============================================================
-- pipeline_stats table
-- ============================================================
CREATE TABLE IF NOT EXISTS pipeline_stats (
  date date PRIMARY KEY DEFAULT current_date,
  tokens_used integer NOT NULL DEFAULT 0,
  articles_generated integer NOT NULL DEFAULT 0,
  requests_made integer NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RLS policies — allow service role full access
-- ============================================================
ALTER TABLE raw_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stats ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- Anon/authenticated read-only for articles (public feed).
CREATE POLICY "Public read articles"
  ON articles FOR SELECT
  USING (true);

-- Anon/authenticated read-only for pipeline_stats (optional dashboard).
CREATE POLICY "Public read pipeline_stats"
  ON pipeline_stats FOR SELECT
  USING (true);
