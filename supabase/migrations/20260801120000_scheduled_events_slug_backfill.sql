-- Phase 2: backfill slug for scheduled_events rows that were inserted
-- before the slug generator existed (the 4 manual rows from the
-- pre-serpapi era; source IN ('manual','self_submitted')). SerpAPI
-- and editorial-blog rows already carry deterministic slugs from
-- their respective ingest paths, so this only touches nullable-slug
-- legacy rows.
--
-- Slug shape: lowercase(title) → strip non-alphanumeric-non-space →
-- collapse whitespace to hyphens → append first 8 hex of the UUID.
-- The UUID suffix guarantees uniqueness even if two events share a
-- title. Guarded by WHERE slug IS NULL so re-running is a no-op.
--
-- Not applied automatically. Apply manually after review.

BEGIN;

UPDATE public.scheduled_events
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(NULLIF(TRIM(title), ''), id::text),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  )
) || '-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE slug IS NULL;

COMMIT;
