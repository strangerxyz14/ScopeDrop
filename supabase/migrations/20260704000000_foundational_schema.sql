-- ============================================================
-- ScopeDrop Foundational Schema
-- Pure additive — no DROP, no ALTER of existing columns
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- ============================================================
-- entities
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entities (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type            text NOT NULL CHECK (entity_type IN ('company','founder','investor','tool')),
  name                   text NOT NULL,
  slug                   text NOT NULL UNIQUE,
  logo_url               text,
  description            text,
  founded_year           integer,
  headquarters           text,
  website                text,
  employee_count_estimate integer,
  sector                 text,
  tags                   text[] DEFAULT '{}',
  total_funding_raised   numeric,
  last_funding_stage     text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entities_slug        ON public.entities(slug);
CREATE INDEX IF NOT EXISTS idx_entities_entity_type ON public.entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_name_trgm   ON public.entities USING gin(name extensions.gin_trgm_ops);

-- ============================================================
-- capital_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capital_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type            text NOT NULL CHECK (event_type IN ('funding','acquisition','ipo','exit')),
  primary_entity_id     uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  counterparty_entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  round_type            text CHECK (round_type IN (
                          'pre_seed','seed','series_a','series_b','series_c',
                          'series_d_plus','growth','debt','acquisition','ipo'
                        )),
  amount_usd            numeric,
  valuation_usd         numeric,
  announced_at          date NOT NULL,
  one_liner             text NOT NULL,
  source_url            text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capital_events_announced_at      ON public.capital_events(announced_at DESC);
CREATE INDEX IF NOT EXISTS idx_capital_events_primary_entity_id ON public.capital_events(primary_entity_id);
CREATE INDEX IF NOT EXISTS idx_capital_events_event_type        ON public.capital_events(event_type);

-- ============================================================
-- capital_event_investors (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.capital_event_investors (
  capital_event_id   uuid NOT NULL REFERENCES public.capital_events(id) ON DELETE CASCADE,
  investor_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  is_lead            boolean NOT NULL DEFAULT false,
  PRIMARY KEY (capital_event_id, investor_entity_id)
);

-- ============================================================
-- collections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_type text NOT NULL CHECK (collection_type IN ('market_map','weekly_top','ranking')),
  title           text NOT NULL,
  description     text,
  slug            text NOT NULL UNIQUE,
  entity_ids      uuid[] DEFAULT '{}',
  generated_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_collections_collection_type ON public.collections(collection_type);
CREATE INDEX IF NOT EXISTS idx_collections_generated_at    ON public.collections(generated_at DESC);

-- ============================================================
-- scheduled_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scheduled_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       text NOT NULL CHECK (event_type IN ('demo_day','conference','pitch_competition')),
  title            text NOT NULL,
  description      text,
  location         text,
  is_virtual       boolean NOT NULL DEFAULT false,
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz,
  registration_url text,
  source_url       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_events_starts_at ON public.scheduled_events(starts_at);

-- ============================================================
-- Alter articles — two additive nullable columns
-- ============================================================
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS subtype text
    CHECK (subtype IN (
      'news','success_story','post_mortem','founder_journey',
      'tech_stack_breakdown','growth_playbook'
    ));

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS related_entity_ids uuid[] DEFAULT '{}';

-- ============================================================
-- updated_at trigger for entities
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entities_set_updated_at ON public.entities;
CREATE TRIGGER entities_set_updated_at
  BEFORE UPDATE ON public.entities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- RLS — public read, service role writes
-- ============================================================
ALTER TABLE public.entities            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_event_investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_events    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read entities" ON public.entities;
CREATE POLICY "Public read entities"
  ON public.entities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read capital_events" ON public.capital_events;
CREATE POLICY "Public read capital_events"
  ON public.capital_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read capital_event_investors" ON public.capital_event_investors;
CREATE POLICY "Public read capital_event_investors"
  ON public.capital_event_investors FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read collections" ON public.collections;
CREATE POLICY "Public read collections"
  ON public.collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read scheduled_events" ON public.scheduled_events;
CREATE POLICY "Public read scheduled_events"
  ON public.scheduled_events FOR SELECT USING (true);
