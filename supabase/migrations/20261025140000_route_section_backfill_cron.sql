-- ============================================================
-- Temporary: backfill articles.category through route-section (2026-10-25)
--
-- Every 2 minutes, while any published article has a router_version
-- other than the current one (2026-10-25.3), POST route-section with
-- limit 100. Each run is time-boxed to ~110s, so runs don't overlap.
-- Once nothing is stale (a run would scan 0 articles), the job
-- unschedules itself.
--
-- Expected: ~1,470 LLM-routed rows (last 30 days + unmappable older
-- categories) at ~13 per run, then ~11,000 legacy-mapped rows at 100
-- per run; roughly 7-8 hours. A Groq rate limit or daily cap only
-- pauses it: route-section stops without writing and the next tick
-- retries.
--
-- Uses the vault-injected service-role key pattern from the
-- normalize-events / select-flagship crons; route-section is deployed
-- with verify_jwt ON and checks the service_role claim.
--
-- To stop early:
--   SELECT cron.unschedule('route-section-backfill');
-- If ROUTER_VERSION is bumped again, update the version below and rerun.
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
  '*/2 * * * *',
  $cron$
  DO $do$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM public.articles
      WHERE status = 'published'
        AND (router_version IS NULL OR router_version <> '2026-10-25.3')
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
        body := '{"limit": 100}'::jsonb,
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
