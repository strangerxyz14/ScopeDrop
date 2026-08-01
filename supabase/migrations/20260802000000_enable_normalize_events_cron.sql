-- Enable the normalize-events cron.
--
-- Prior migration 20260801190000_normalize_events_cron.sql shipped
-- the schedule block INTENTIONALLY DISABLED so the queue producer
-- could be wired up first. Fetchers now write awaiting_enrichment
-- in the same PR that lands this file, so we flip the switch:
-- 15-min cadence, service-role auth read from Supabase vault at
-- cron-fire time (never persisted as a literal in cron.job.command).
--
-- Vault secret 'cron_service_role_key' is provisioned. If a fresh
-- environment doesn't have it yet, create with:
--   SELECT vault.create_secret('<the-service-role-key>', 'cron_service_role_key');
--
-- Applied live 2026-08-02 during the enrichment-activation ship.

BEGIN;

-- Idempotency guard: unschedule any pre-existing job of this name.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'normalize-events-15min') THEN
    PERFORM cron.unschedule('normalize-events-15min');
  END IF;
END $$;

SELECT cron.schedule(
  'normalize-events-15min',
  '*/15 * * * *',
  $cron$
    SELECT net.http_post(
      url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/normalize-events',
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
      timeout_milliseconds := 55000
    );
  $cron$
);

COMMIT;
