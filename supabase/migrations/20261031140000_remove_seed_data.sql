-- Remove the fictional seed rounds that 20260704120000_extraction_pipeline.sql
-- used to insert (8 companies, 4 investors, 8 funding rounds, 13 investor
-- links, all with fixed a0000000- / b0000000- / c0000000- ids and
-- source_url 'https://scopedrop.internal/seed'). They showed on the live
-- site as real companies. Production was cleaned by hand on 2026-10-31
-- (together with 4 unlabeled placeholder companies from 2026-07-18), so
-- this is a no-op there; it cleans any other database that ran the seed.
--
-- Only seed rows are touched: events are matched by the seed source_url,
-- and a seed entity is kept if anything real still references it.

BEGIN;

DELETE FROM public.capital_event_investors
WHERE capital_event_id IN (
  SELECT id FROM public.capital_events
  WHERE id::text LIKE 'c0000000-0000-4000-8000-%'
    AND source_url = 'https://scopedrop.internal/seed'
);

DELETE FROM public.capital_events
WHERE id::text LIKE 'c0000000-0000-4000-8000-%'
  AND source_url = 'https://scopedrop.internal/seed';

DELETE FROM public.entities e
WHERE (e.id::text LIKE 'a0000000-0000-4000-8000-%' OR e.id::text LIKE 'b0000000-0000-4000-8000-%')
  AND NOT EXISTS (
    SELECT 1 FROM public.capital_events c
    WHERE c.primary_entity_id = e.id OR c.counterparty_entity_id = e.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.capital_event_investors i WHERE i.investor_entity_id = e.id
  );

COMMIT;
