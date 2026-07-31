-- Phase 1: canonical events schema — additive extension of scheduled_events.
--
-- The plan spec targets a table called `events`, but ScopeDrop's actual
-- event surface has been `scheduled_events` since 2026-07-23 (see
-- migration 20260723115245_events_slug_and_source.sql and follow-ups).
-- This migration adds the missing dimensions from the plan (validation,
-- source provenance, media-source tracking, enrichment timestamps,
-- timezone, canonical dedup URL) as new nullable columns on the
-- existing table.
--
-- Status enum is expanded ADDITIVELY: the CHECK constraint now accepts
-- both the legacy vocabulary (`pending`, `approved`, `rejected`) that
-- current rows use and the plan's new state machine (`validated`,
-- `awaiting_enrichment`, `enriched`, `published`, `enrichment_failed`).
-- Existing rows are NOT touched. The RLS SELECT policy stays on
-- `USING (status = 'approved')` for backward compat. When the
-- enrichment worker lands and starts producing `published` rows in
-- earnest, a follow-up migration will migrate legacy rows and swap
-- the RLS policy in one shot.
--
-- NOT applied automatically. Apply manually after review.

BEGIN;

-- ── Additive columns ──────────────────────────────────────────────
ALTER TABLE public.scheduled_events
  ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS extraction_tier text
    CHECK (extraction_tier IN ('json_ld', 'og_meta', 'llm', 'ical', 'hybrid')),
  ADD COLUMN IF NOT EXISTS hero_image_source text
    CHECK (hero_image_source IN ('og_image', 'json_ld', 'page_image', 'scopedrop_library', 'unresolved')),
  ADD COLUMN IF NOT EXISTS logo_source text
    CHECK (logo_source IN ('json_ld', 'og_logo', 'favicon', 'logo_dev', 'scopedrop_default', 'unresolved')),
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS validated_at timestamptz,
  ADD COLUMN IF NOT EXISTS timezone text;

-- Canonical URL dedup — nullable-partial unique so legacy rows without
-- a canonical_url don't conflict.
CREATE UNIQUE INDEX IF NOT EXISTS scheduled_events_canonical_url_unique_idx
  ON public.scheduled_events (canonical_url) WHERE canonical_url IS NOT NULL;

-- ── Expand status enum additively ─────────────────────────────────
-- The old constraint's name isn't guaranteed (default names differ
-- across Postgres versions and prior migration history). Drop by the
-- naming convention Supabase produces (`<table>_status_check`), guarded
-- by IF EXISTS so it's a no-op if the constraint was named differently
-- or never existed.
ALTER TABLE public.scheduled_events
  DROP CONSTRAINT IF EXISTS scheduled_events_status_check;

ALTER TABLE public.scheduled_events
  ADD CONSTRAINT scheduled_events_status_check
  CHECK (status IN (
    -- Legacy (current row values, do not remove until data is migrated)
    'pending', 'approved', 'rejected',
    -- State machine (new; produced by the enrichment worker)
    'validated', 'awaiting_enrichment', 'enriched', 'published', 'enrichment_failed'
  ));

-- ── Hot-path index for the new 'published' state ──────────────────
-- Complements the existing implicit index on (status='approved') that
-- the current RLS policy uses. When status is migrated in a follow-up
-- phase, this index becomes the primary hot path.
CREATE INDEX IF NOT EXISTS scheduled_events_published_by_start_idx
  ON public.scheduled_events (starts_at DESC NULLS LAST)
  WHERE status = 'published';

COMMIT;

-- ── Deferred (recorded for future phases) ─────────────────────────
-- image_generation_presets table: not created here. ScopeDrop already
-- has an empty event_image_templates table (columns: category, format,
-- template_url) waiting on user-provided Nano Banana Pro assets. Adding
-- a second parallel table under a different name would create the same
-- kind of drift Phase 1 is trying to reconcile. When the actual image
-- consumer lands (hero_image_source = 'scopedrop_library' path), we
-- decide then whether to extend event_image_templates with the plan's
-- archetype_key/prompt_version columns or rename it.
