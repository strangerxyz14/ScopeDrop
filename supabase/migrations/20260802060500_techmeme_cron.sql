-- Phase 4: schedule ingest-techmeme-events daily at 06:00 UTC.
-- Uses the vault-injected service-role key pattern established for
-- normalize-events (never persists the secret literal in
-- cron.job.command). Applied live 2026-08-02.

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ingest-techmeme-events-daily') THEN
    PERFORM cron.unschedule('ingest-techmeme-events-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'ingest-techmeme-events-daily',
  '0 6 * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/ingest-techmeme-events',
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
      timeout_milliseconds := 90000
    );
  $cron$
);

COMMIT;
