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

-- ============================================================
-- Seed data — 8 fictional funding rounds, clearly marked with
-- source_url = 'https://scopedrop.internal/seed' for one-query
-- cleanup later. Idempotent via fixed UUIDs + ON CONFLICT DO NOTHING.
-- ============================================================

-- Companies (8)
INSERT INTO public.entities (id, entity_type, name, slug, description, sector, founded_year, headquarters) VALUES
  ('a0000000-0000-4000-8000-000000000001','company','Vaultflow','vaultflow','Treasury automation for mid-market finance teams.','fintech',2023,'Bengaluru, India'),
  ('a0000000-0000-4000-8000-000000000002','company','Kagami Labs','kagami-labs','On-device vision models for industrial QA.','ai',2024,'Pune, India'),
  ('a0000000-0000-4000-8000-000000000003','company','TerraGrid','terragrid','Grid-scale battery orchestration software.','climate',2022,'Mumbai, India'),
  ('a0000000-0000-4000-8000-000000000004','company','Paperless Health','paperless-health','Claims automation for hospital billing desks.','healthtech',2022,'Hyderabad, India'),
  ('a0000000-0000-4000-8000-000000000005','company','Driftline','driftline','Logistics visibility layer for tier-2 exporters.','logistics',2023,'Chennai, India'),
  ('a0000000-0000-4000-8000-000000000006','company','Quorum Stack','quorum-stack','Compliance copilot for SEBI-regulated brokers.','fintech',2021,'Mumbai, India'),
  ('a0000000-0000-4000-8000-000000000007','company','Nimbus Forge','nimbus-forge','GPU scheduling platform for AI infra teams.','devtools',2022,'Bengaluru, India'),
  ('a0000000-0000-4000-8000-000000000008','company','Sable Robotics','sable-robotics','Warehouse picking robots for grocery fulfilment.','robotics',2021,'Delhi NCR, India')
ON CONFLICT DO NOTHING;

-- Investors (4, shared across rounds)
INSERT INTO public.entities (id, entity_type, name, slug, description) VALUES
  ('b0000000-0000-4000-8000-000000000001','investor','Peak Alpha Capital','peak-alpha-capital','Early-stage fund, India + SEA.'),
  ('b0000000-0000-4000-8000-000000000002','investor','Meridian Ventures','meridian-ventures','Sector-agnostic seed and Series A investor.'),
  ('b0000000-0000-4000-8000-000000000003','investor','Southbridge Partners','southbridge-partners','Growth-stage technology fund.'),
  ('b0000000-0000-4000-8000-000000000004','investor','Kite Capital','kite-capital','Deeptech-focused micro VC.')
ON CONFLICT DO NOTHING;

-- Funding rounds (8) — amounts $500K → $120M so the amount bar has
-- real spread; one announced today to exercise the "New" pulse dot.
INSERT INTO public.capital_events
  (id, event_type, primary_entity_id, round_type, amount_usd, valuation_usd, announced_at, one_liner, source_url) VALUES
  ('c0000000-0000-4000-8000-000000000001','funding','a0000000-0000-4000-8000-000000000002','pre_seed',   500000,     NULL,        current_date,      'Kagami Labs raises pre-seed for on-device industrial vision models.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000002','funding','a0000000-0000-4000-8000-000000000005','seed',       2400000,    12000000,    current_date - 3,  'Driftline closes seed round to expand exporter logistics network.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000003','funding','a0000000-0000-4000-8000-000000000001','seed',       8000000,    40000000,    current_date - 6,  'Vaultflow raises seed for treasury automation platform.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000004','funding','a0000000-0000-4000-8000-000000000004','series_a',   15000000,   75000000,    current_date - 10, 'Paperless Health lands Series A to scale claims automation.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000005','funding','a0000000-0000-4000-8000-000000000007','series_a',   30000000,   150000000,   current_date - 14, 'Nimbus Forge raises Series A for GPU scheduling infrastructure.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000006','funding','a0000000-0000-4000-8000-000000000006','series_b',   55000000,   320000000,   current_date - 19, 'Quorum Stack secures Series B for broker compliance suite.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000007','funding','a0000000-0000-4000-8000-000000000003','series_b',   85000000,   500000000,   current_date - 24, 'TerraGrid raises Series B to orchestrate grid-scale storage.','https://scopedrop.internal/seed'),
  ('c0000000-0000-4000-8000-000000000008','funding','a0000000-0000-4000-8000-000000000008','series_c',   120000000,  900000000,   current_date - 29, 'Sable Robotics closes Series C for grocery fulfilment robots.','https://scopedrop.internal/seed')
ON CONFLICT DO NOTHING;

-- Investor links — leads flagged, investors shared across rounds
INSERT INTO public.capital_event_investors (capital_event_id, investor_entity_id, is_lead) VALUES
  ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000004', true),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001', true),
  ('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002', false),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002', true),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004', false),
  ('c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002', true),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000001', true),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000003', false),
  ('c0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000003', true),
  ('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000003', true),
  ('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000001', false),
  ('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000003', true),
  ('c0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000002', false)
ON CONFLICT DO NOTHING;
