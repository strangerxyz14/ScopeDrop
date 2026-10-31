-- Schedule enrich-entities:
--   enrich-entities          every 15 minutes, 25 entities per run. The
--                            first ~750 entities take about 8 hours; after
--                            that each run only sees new entities and
--                            30-day retries of unmatched ones.
--   enrich-entities-registry Sundays 01:15 UTC: reload the YC directory
--                            and SEC company list into company_registry.
-- Same vault-injected service-role key pattern as select-flagship-daily
-- (the secret literal never lands in cron.job.command). enrich-entities
-- must be deployed with verify_jwt ON and migration 20261031120000
-- applied before this runs.
--
-- Additive: only adds cron jobs. To remove:
--   SELECT cron.unschedule('enrich-entities');
--   SELECT cron.unschedule('enrich-entities-registry');

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enrich-entities') THEN
    PERFORM cron.unschedule('enrich-entities');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'enrich-entities-registry') THEN
    PERFORM cron.unschedule('enrich-entities-registry');
  END IF;
END $$;

SELECT cron.schedule(
  'enrich-entities',
  '*/15 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/enrich-entities',
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
  $cron$
);

SELECT cron.schedule(
  'enrich-entities-registry',
  '15 1 * * 0',
  $cron$
    SELECT net.http_post(
      url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/enrich-entities',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'cron_service_role_key'
          LIMIT 1
        )
      ),
      body := '{"mode": "refresh_registry"}'::jsonb,
      timeout_milliseconds := 150000
    );
  $cron$
);

COMMIT;
