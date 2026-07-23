-- ============================================================
-- Events dynamic pipeline: add slug + source metadata to
-- scheduled_events so fetch-events can upsert idempotently.
-- Additive only.
-- ============================================================

ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS slug        text;
ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS source      text;
ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS source_id   text;
ALTER TABLE public.scheduled_events ADD COLUMN IF NOT EXISTS image_url   text;

-- Partial unique index: only enforced for rows that have a slug.
-- Manually-created events (no slug) don't need to be unique.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_events_slug_unique
  ON public.scheduled_events(slug)
  WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_events_source_source_id
  ON public.scheduled_events(source, source_id)
  WHERE source_id IS NOT NULL;
