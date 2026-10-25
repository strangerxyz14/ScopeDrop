-- ============================================================
-- LLM capacity: per-model usage + shared model state (2026-10-25)
--
-- Groq's free tier limits each model separately, org-wide: 30 RPM, 1K
-- RPD, 8K TPM, 200K TPD (cached prompt tokens don't count). On
-- 2026-10-24/25 the route-section backfill used up the TPD of both
-- gpt-oss models and starved live article writing. llm_stats can't show
-- that: it's keyed (date, provider, task_class), with no model, and
-- adding model to its unique key would mean dropping a constraint. So:
--
-- llm_usage: one row per (date, provider, model, task_class, priority),
--   with billable tokens (input - cached + output). _shared/llm.ts
--   writes it after every call and reads it for the budget allocator.
-- llm_model_state: one row per model, shared by every edge function:
--   a cooldown set from a 429 ("try again in 7m12s" / retry-after) and
--   the latest x-ratelimit-* header readings (RPD and TPM).
-- llm_budget(provider, model): billable tokens in the last ~24h plus the
--   cooldown. Groq doesn't document whether TPD is a rolling 24h or a
--   calendar day; with daily rows this approximates rolling 24h as
--   today + yesterday x (share of today still to go), which is never
--   below the calendar-day figure.
--
-- Additive only. llm_stats keeps being written as before. Both tables
-- are service-role only (RLS on, no policies).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.llm_usage (
  date            date        NOT NULL,
  provider        text        NOT NULL,
  model           text        NOT NULL,
  task_class      text        NOT NULL,
  priority        text        NOT NULL,
  calls           integer     NOT NULL DEFAULT 0,
  failures        integer     NOT NULL DEFAULT 0,
  budget_skips    integer     NOT NULL DEFAULT 0,
  tokens_in       bigint      NOT NULL DEFAULT 0,
  tokens_cached   bigint      NOT NULL DEFAULT 0,
  tokens_out      bigint      NOT NULL DEFAULT 0,
  billable_tokens bigint      NOT NULL DEFAULT 0,
  sample_error    text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (date, provider, model, task_class, priority)
);

CREATE TABLE IF NOT EXISTS public.llm_model_state (
  provider          text        NOT NULL,
  model             text        NOT NULL,
  cooldown_until    timestamptz,
  cooldown_reason   text,
  rpd_limit         integer,
  rpd_remaining     integer,
  tpm_limit         integer,
  tpm_remaining     integer,
  headers_at        timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, model)
);

ALTER TABLE public.llm_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_model_state ENABLE ROW LEVEL SECURITY;

-- p_outcome: 'ok' | 'error' | 'skipped' (the allocator declined the call).
CREATE OR REPLACE FUNCTION public.increment_llm_usage(
  p_date date, p_provider text, p_model text, p_task_class text, p_priority text,
  p_outcome text, p_tokens_in integer, p_tokens_cached integer, p_tokens_out integer,
  p_error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_in bigint := COALESCE(p_tokens_in, 0);
  v_cached bigint := LEAST(COALESCE(p_tokens_cached, 0), COALESCE(p_tokens_in, 0));
  v_out bigint := COALESCE(p_tokens_out, 0);
BEGIN
  INSERT INTO public.llm_usage AS u (date, provider, model, task_class, priority,
    calls, failures, budget_skips, tokens_in, tokens_cached, tokens_out, billable_tokens, sample_error, updated_at)
  VALUES (p_date, p_provider, p_model, p_task_class, p_priority,
    CASE WHEN p_outcome = 'skipped' THEN 0 ELSE 1 END,
    CASE WHEN p_outcome = 'error' THEN 1 ELSE 0 END,
    CASE WHEN p_outcome = 'skipped' THEN 1 ELSE 0 END,
    v_in, v_cached, v_out, v_in - v_cached + v_out,
    CASE WHEN p_outcome = 'error' THEN p_error END, now())
  ON CONFLICT (date, provider, model, task_class, priority) DO UPDATE SET
    calls = u.calls + EXCLUDED.calls,
    failures = u.failures + EXCLUDED.failures,
    budget_skips = u.budget_skips + EXCLUDED.budget_skips,
    tokens_in = u.tokens_in + EXCLUDED.tokens_in,
    tokens_cached = u.tokens_cached + EXCLUDED.tokens_cached,
    tokens_out = u.tokens_out + EXCLUDED.tokens_out,
    billable_tokens = u.billable_tokens + EXCLUDED.billable_tokens,
    sample_error = COALESCE(EXCLUDED.sample_error, u.sample_error),
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.llm_budget(p_provider text, p_model text)
RETURNS TABLE (used_24h bigint, cooldown_until timestamptz, cooldown_reason text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  WITH day AS (
    SELECT
      COALESCE(SUM(billable_tokens) FILTER (WHERE date = (now() AT TIME ZONE 'utc')::date), 0) AS today,
      COALESCE(SUM(billable_tokens) FILTER (WHERE date = (now() AT TIME ZONE 'utc')::date - 1), 0) AS yesterday
    FROM public.llm_usage
    WHERE provider = p_provider AND model = p_model
      AND date >= (now() AT TIME ZONE 'utc')::date - 1
  ),
  left_of_today AS (
    SELECT 1 - EXTRACT(EPOCH FROM ((now() AT TIME ZONE 'utc') - date_trunc('day', now() AT TIME ZONE 'utc'))) / 86400.0 AS share
  )
  SELECT
    (day.today + day.yesterday * left_of_today.share)::bigint,
    s.cooldown_until,
    s.cooldown_reason
  FROM day CROSS JOIN left_of_today
  LEFT JOIN public.llm_model_state s ON s.provider = p_provider AND s.model = p_model;
$$;

COMMIT;
