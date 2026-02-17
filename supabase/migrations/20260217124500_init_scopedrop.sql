CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE public.article_status AS ENUM ('scouted', 'analyzing', 'published', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.business_category AS ENUM ('Startup', 'Tech', 'Business', 'Case Study');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content_html TEXT,
  summary TEXT,
  category public.business_category NOT NULL DEFAULT 'Business',
  status public.article_status NOT NULL DEFAULT 'scouted',
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_analysis_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_html TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS summary TEXT;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS status public.article_status DEFAULT 'scouted';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS source_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.articles
      ADD COLUMN category public.business_category NOT NULL DEFAULT 'Business';
  END IF;
END
$$;

DO $$
DECLARE
  category_udt TEXT;
BEGIN
  SELECT c.udt_name
  INTO category_udt
  FROM information_schema.columns AS c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'articles'
    AND c.column_name = 'category';

  IF category_udt IS NOT NULL AND category_udt <> 'business_category' THEN
    ALTER TABLE public.articles
      ALTER COLUMN category DROP DEFAULT;

    ALTER TABLE public.articles
      ALTER COLUMN category TYPE public.business_category
      USING (
        CASE
          WHEN category IS NULL THEN 'Business'::public.business_category
          WHEN category IN ('Startup', 'Tech', 'Business', 'Case Study') THEN category::public.business_category
          WHEN lower(category) LIKE '%startup%' THEN 'Startup'::public.business_category
          WHEN lower(category) LIKE '%tech%' THEN 'Tech'::public.business_category
          WHEN lower(category) LIKE '%case%' THEN 'Case Study'::public.business_category
          ELSE 'Business'::public.business_category
        END
      );
  END IF;

  ALTER TABLE public.articles
    ALTER COLUMN category SET DEFAULT 'Business';
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND column_name = 'description'
  ) THEN
    EXECUTE '
      UPDATE public.articles
      SET summary = description
      WHERE summary IS NULL
        AND description IS NOT NULL
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND column_name = 'content'
  ) THEN
    EXECUTE '
      UPDATE public.articles
      SET content_html = content
      WHERE content_html IS NULL
        AND content IS NOT NULL
    ';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'articles'
      AND column_name = 'url'
  ) THEN
    EXECUTE '
      UPDATE public.articles
      SET source_urls = jsonb_build_array(url)
      WHERE (source_urls IS NULL OR source_urls = ''[]''::jsonb)
        AND url IS NOT NULL
        AND btrim(url) <> ''''
    ';
  END IF;
END
$$;

UPDATE public.articles
SET slug = concat(
  trim(both '-' FROM regexp_replace(lower(coalesce(title, 'article')), '[^a-z0-9]+', '-', 'g')),
  '-',
  left(id::text, 8)
)
WHERE slug IS NULL OR btrim(slug) = '';

UPDATE public.articles
SET category = 'Business'
WHERE category IS NULL;

UPDATE public.articles
SET status = 'scouted'
WHERE status IS NULL;

UPDATE public.articles
SET source_urls = '[]'::jsonb
WHERE source_urls IS NULL;

UPDATE public.articles
SET ai_analysis_metadata = '{}'::jsonb
WHERE ai_analysis_metadata IS NULL;

ALTER TABLE public.articles ALTER COLUMN slug SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN source_urls SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN ai_analysis_metadata SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.articles ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.articles ALTER COLUMN status SET DEFAULT 'scouted';
ALTER TABLE public.articles ALTER COLUMN source_urls SET DEFAULT '[]'::jsonb;
ALTER TABLE public.articles ALTER COLUMN ai_analysis_metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE public.articles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE public.articles ALTER COLUMN updated_at SET DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON public.articles (status);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON public.articles (created_at DESC);

CREATE OR REPLACE FUNCTION public.scopedrop_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger AS trg
    JOIN pg_class AS cls ON trg.tgrelid = cls.oid
    JOIN pg_namespace AS nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'public'
      AND cls.relname = 'articles'
      AND trg.tgname IN ('set_articles_updated_at', 'update_articles_updated_at')
  ) THEN
    CREATE TRIGGER set_articles_updated_at
      BEFORE UPDATE ON public.articles
      FOR EACH ROW
      EXECUTE FUNCTION public.scopedrop_set_updated_at();
  END IF;
END
$$;
