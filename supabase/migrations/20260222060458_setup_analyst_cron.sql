-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cron job to run disruptor-analysis every minute
-- Replace YOUR_ANON_KEY with your actual Supabase anon key from .env file
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
);

-- Grant usage permissions to authenticated users
GRANT USAGE ON SCHEMA cron TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA cron TO authenticated;