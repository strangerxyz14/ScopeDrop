-- ============================================================
-- Nightly section maintenance + round-the-clock article generation
-- (2026-10-25)
--
-- 1. route-section-nightly replaces route-section-backfill (job 12, from
--    20261025160500). It's permanent rather than self-removing: when a
--    router call hits Groq's daily limit during the day, the article is
--    published with a fallback section (section_source 'fallback',
--    status 'review'). route-section's auto mode now retries those once
--    nothing is waiting for a first routing. Every 10 minutes,
--    20:00-04:59 UTC, at budget priority "backfill"; it only calls the
--    function when unrouted or fallback rows exist.
-- 2. generate-content runs every 10 minutes around the clock instead of
--    */6 06:00-18:59 UTC. Nothing used to be written 00:30-11:30 IST, so
--    overnight stories went live 6-15 h late. Capacity is about the same
--    (144 runs x 3 signals vs 130 x 3), spread over the day; the llm.ts
--    budget allocator keeps articles first in line for Groq tokens.
--    cron.alter_job changes only the schedule; the job's command,
--    including its auth header, is untouched.
--
-- To revert: SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE
-- jobname = 'generate-content'), schedule := '*/6 6-18 * * *');
-- SELECT cron.unschedule('route-section-nightly');
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'route-section-backfill') THEN
    PERFORM cron.unschedule('route-section-backfill');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'route-section-nightly') THEN
    PERFORM cron.unschedule('route-section-nightly');
  END IF;
END $$;

SELECT cron.schedule(
  'route-section-nightly',
  '*/10 20-23,0-4 * * *',
  $cron$
  DO $do$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM public.articles
      WHERE status = 'published'
        AND (router_version IS NULL OR section_source = 'fallback')
    ) THEN
      PERFORM net.http_post(
        url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/route-section',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'cron_service_role_key'
            LIMIT 1
          )
        ),
        body := '{"mode": "auto", "limit": 25}'::jsonb,
        timeout_milliseconds := 150000
      );
    END IF;
  END
  $do$;
  $cron$
);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'generate-content'),
  schedule := '*/10 * * * *'
);

COMMIT;
