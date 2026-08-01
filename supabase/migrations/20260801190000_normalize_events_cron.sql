-- Phase 3 cron: normalize-events invocation schedule.
--
-- INTENTIONALLY DISABLED. This migration ships the pg_cron.schedule
-- statement as an inert SELECT so applying the migration doesn't
-- immediately start burning Groq calls on a queue no fetcher has
-- populated yet (nothing writes status='awaiting_enrichment' in
-- Phase 3 — that's the fetcher rewrite for Phase 4). Enable AFTER
-- the 24-hour smoke-test window agreed in the plan reply:
--
--   1. Backfill one or two scheduled_events rows to
--      status='awaiting_enrichment' by hand.
--   2. Invoke normalize-events manually and inspect the result.
--   3. Verify a published row surfaces on /events with real
--      Highlights + Scope prose.
--   4. Uncomment the pg_cron.schedule() call below and re-apply
--      this migration (idempotent — unschedule-first pattern).
--
-- Watch trap called out in memory: never leave the literal string
-- YOUR_SUPABASE_SERVICE_ROLE_KEY in the command body. The vault
-- read below fetches the real service-role key at cron-fire time
-- so the command string never contains the key literal.

BEGIN;

-- Guard: unschedule an existing job of this name before rescheduling,
-- so re-running this migration doesn't create duplicate cron entries.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'normalize-events-15min') THEN
    PERFORM cron.unschedule('normalize-events-15min');
  END IF;
END $$;

-- ── ENABLE BLOCK — commented out during Phase 3 rollout ────────────
-- Uncomment the block below after smoke-test to schedule the cron.
-- Uses vault.decrypted_secrets to inject the service-role key at
-- fire time (never persisted in cron.job.command as a literal).
--
-- SELECT cron.schedule(
--   'normalize-events-15min',
--   '*/15 * * * *',
--   $cron$
--     SELECT net.http_post(
--       url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/normalize-events',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer ' || (
--           SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_service_role_key' LIMIT 1
--         )
--       ),
--       body := '{}'::jsonb,
--       timeout_milliseconds := 55000
--     );
--   $cron$
-- );
--
-- Prerequisite for the vault path above: the cron_service_role_key
-- secret must exist in Supabase vault. If it doesn't yet, run once
-- with the service role key as a literal in a session (never in a
-- committed migration), verify the cron runs, then rotate.

COMMIT;
