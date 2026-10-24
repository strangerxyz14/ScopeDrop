-- ============================================================
-- Section router columns (2026-10-25)
--
-- _shared/section-router.ts now picks articles.category (rules, then an
-- LLM at temperature 0) instead of the copywriting call. These columns
-- record how each decision was made, and carry the classifier's verdict
-- from extract-structured to the router.
--
-- raw_signals.classifier_verdict: 'funding' | 'acquisition' (event
--   recorded), 'funding_unconfirmed' | 'acquisition_unconfirmed'
--   (classifier said so, extraction failed), 'narrative'.
-- articles.section_source: 'rule' | 'llm' | 'fallback'.
-- articles.section_status: 'routed' | 'review' (confidence < 0.7 or the
--   LLM failed). Review rows stay published; a review page comes later.
-- articles.router_version: the ROUTER_VERSION that routed the row.
--   route-section reruns rows where it is null or older.
--
-- Additive only: no data changes and no CHECK on category yet. A CHECK
-- added NOT VALID would still apply to UPDATEs of the 176 published rows
-- (as of 2026-10-25) whose category is off the list (select-flagship sets is_flagship on them), so it
-- waits until the route-section backfill has normalised every row.
--
-- Apply BEFORE deploying generate-content, extract-structured and
-- route-section from this branch. (The first two degrade gracefully if
-- the columns are missing; route-section needs them.)
-- ============================================================

BEGIN;

ALTER TABLE public.raw_signals
  ADD COLUMN IF NOT EXISTS classifier_verdict text;

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS section_secondary text,
  ADD COLUMN IF NOT EXISTS section_confidence real,
  ADD COLUMN IF NOT EXISTS section_source text,
  ADD COLUMN IF NOT EXISTS section_reason text,
  ADD COLUMN IF NOT EXISTS section_status text,
  ADD COLUMN IF NOT EXISTS router_version text;

CREATE INDEX IF NOT EXISTS idx_articles_router_version
  ON public.articles (router_version);

COMMIT;
