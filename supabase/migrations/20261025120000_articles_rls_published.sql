-- ============================================================
-- Anon/authenticated reads on articles: published rows only (2026-10-25)
--
-- "Public read articles" (20260308000000_groq_pipeline_schema.sql) was
-- USING (true), so any status reached the browser. Only the home hooks
-- (useStories, useFreshFlow, useDailyFlagship) filter on status; the
-- section pages, search, topic feed and articlesService helpers do not.
-- Once 20261018120000_unpublish_offtopic_articles.sql flips 5539 rows to
-- 'rejected', those rows would still show on /funding, /markets, /ai etc.
-- This closes that at the database, for every reader at once.
--
-- Pipelines are unaffected: edge functions use the service role, which
-- bypasses RLS. Admins keep full read access for a future review queue.
-- No data is touched. Order relative to the unpublish migration does
-- not matter; both are needed.
--
-- Pattern follows 20260801210000_scheduled_events_rls_published.sql.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Public read articles" ON public.articles;

CREATE POLICY "Public read published articles"
  ON public.articles FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins read all articles"
  ON public.articles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMIT;
