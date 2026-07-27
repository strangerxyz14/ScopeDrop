-- Editorial polish for scheduled_events + a shared logo cache.
--
-- ai_summary: 2-3 sentence founder-facing overview of the event,
-- generated once at ingestion via Groq. Rendered in the EventDetail
-- page in place of the scraped agenda (which was often empty or noisy).
-- Nullable so existing rows aren't broken; UI hides the block when null.
ALTER TABLE scheduled_events ADD COLUMN IF NOT EXISTS ai_summary text;

-- logo_cache: single source of truth for "given a company/organizer name,
-- what's its domain + Logo.dev URL". Filled lazily — first lookup pays
-- the Logo.dev Search API cost (if the plan supports it), every
-- subsequent read is a free cache hit. Aggressively deduplicated on a
-- normalized_name key so trivial casing/whitespace differences don't
-- cause repeat lookups.
CREATE TABLE IF NOT EXISTS logo_cache (
  normalized_name text PRIMARY KEY,
  original_name text NOT NULL,
  domain text,
  logo_url text,
  resolved_via text NOT NULL,  -- 'search_api' | 'domain_guess' | 'not_found'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Public read for the frontend — the frontend never queries this
-- directly today, but a future homepage "trending organizers" widget
-- would want to. Writes stay service-role only via RLS default deny.
ALTER TABLE logo_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS logo_cache_public_read ON logo_cache;
CREATE POLICY logo_cache_public_read ON logo_cache FOR SELECT USING (true);
