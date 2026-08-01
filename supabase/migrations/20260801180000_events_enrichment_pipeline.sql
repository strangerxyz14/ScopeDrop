-- Phase 3: enrichment pipeline schema additions.
--
-- Adds `highlights` and `scope_analysis` as separate columns instead
-- of overloading the existing `ai_summary` and `relevance_reason`.
-- The editorial contract for Highlights (150-350 chars, concrete +
-- energetic, must name specific artifacts) and Scope (250-500 chars,
-- analytical, "here's what its existence tells us") is materially
-- different from the current summary/scope-note that lives in
-- ai_summary/relevance_reason — different provenance, different
-- prompt, different failure mode. New columns keep the legacy fields
-- populated as-is and give the new editorial pass a clean surface.
--
-- Also expands the event_type CHECK constraint to cover the plan's
-- full type vocabulary (hackathon, meetup, workshop, pitch_event)
-- while preserving the existing three values. Underscores stay
-- because that's how every other scheduled_events value is written.
--
-- Extends the existing event_image_templates table with the plan's
-- archetype_key + prompt_version dimensions so the FLUX generation
-- script can upsert by archetype and bump prompt_version on
-- regenerations. Keeping the existing category/format columns
-- untouched — they're an orthogonal indexing dimension.
--
-- Creates the event-fallbacks storage bucket for FLUX-generated
-- images, with public-read policy so hero_image_url values referring
-- to it don't need signed URLs.
--
-- Not applied automatically. Apply manually after review.

BEGIN;

-- ── Editorial columns ─────────────────────────────────────────────
ALTER TABLE public.scheduled_events
  ADD COLUMN IF NOT EXISTS highlights text,
  ADD COLUMN IF NOT EXISTS scope_analysis text;

-- ── Expand event_type CHECK constraint ────────────────────────────
ALTER TABLE public.scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_event_type_check;

ALTER TABLE public.scheduled_events
  ADD CONSTRAINT scheduled_events_event_type_check
  CHECK (event_type IN (
    -- Legacy (current row values, do not remove)
    'demo_day', 'conference', 'pitch_competition',
    -- Plan-added
    'hackathon', 'meetup', 'workshop', 'pitch_event'
  ));

-- ── Extend event_image_templates for FLUX archetype presets ───────
ALTER TABLE public.event_image_templates
  ADD COLUMN IF NOT EXISTS archetype_key text,
  ADD COLUMN IF NOT EXISTS prompt_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS public_url text,
  ADD COLUMN IF NOT EXISTS generated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS event_image_templates_archetype_key_unique_idx
  ON public.event_image_templates (archetype_key) WHERE archetype_key IS NOT NULL;

-- ── Storage bucket for FLUX fallbacks ─────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-fallbacks', 'event-fallbacks', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "event_fallbacks_public_read" ON storage.objects;
CREATE POLICY "event_fallbacks_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-fallbacks');

COMMIT;
