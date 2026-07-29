-- LLM call telemetry — separate table from pipeline_stats so the
-- existing narrative pipeline's daily rollup (tokens_used /
-- articles_generated / requests_made) keeps working unchanged.
-- New table indexes on (date, provider, task_class) so the abstraction
-- can attribute every LLM call to a provider + task class without
-- disturbing the aggregate counters callers already depend on.
--
-- Populated by the increment_llm_stat RPC below, called from
-- _shared/llm.ts::recordStat() at the end of every callLLM invocation
-- (success and failure alike — telemetry failures never block LLM calls).

BEGIN;

CREATE TABLE IF NOT EXISTS public.llm_stats (
  date              date         NOT NULL DEFAULT CURRENT_DATE,
  provider          text         NOT NULL,
  task_class        text         NOT NULL,
  success_count     integer      NOT NULL DEFAULT 0,
  failure_count     integer      NOT NULL DEFAULT 0,
  tokens_in_total   integer      NOT NULL DEFAULT 0,
  tokens_out_total  integer      NOT NULL DEFAULT 0,
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT llm_stats_date_provider_task_unique UNIQUE (date, provider, task_class)
);

CREATE INDEX IF NOT EXISTS llm_stats_date_provider_task_idx
  ON public.llm_stats (date DESC, provider, task_class);

-- RLS: read is public (dashboards), writes only via SECURITY DEFINER RPC.
ALTER TABLE public.llm_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS llm_stats_public_read ON public.llm_stats;
CREATE POLICY llm_stats_public_read ON public.llm_stats FOR SELECT USING (true);

-- Unified increment RPC. Called from _shared/llm.ts on every LLM call.
-- SECURITY DEFINER so the service-role client on the edge function
-- side doesn't need to worry about RLS; anon/authenticated roles
-- cannot call this directly.
CREATE OR REPLACE FUNCTION public.increment_llm_stat(
  p_date       date,
  p_provider   text,
  p_task_class text,
  p_success    boolean,
  p_tokens_in  integer,
  p_tokens_out integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.llm_stats (
    date, provider, task_class,
    success_count, failure_count,
    tokens_in_total, tokens_out_total,
    updated_at
  ) VALUES (
    p_date, p_provider, p_task_class,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    COALESCE(p_tokens_in, 0),
    COALESCE(p_tokens_out, 0),
    now()
  )
  ON CONFLICT (date, provider, task_class) DO UPDATE SET
    success_count    = llm_stats.success_count    + EXCLUDED.success_count,
    failure_count    = llm_stats.failure_count    + EXCLUDED.failure_count,
    tokens_in_total  = llm_stats.tokens_in_total  + EXCLUDED.tokens_in_total,
    tokens_out_total = llm_stats.tokens_out_total + EXCLUDED.tokens_out_total,
    updated_at       = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_llm_stat FROM public;
GRANT EXECUTE ON FUNCTION public.increment_llm_stat TO service_role;

COMMIT;
