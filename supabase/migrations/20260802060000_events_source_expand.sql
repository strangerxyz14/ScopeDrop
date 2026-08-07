-- Phase 4: expand scheduled_events.source CHECK to allow the new
-- ingestors ('techmeme', 'luma'). Additive — the four legacy values
-- keep working. Applied live after commit.

BEGIN;

ALTER TABLE public.scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_source_check;

ALTER TABLE public.scheduled_events
  ADD CONSTRAINT scheduled_events_source_check
  CHECK (source IN (
    -- Legacy
    'manual', 'serpapi', 'self_submitted', 'editorial_blog',
    -- Phase 4 additions
    'techmeme', 'luma'
  ));

COMMIT;
