-- Entity enrichment: stable identities and profiles from structured sources.
--
-- 1. entities gets identity columns (domain, wikidata_id, sec_cik, ticker,
--    yc_id) that later sources match on instead of names, plus enrichment
--    bookkeeping (status, sources, what each source said, when).
-- 2. company_registry holds the YC directory and the SEC company list,
--    refreshed weekly by enrich-entities {"mode": "refresh_registry"}, so
--    matching a name is one indexed lookup instead of a 10 MB download.
-- 3. entity_identity_duplicates lists entities that share a domain,
--    Wikidata id or CIK: the same company recorded under two names. It
--    only reports; merging rewrites capital_events references and is a
--    separate, reviewed step.
--
-- Additive only. To roll back:
--   DROP VIEW IF EXISTS public.entity_identity_duplicates;
--   DROP TABLE IF EXISTS public.company_registry;
--   ALTER TABLE public.entities DROP COLUMN domain, DROP COLUMN wikidata_id,
--     DROP COLUMN sec_cik, DROP COLUMN ticker, DROP COLUMN yc_id,
--     DROP COLUMN enrichment_status, DROP COLUMN enrichment_sources,
--     DROP COLUMN enrichment, DROP COLUMN enriched_at;

BEGIN;

ALTER TABLE public.entities
  ADD COLUMN IF NOT EXISTS domain             text,
  ADD COLUMN IF NOT EXISTS wikidata_id        text,
  ADD COLUMN IF NOT EXISTS sec_cik            text,
  ADD COLUMN IF NOT EXISTS ticker             text,
  ADD COLUMN IF NOT EXISTS yc_id              text,
  ADD COLUMN IF NOT EXISTS enrichment_status  text,
  ADD COLUMN IF NOT EXISTS enrichment_sources text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enrichment         jsonb,
  ADD COLUMN IF NOT EXISTS enriched_at        timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'entities_enrichment_status_check') THEN
    ALTER TABLE public.entities ADD CONSTRAINT entities_enrichment_status_check
      CHECK (enrichment_status IN ('matched', 'unconfirmed', 'ambiguous', 'no_match', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_entities_domain      ON public.entities(domain)      WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_wikidata_id ON public.entities(wikidata_id) WHERE wikidata_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_sec_cik     ON public.entities(sec_cik)     WHERE sec_cik IS NOT NULL;
-- The enrichment queue: never-enriched rows first.
CREATE INDEX IF NOT EXISTS idx_entities_enriched_at ON public.entities(enriched_at NULLS FIRST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.company_registry (
  source       text NOT NULL CHECK (source IN ('yc', 'sec')),
  external_id  text NOT NULL,
  name         text NOT NULL,
  name_norm    text NOT NULL,
  domain       text,
  ticker       text,
  payload      jsonb NOT NULL DEFAULT '{}'::jsonb,
  refreshed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_company_registry_name_norm ON public.company_registry(name_norm);
CREATE INDEX IF NOT EXISTS idx_company_registry_domain    ON public.company_registry(domain) WHERE domain IS NOT NULL;

-- Service role only: no policies, so anon and authenticated read nothing.
ALTER TABLE public.company_registry ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE VIEW public.entity_identity_duplicates
WITH (security_invoker = true) AS
SELECT key_type, key, count(*) AS entities, array_agg(id ORDER BY created_at) AS entity_ids,
       array_agg(name ORDER BY created_at) AS names
FROM (
  SELECT 'domain' AS key_type, domain AS key, id, name, created_at FROM public.entities WHERE domain IS NOT NULL
  UNION ALL
  SELECT 'wikidata_id', wikidata_id, id, name, created_at FROM public.entities WHERE wikidata_id IS NOT NULL
  UNION ALL
  SELECT 'sec_cik', sec_cik, id, name, created_at FROM public.entities WHERE sec_cik IS NOT NULL
) keys
GROUP BY key_type, key
HAVING count(*) > 1;

COMMIT;
