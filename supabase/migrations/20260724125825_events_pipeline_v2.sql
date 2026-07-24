-- ============================================================
-- Events pipeline v2: status machinery + AI-classifier metadata
-- + self-submission fields. Additive only.
-- ============================================================

-- Columns added on top of yesterday's 20260723115245 migration.
ALTER TABLE public.scheduled_events
  ADD COLUMN IF NOT EXISTS status              text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS relevance_category  text,
  ADD COLUMN IF NOT EXISTS relevance_reason    text,
  ADD COLUMN IF NOT EXISTS submitted_by_email  text,
  ADD COLUMN IF NOT EXISTS submitted_at        timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at         timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason    text;

-- Backfill source for the 4 manual seed rows before locking down the domain.
UPDATE public.scheduled_events SET source = 'manual' WHERE source IS NULL;

-- Constraint on status.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.scheduled_events'::regclass
      AND conname = 'scheduled_events_status_check'
  ) THEN
    ALTER TABLE public.scheduled_events
      ADD CONSTRAINT scheduled_events_status_check
      CHECK (status IN ('pending','approved','rejected'));
  END IF;
END $$;

-- Constraint on source: enforce the closed set going forward.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.scheduled_events'::regclass
      AND conname = 'scheduled_events_source_check'
  ) THEN
    ALTER TABLE public.scheduled_events
      ADD CONSTRAINT scheduled_events_source_check
      CHECK (source IN ('manual','serpapi','self_submitted'));
  END IF;
END $$;

-- Default 'manual' for future inserts, in case source is not supplied.
ALTER TABLE public.scheduled_events ALTER COLUMN source SET DEFAULT 'manual';

-- Indexes for filtered lookups.
-- Non-partial unique on slug: required for PostgREST upsert with
-- onConflict:'slug' to work. NULL slugs remain valid (PG UNIQUE
-- treats each NULL as distinct by default).
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_events_slug_unique_v2
  ON public.scheduled_events(slug);

CREATE INDEX IF NOT EXISTS idx_scheduled_events_status
  ON public.scheduled_events(status);

CREATE INDEX IF NOT EXISTS idx_scheduled_events_status_starts_at
  ON public.scheduled_events(status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_events_source_source_id_v2
  ON public.scheduled_events(source, source_id)
  WHERE source_id IS NOT NULL;

-- RLS: narrow public read to approved rows only. Pending/rejected are hidden
-- from anon clients. Service role (used by admin-list-pending-events edge
-- function) bypasses RLS as usual.
ALTER TABLE public.scheduled_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read scheduled_events" ON public.scheduled_events;
DROP POLICY IF EXISTS "scheduled_events_public_read" ON public.scheduled_events;
CREATE POLICY "scheduled_events_public_read"
  ON public.scheduled_events
  FOR SELECT
  USING (status = 'approved');

-- ============================================================
-- submit-event rate-limit ledger (public.event_submission_ledger).
-- Tracks per-IP submission attempts. RLS locks it down; only the
-- service-role-backed submit-event function reads/writes it.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_submission_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash       text NOT NULL,
  submitted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_submission_ledger_ip_hash_time
  ON public.event_submission_ledger(ip_hash, submitted_at DESC);

ALTER TABLE public.event_submission_ledger ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies: only service_role (bypasses RLS) can read/write.
