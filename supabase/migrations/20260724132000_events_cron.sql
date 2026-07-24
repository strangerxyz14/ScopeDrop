-- ============================================================
-- Cron: single daily job that rotates through 4 metros using
-- day-of-week modulo 4. Total: ~30 SerpAPI calls/month
-- (well under the 100/mo free tier), leaves ~70 calls of margin
-- for manual invocation via the admin surface or dev testing.
-- Reads the auth key from Vault (cron_service_role_key) — never
-- hardcoded into cron.job.command.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fetch-events-daily') THEN
    PERFORM cron.unschedule('fetch-events-daily');
  END IF;
END $$;

SELECT cron.schedule(
  'fetch-events-daily',
  '0 6 * * *',
  $CRON$
  SELECT net.http_post(
    url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/fetch-events',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'city', (ARRAY['Delhi', 'Bengaluru', 'Mumbai', 'Hyderabad'])[
        (extract(dow FROM now())::int % 4) + 1
      ],
      'region', CASE (extract(dow FROM now())::int % 4)
        WHEN 0 THEN 'Delhi NCR'
        ELSE NULL
      END
    )
  );
  $CRON$
);
