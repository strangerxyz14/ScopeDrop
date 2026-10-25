-- ============================================================
-- One call for relevance + section; duplicate stories caught before it
-- (2026-10-25)
--
-- 1. Classifier section. extract-structured's relevance call now also
--    picks the section (same definitions and rules as the section
--    router), so generate-content no longer makes a separate router call
--    per article. That saves roughly 100K tokens/day on gpt-oss-20b,
--    whose 200K daily limit was full. Stored on the signal until the
--    article is written.
-- 2. Dedupe. ~7% of articles over the last 7 days repeated a story
--    published in the previous 72h (pg_trgm similarity >= 0.6 on source
--    titles: 91 of 1,313; true duplicates such as three "Nvidia-backed
--    Reflection unveils..." pieces). find_duplicate_signal() compares an
--    incoming signal's title with signals already accepted (classified
--    relevant or published) in the last p_hours, before any LLM call.
--
-- Additive only. pg_trgm is already installed (schema extensions).
-- ============================================================

BEGIN;

ALTER TABLE public.raw_signals
  ADD COLUMN IF NOT EXISTS classifier_section text,
  ADD COLUMN IF NOT EXISTS classifier_section_secondary text,
  ADD COLUMN IF NOT EXISTS classifier_section_confidence real,
  ADD COLUMN IF NOT EXISTS classifier_section_reason text;

CREATE OR REPLACE FUNCTION public.find_duplicate_signal(
  p_signal_id uuid, p_title text, p_hours integer DEFAULT 72, p_threshold real DEFAULT 0.6
) RETURNS TABLE (id uuid, title text, similarity real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
  SELECT s.id, s.title, extensions.similarity(s.title, p_title)
  FROM public.raw_signals s
  WHERE s.id <> p_signal_id
    AND s.created_at > now() - make_interval(hours => p_hours)
    AND (s.status = 'published' OR s.error_message = 'classified_relevant')
    AND s.title IS NOT NULL
    AND extensions.similarity(s.title, p_title) >= p_threshold
  ORDER BY 3 DESC
  LIMIT 1;
$$;

COMMIT;
