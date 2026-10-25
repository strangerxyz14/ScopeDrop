-- ============================================================
-- Section backfill, take 2: overnight and budget-aware (2026-10-25)
--
-- Replaces route-section-backfill from 20261025140000, unscheduled by
-- hand at 07:10 UTC on 2026-10-25 after it used up Groq's daily tokens
-- on both gpt-oss models (TPD 200K each) and starved live articles.
-- What changed in route-section (feat/llm-capacity):
--   - "unrouted" means router_version IS NULL; a ROUTER_VERSION bump no
--     longer queues routed articles for the LLM again;
--   - a free pass first (rule / legacy, no LLM, bulk writes) covers
--     nearly all of the ~11,100 remaining rows;
--   - the ~100 that need the LLM run at budget priority "backfill",
--     which stops at 45% of a model's daily tokens, leaving the rest for
--     articles, extraction and the router.
--
-- Schedule: every 10 minutes, 20:00-04:59 UTC, outside generate-content's
-- 06:00-18:59 window (select-flagship at 00:30 outranks it on budget).
-- Each run is time-boxed to ~110s. When no published article is
-- unrouted, the job unschedules itself.
--
-- To stop early: SELECT cron.unschedule('route-section-backfill');
-- Same vault-injected service-role key pattern as the other crons.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'route-section-backfill') THEN
    PERFORM cron.unschedule('route-section-backfill');
  END IF;
END $$;

SELECT cron.schedule(
  'route-section-backfill',
  '*/10 20-23,0-4 * * *',
  $cron$
  DO $do$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM public.articles
      WHERE status = 'published' AND router_version IS NULL
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
    ELSE
      PERFORM cron.unschedule('route-section-backfill');
    END IF;
  END
  $do$;
  $cron$
);

COMMIT;
