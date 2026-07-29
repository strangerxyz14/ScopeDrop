-- Adds a sample_error text column to llm_stats and extends the
-- increment_llm_stat RPC to persist the first (or most recent) error
-- message per (date, provider, task_class). Without this column,
-- the Cerebras 402/404 failures were only visible in edge-function
-- logs — grepping those requires the Supabase dashboard because the
-- CLI's `functions logs` subcommand doesn't exist in the current
-- Bun-based release. With this column, one SQL query surfaces the
-- actual provider error.

BEGIN;

ALTER TABLE public.llm_stats ADD COLUMN IF NOT EXISTS sample_error text;

-- Replace the RPC signature to accept the new optional p_error parameter.
DROP FUNCTION IF EXISTS public.increment_llm_stat(date, text, text, boolean, integer, integer);

CREATE OR REPLACE FUNCTION public.increment_llm_stat(
  p_date       date,
  p_provider   text,
  p_task_class text,
  p_success    boolean,
  p_tokens_in  integer,
  p_tokens_out integer,
  p_error      text DEFAULT NULL
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
    sample_error, updated_at
  ) VALUES (
    p_date, p_provider, p_task_class,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    CASE WHEN p_success THEN 0 ELSE 1 END,
    COALESCE(p_tokens_in, 0),
    COALESCE(p_tokens_out, 0),
    CASE WHEN NOT p_success THEN p_error ELSE NULL END,
    now()
  )
  ON CONFLICT (date, provider, task_class) DO UPDATE SET
    success_count    = llm_stats.success_count    + EXCLUDED.success_count,
    failure_count    = llm_stats.failure_count    + EXCLUDED.failure_count,
    tokens_in_total  = llm_stats.tokens_in_total  + EXCLUDED.tokens_in_total,
    tokens_out_total = llm_stats.tokens_out_total + EXCLUDED.tokens_out_total,
    -- Keep the most recent non-null error sample; NULL on a success row
    -- doesn't wipe a prior failure sample (COALESCE preserves it).
    sample_error     = COALESCE(EXCLUDED.sample_error, llm_stats.sample_error),
    updated_at       = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_llm_stat(date, text, text, boolean, integer, integer, text) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_llm_stat(date, text, text, boolean, integer, integer, text) TO service_role;

COMMIT;
