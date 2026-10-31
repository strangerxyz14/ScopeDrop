-- Deal status on capital events, and total raised computed from real rounds.
--
-- An audit on 2026-10-31 found "seeks $30B", "in talks to buy" and "plans
-- an IPO" stories recorded as if the deals were done, and nothing filled
-- entities.total_funding_raised for real companies (the directory ranked
-- by it, so only placeholder rows had values).
--
-- 1. capital_events.deal_status:
--      closed    done: raised, closed, completed, acquired, listed
--      agreed    signed but not closed: agrees to, to acquire, pending
--      reported  not done: seeks, in talks, plans, reportedly, nearing
--    Backfilled from the event's one-liner and its source headline. New
--    events get it from extract-structured (its guards PR); until then a
--    NULL status is treated as unknown and counts nowhere.
-- 2. refresh_entity_funding(entity): total_funding_raised = sum of the
--    entity's closed funding rounds; last_funding_stage = its latest closed
--    round's type. IPO proceeds and acquisitions don't count as raised.
-- 3. A trigger on capital_events keeps both current for the entities an
--    insert, update or delete touches. Everything is backfilled once here.
--
-- Additive. To roll back:
--   DROP TRIGGER IF EXISTS capital_events_refresh_funding ON public.capital_events;
--   DROP FUNCTION IF EXISTS public.capital_events_refresh_funding();
--   DROP FUNCTION IF EXISTS public.refresh_entity_funding(uuid);
--   ALTER TABLE public.capital_events DROP COLUMN deal_status;

BEGIN;

ALTER TABLE public.capital_events ADD COLUMN IF NOT EXISTS deal_status text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'capital_events_deal_status_check') THEN
    ALTER TABLE public.capital_events ADD CONSTRAINT capital_events_deal_status_check
      CHECK (deal_status IN ('closed', 'agreed', 'reported'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_capital_events_entity_status
  ON public.capital_events(primary_entity_id, event_type, deal_status);

-- Backfill from wording. "Not done" wins over "agreed", which wins over "done":
-- "OpenAI seeks $20B after raising..." is still a round being sought.
WITH texts AS (
  SELECT ce.id, ce.event_type,
         lower(coalesce(ce.one_liner, '') || ' ' || coalesce((
           SELECT rs.title FROM public.raw_signals rs WHERE rs.source_url = ce.source_url LIMIT 1
         ), '')) AS t
  FROM public.capital_events ce
  WHERE ce.deal_status IS NULL
)
UPDATE public.capital_events ce
SET deal_status = CASE
  WHEN x.t ~ '\m(seeks?|seeking|looks? to raise|in talks|early talks|exclusive talks|plans?|planning|prepares?|preparing|eyes|targets?|targeting|considers?|considering|weighs|exploring|reportedly|bids?|offer|nearing|halts?|delay|delays|mulls?)\M'
    THEN 'reported'
  WHEN x.t ~ '\m(agrees? to|agreed to|to acquire|will acquire|set to (close|acquire|buy)|definitive agreement|signed|pending)\M'
    THEN 'agreed'
  WHEN x.t ~ '\m(raises|raised|closes|closed|completes|completed|acquired|acquires|bought|buys|secures|secured|lands|landed|goes public|went public|debuts?|debuted|listed|lists)\M'
    THEN 'closed'
  WHEN x.event_type = 'funding' THEN 'closed'
  WHEN x.event_type = 'acquisition' THEN 'agreed'
  ELSE 'reported'
END
FROM texts x
WHERE x.id = ce.id;

CREATE OR REPLACE FUNCTION public.refresh_entity_funding(p_entity uuid)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE public.entities e
  SET total_funding_raised = (
        SELECT sum(c.amount_usd) FROM public.capital_events c
        WHERE c.primary_entity_id = p_entity AND c.event_type = 'funding'
          AND c.deal_status = 'closed' AND c.amount_usd IS NOT NULL
      ),
      last_funding_stage = (
        SELECT c.round_type FROM public.capital_events c
        WHERE c.primary_entity_id = p_entity AND c.event_type = 'funding'
          AND c.deal_status = 'closed' AND c.round_type IS NOT NULL
        ORDER BY c.announced_at DESC NULLS LAST, c.created_at DESC
        LIMIT 1
      )
  WHERE e.id = p_entity;
$$;

CREATE OR REPLACE FUNCTION public.capital_events_refresh_funding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.primary_entity_id IS NOT NULL THEN
    PERFORM public.refresh_entity_funding(OLD.primary_entity_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.primary_entity_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.primary_entity_id IS DISTINCT FROM OLD.primary_entity_id
          OR NEW.amount_usd IS DISTINCT FROM OLD.amount_usd
          OR NEW.deal_status IS DISTINCT FROM OLD.deal_status
          OR NEW.event_type IS DISTINCT FROM OLD.event_type
          OR NEW.round_type IS DISTINCT FROM OLD.round_type
          OR NEW.announced_at IS DISTINCT FROM OLD.announced_at) THEN
    PERFORM public.refresh_entity_funding(NEW.primary_entity_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS capital_events_refresh_funding ON public.capital_events;
CREATE TRIGGER capital_events_refresh_funding
AFTER INSERT OR UPDATE OR DELETE ON public.capital_events
FOR EACH ROW EXECUTE FUNCTION public.capital_events_refresh_funding();

-- Backfill: every entity with events, then clear values on entities with none
-- (only placeholder rows ever had them).
SELECT public.refresh_entity_funding(id)
FROM public.entities
WHERE id IN (SELECT DISTINCT primary_entity_id FROM public.capital_events WHERE primary_entity_id IS NOT NULL);

UPDATE public.entities e
SET total_funding_raised = NULL, last_funding_stage = NULL
WHERE (e.total_funding_raised IS NOT NULL OR e.last_funding_stage IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.capital_events c WHERE c.primary_entity_id = e.id);

COMMIT;
