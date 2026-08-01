-- Phase 3 UI switch: allow anon reads on `published` rows in addition
-- to legacy `approved`. Without this, normalize-events promoting a
-- row to status='published' would immediately hide it from anon
-- readers (frontend + public API). Kept as a separate migration so
-- the DB history clearly records when the read surface widened.
--
-- Data migration (rename existing `approved` → `published`) is still
-- deferred — happens when the enrichment worker takes over as the
-- primary publish path.
--
-- Applied live 2026-08-01 during the UI-switch turn. Migration file
-- checked in for reproducibility.

BEGIN;

DROP POLICY IF EXISTS scheduled_events_public_read ON public.scheduled_events;
CREATE POLICY scheduled_events_public_read
  ON public.scheduled_events FOR SELECT
  USING (status IN ('approved', 'published'));

COMMIT;
