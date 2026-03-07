-- ============================================================
-- Pipeline stats increment RPC (atomic updates)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_pipeline_stats_safe(
  p_date date,
  p_tokens integer,
  p_articles integer,
  p_requests integer
) RETURNS void AS $$
BEGIN
  INSERT INTO pipeline_stats (date, tokens_used, articles_generated, requests_made, last_updated)
  VALUES (p_date, p_tokens, p_articles, p_requests, now())
  ON CONFLICT (date) DO UPDATE SET
    tokens_used = pipeline_stats.tokens_used + p_tokens,
    articles_generated = pipeline_stats.articles_generated + p_articles,
    requests_made = pipeline_stats.requests_made + p_requests,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Enable extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- ============================================================
-- Remove old cron jobs
-- ============================================================
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname IN ('ingest-signals', 'generate-content', 'disruptor-analysis-cron');

-- ============================================================
-- Job 1 — Ingest signals every 30 minutes
-- ============================================================
SELECT cron.schedule(
  'ingest-signals',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/ingest-signals',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- ============================================================
-- Job 2 — Generate content every 6 minutes, 06:00–18:00 UTC
-- Safe schedule: ~360 articles/day, ~432k tokens/day
-- ============================================================
SELECT cron.schedule(
  'generate-content',
  '*/6 6-18 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/generate-content',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);
