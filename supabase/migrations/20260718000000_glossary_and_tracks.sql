-- ============================================================
-- ScopeDrop home-rebuild v-g: glossary, learning tracks, and
-- additive columns for flagship articles + event geo + subscribers.
-- Additive only: CREATE TABLE IF NOT EXISTS, ADD COLUMN IF NOT EXISTS.
-- No DROP, no ALTER of existing columns, no data mutations.
-- ============================================================

-- ------------------------------------------------------------
-- glossary_terms
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.glossary_terms (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term              text NOT NULL,
  slug              text NOT NULL UNIQUE,
  short_definition  text NOT NULL,
  long_definition   text,
  category          text,
  related_terms     text[] DEFAULT '{}',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glossary_terms_updated_at ON public.glossary_terms(updated_at DESC);

-- ------------------------------------------------------------
-- learning_tracks
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_tracks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  steps         jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_tracks_active_order
  ON public.learning_tracks(is_active, display_order);

-- ------------------------------------------------------------
-- articles: flagship flag + explicit publish timestamp
-- ------------------------------------------------------------
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS is_flagship boolean NOT NULL DEFAULT false;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_articles_is_flagship_published_at
  ON public.articles(is_flagship, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_at
  ON public.articles(published_at DESC);

-- ------------------------------------------------------------
-- scheduled_events: city + region for geo filtering
-- ------------------------------------------------------------
ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS city   text;
ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS region text;

CREATE INDEX IF NOT EXISTS idx_scheduled_events_city   ON public.scheduled_events(city);
CREATE INDEX IF NOT EXISTS idx_scheduled_events_region ON public.scheduled_events(region);

-- ------------------------------------------------------------
-- subscribers
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscribers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL UNIQUE,
  source     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_created_at ON public.subscribers(created_at DESC);

-- ------------------------------------------------------------
-- updated_at triggers (reuse public.set_updated_at from foundational)
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS glossary_terms_set_updated_at ON public.glossary_terms;
CREATE TRIGGER glossary_terms_set_updated_at
  BEFORE UPDATE ON public.glossary_terms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS learning_tracks_set_updated_at ON public.learning_tracks;
CREATE TRIGGER learning_tracks_set_updated_at
  BEFORE UPDATE ON public.learning_tracks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.glossary_terms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_tracks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "glossary_terms_public_read" ON public.glossary_terms;
CREATE POLICY "glossary_terms_public_read"
  ON public.glossary_terms FOR SELECT USING (true);

DROP POLICY IF EXISTS "learning_tracks_public_read" ON public.learning_tracks;
CREATE POLICY "learning_tracks_public_read"
  ON public.learning_tracks FOR SELECT USING (true);

-- Subscribers: anon may INSERT (public sign-up form). No public SELECT.
DROP POLICY IF EXISTS "subscribers_anon_insert" ON public.subscribers;
CREATE POLICY "subscribers_anon_insert"
  ON public.subscribers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
