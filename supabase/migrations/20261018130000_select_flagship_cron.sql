-- Schedule select-flagship daily at 00:30 UTC (06:00 IST), the time the
-- home hero promises ("Today's flagship publishes at 06:00 IST").
-- Uses the vault-injected service-role key pattern from the
-- normalize-events / techmeme crons (never persists the secret literal
-- in cron.job.command). select-flagship must be deployed with
-- verify_jwt ON before this runs.
--
-- Additive: only adds a cron job. To remove:
--   SELECT cron.unschedule('select-flagship-daily');

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'select-flagship-daily') THEN
    PERFORM cron.unschedule('select-flagship-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'select-flagship-daily',
  '30 0 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/select-flagship',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          SELECT decrypted_secret
          FROM vault.decrypted_secrets
          WHERE name = 'cron_service_role_key'
          LIMIT 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 60000
    );
  $cron$
);

COMMIT;
