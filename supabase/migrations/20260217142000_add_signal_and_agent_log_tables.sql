CREATE TABLE IF NOT EXISTS public.raw_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline TEXT NOT NULL,
  summary TEXT,
  source_url TEXT NOT NULL UNIQUE,
  category public.business_category NOT NULL DEFAULT 'Business',
  signal_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  status public.article_status NOT NULL DEFAULT 'scouted',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  scouted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_raw_signals_status ON public.raw_signals (status);
CREATE INDEX IF NOT EXISTS idx_raw_signals_category ON public.raw_signals (category);
CREATE INDEX IF NOT EXISTS idx_raw_signals_scouted_at ON public.raw_signals (scouted_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_name ON public.agent_logs (agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_logs_article_id ON public.agent_logs (article_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON public.agent_logs (created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'raw_signals'
      AND trg.tgname = 'set_raw_signals_updated_at'
  ) THEN
    CREATE TRIGGER set_raw_signals_updated_at
      BEFORE UPDATE ON public.raw_signals
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END
$$;
