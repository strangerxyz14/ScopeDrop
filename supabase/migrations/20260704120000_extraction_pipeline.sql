-- ============================================================
-- Track B extraction pipeline: fuzzy-match RPC, cron, seed data
-- Pure additive — no destructive statements.
-- ============================================================

-- ── Fuzzy entity match RPC (pg_trgm lives in `extensions` schema) ──
CREATE OR REPLACE FUNCTION public.match_entity(p_name text, p_type text)
RETURNS TABLE (id uuid, sim real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT e.id, extensions.similarity(e.name, p_name) AS sim
  FROM public.entities e
  WHERE e.entity_type = p_type
    AND extensions.similarity(e.name, p_name) > 0.55
  ORDER BY sim DESC
  LIMIT 1;
$$;

-- ============================================================
-- Cron: extract-structured every 30 min at :02/:32 — right after
-- ingest-signals (:00/:30) and before generate-content's next
-- */6 slot (:06/:36), so structured events get first pick of
-- fresh pending signals.
-- NOTE: replace the bearer placeholder with the real secret at
-- apply time, same as was done for ingest-signals/generate-content.
-- ============================================================
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname = 'extract-structured';

SELECT cron.schedule(
  'extract-structured',
  '2,32 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kudoyccddmdilphlwann.supabase.co/functions/v1/extract-structured',
    headers := '{"Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- The fictional seed rounds that used to follow here were removed on
-- 2026-10-31: they appeared on the live site as real companies. See
-- 20261031140000_remove_seed_data.sql for databases that already ran them.
