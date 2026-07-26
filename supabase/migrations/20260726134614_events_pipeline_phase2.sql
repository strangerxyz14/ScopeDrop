-- ============================================================
-- Events pipeline Phase 2 schema additions.
-- Additive only. All new columns nullable; source check widened
-- to include 'editorial_blog' for YC/TechCrunch-style paths.
-- ============================================================

ALTER TABLE public.scheduled_events
  ADD COLUMN IF NOT EXISTS agenda             jsonb,
  ADD COLUMN IF NOT EXISTS speakers           jsonb,
  ADD COLUMN IF NOT EXISTS organizer_name     text,
  ADD COLUMN IF NOT EXISTS organizer_logo_url text,
  ADD COLUMN IF NOT EXISTS venue_lat          numeric,
  ADD COLUMN IF NOT EXISTS venue_lng          numeric;

-- Widen source check to include editorial_blog. This is the one existing
-- constraint we drop-and-replace; the rest of Phase 2 is purely additive.
ALTER TABLE public.scheduled_events DROP CONSTRAINT IF EXISTS scheduled_events_source_check;
ALTER TABLE public.scheduled_events
  ADD CONSTRAINT scheduled_events_source_check
  CHECK (source IN ('manual','serpapi','self_submitted','editorial_blog'));

-- ============================================================
-- event_image_templates: fallback image library. Populated
-- ONLY with real assets provided by the user (see Phase 2 B5).
-- No auto-generated placeholders.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_image_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category     text NOT NULL,
  format       text,
  template_url text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_image_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "event_image_templates_public_read" ON public.event_image_templates;
CREATE POLICY "event_image_templates_public_read"
  ON public.event_image_templates FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_event_image_templates_category_format
  ON public.event_image_templates(category, format);

-- ============================================================
-- Nominatim address cache: (address_norm) -> (lat, lng).
-- Prevents a second Nominatim call for the same address string
-- even if it appears on a different event row. Also survives
-- when the event row's coords are later cleared.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.geocode_cache (
  address_norm text PRIMARY KEY,
  lat          numeric,
  lng          numeric,
  ok           boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only service_role (bypasses RLS) reads/writes.
