-- ScopeDrop: security hardening + missing core tables
-- - Enable RLS on public tables
-- - Remove overly-permissive cache policies
-- - Add events/funding_rounds and user account tables
-- - Pin SECURITY DEFINER search_path and restrict execution

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure updated_at trigger function is safe (immutable search_path)
CREATE OR REPLACE FUNCTION public.scopedrop_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS: core newsroom tables
-- ---------------------------------------------------------------------------

ALTER TABLE IF EXISTS public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raw_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_logs ENABLE ROW LEVEL SECURITY;

-- Replace permissive public read policy with "published-only".
DROP POLICY IF EXISTS "Articles are publicly readable" ON public.articles;
DROP POLICY IF EXISTS "Public can read published articles" ON public.articles;
DROP POLICY IF EXISTS "Articles are publicly readable when published" ON public.articles;

CREATE POLICY "Public can read published articles"
ON public.articles
FOR SELECT
TO anon, authenticated
USING (status = 'published');

-- Optional admin read access (dashboard use-cases).
DROP POLICY IF EXISTS "Admins can read all articles" ON public.articles;
CREATE POLICY "Admins can read all articles"
ON public.articles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Lock down internal signal/log tables (admin-only select; service_role bypasses RLS).
DROP POLICY IF EXISTS "Admins can read raw signals" ON public.raw_signals;
CREATE POLICY "Admins can read raw signals"
ON public.raw_signals
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can read agent logs" ON public.agent_logs;
CREATE POLICY "Admins can read agent logs"
ON public.agent_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- Cache system: remove policies that expose operational data
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF to_regclass('public.content_cache') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for content cache" ON public.content_cache;
    DROP POLICY IF EXISTS "Authenticated users can update cache" ON public.content_cache;
    DROP POLICY IF EXISTS "Authenticated users can insert cache" ON public.content_cache;
    DROP POLICY IF EXISTS "Authenticated users can delete cache" ON public.content_cache;
  END IF;

  IF to_regclass('public.api_usage') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for api usage" ON public.api_usage;
    DROP POLICY IF EXISTS "Authenticated users can update api usage" ON public.api_usage;
    DROP POLICY IF EXISTS "Authenticated users can insert api usage" ON public.api_usage;
  END IF;

  IF to_regclass('public.content_jobs') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for content jobs" ON public.content_jobs;
    DROP POLICY IF EXISTS "Authenticated users can update content jobs" ON public.content_jobs;
    DROP POLICY IF EXISTS "Authenticated users can insert content jobs" ON public.content_jobs;
  END IF;

  IF to_regclass('public.content_analytics') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for content analytics" ON public.content_analytics;
    DROP POLICY IF EXISTS "Authenticated users can insert analytics" ON public.content_analytics;
  END IF;

  IF to_regclass('public.quota_management') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for quota management" ON public.quota_management;
    DROP POLICY IF EXISTS "Authenticated users can update quota management" ON public.quota_management;
    DROP POLICY IF EXISTS "Authenticated users can insert quota management" ON public.quota_management;
  END IF;

  IF to_regclass('public.performance_metrics') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Public read access for performance metrics" ON public.performance_metrics;
    DROP POLICY IF EXISTS "Authenticated users can insert performance metrics" ON public.performance_metrics;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER: reduce blast radius
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- ---------------------------------------------------------------------------
-- Missing tables referenced by frontend/backend
-- ---------------------------------------------------------------------------

-- Events (populated by Edge Functions; readable by the public).
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  organizer text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  event_type text NOT NULL DEFAULT 'meetup',
  category text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  image_url text,
  registration_url text,
  price jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL,
  relevance_score integer,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events (starts_at);
CREATE INDEX IF NOT EXISTS idx_events_source ON public.events (source);
CREATE INDEX IF NOT EXISTS idx_events_fetched_at ON public.events (fetched_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Events are publicly readable" ON public.events;
CREATE POLICY "Events are publicly readable"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'events'
      AND trg.tgname = 'set_events_updated_at'
  ) THEN
    CREATE TRIGGER set_events_updated_at
      BEFORE UPDATE ON public.events
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END $$;

-- Funding rounds (agent-populated; readable by the public).
CREATE TABLE IF NOT EXISTS public.funding_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  announced_at timestamptz,
  amount_usd numeric,
  stage text,
  investors text[] NOT NULL DEFAULT '{}'::text[],
  summary text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_funding_rounds_announced_at ON public.funding_rounds (announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_company_name ON public.funding_rounds (company_name);

ALTER TABLE public.funding_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Funding rounds are publicly readable" ON public.funding_rounds;
CREATE POLICY "Funding rounds are publicly readable"
ON public.funding_rounds
FOR SELECT
TO anon, authenticated
USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'funding_rounds'
      AND trg.tgname = 'set_funding_rounds_updated_at'
  ) THEN
    CREATE TRIGGER set_funding_rounds_updated_at
      BEFORE UPDATE ON public.funding_rounds
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- User account tables (remove sensitive localStorage persistence)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_saved_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  notes text,
  reading_progress integer,
  is_favorite boolean NOT NULL DEFAULT false,
  collection text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_user_saved_articles_user_id ON public.user_saved_articles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_articles_article_id ON public.user_saved_articles (article_id);

ALTER TABLE public.user_saved_articles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own saved articles" ON public.user_saved_articles;
CREATE POLICY "Users can manage own saved articles"
ON public.user_saved_articles
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'user_saved_articles'
      AND trg.tgname = 'set_user_saved_articles_updated_at'
  ) THEN
    CREATE TRIGGER set_user_saved_articles_updated_at
      BEFORE UPDATE ON public.user_saved_articles
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_frequency text NOT NULL DEFAULT 'weekly'
    CHECK (email_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  newsletter_topics text[] NOT NULL DEFAULT '{}'::text[],
  notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'user_preferences'
      AND trg.tgname = 'set_user_preferences_updated_at'
  ) THEN
    CREATE TRIGGER set_user_preferences_updated_at
      BEFORE UPDATE ON public.user_preferences
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_reading_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id uuid REFERENCES public.articles(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  time_spent_seconds integer NOT NULL DEFAULT 0,
  scroll_depth integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_reading_activity_user_id ON public.user_reading_activity (user_id);
CREATE INDEX IF NOT EXISTS idx_user_reading_activity_viewed_at ON public.user_reading_activity (viewed_at DESC);

ALTER TABLE public.user_reading_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reading activity" ON public.user_reading_activity;
CREATE POLICY "Users can manage own reading activity"
ON public.user_reading_activity
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

