-- Final cron job setup
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'disruptor-analysis-worker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/disruptor-analysis',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_NJo2QJyYm8NZ0C2YK0Rw1w_3WSSy4xE'
    ),
    body := '{}'
  );
  $$
)
