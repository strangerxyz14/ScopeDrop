import { supabase } from "@/integrations/supabase/client";
import type { NewsArticle } from "@/types/news";

export type DbArticleRow = Record<string, unknown> & {
  id?: string;
  title?: string;
  slug?: string;
  content_html?: string | null;
  summary?: string | null;
  category?: string | null;
  source_urls?: unknown;
  ai_analysis_metadata?: unknown;
  is_published?: boolean | null;
  published_at?: string | null;
  created_at?: string | null;
};

function firstSourceUrl(sourceUrls: unknown): string | null {
  if (Array.isArray(sourceUrls)) {
    const first = sourceUrls.find((u) => typeof u === "string" && u.trim().length > 0);
    return typeof first === "string" ? first.trim() : null;
  }

  if (typeof sourceUrls === "string") {
    // Some setups store JSONB arrays as strings in edge cases.
    try {
      const parsed = JSON.parse(sourceUrls);
      if (Array.isArray(parsed)) {
        const first = parsed.find((u) => typeof u === "string" && u.trim().length > 0);
        return typeof first === "string" ? first.trim() : null;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function mapDbArticleToNewsArticle(row: DbArticleRow): NewsArticle {
  const hasHtml = isNonEmptyString(row.content_html);
  const internalPath = row.slug ? `/article/${row.slug}` : row.id ? `/article/${row.id}` : "#";
  const sourceUrl = firstSourceUrl(row.source_urls);

  return {
    id: row.id,
    slug: row.slug,
    title: isNonEmptyString(row.title) ? row.title : "Untitled",
    description: isNonEmptyString(row.summary) ? row.summary : "",
    content: hasHtml ? row.content_html : undefined,
    url: hasHtml ? internalPath : (sourceUrl ?? internalPath),
    publishedAt: (row.published_at ?? row.created_at ?? new Date().toISOString()) as string,
    source: sourceUrl ? { name: "Source", url: sourceUrl } : { name: "ScopeDrop", url: "" },
    category: isNonEmptyString(row.category) ? row.category : undefined,
    processedByAI: Boolean(row.ai_analysis_metadata),
  };
}

export async function fetchLatestArticles(limit: number = 20): Promise<DbArticleRow[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as DbArticleRow[];
}

export async function fetchArticlesByCategory(category: string, limit: number = 20): Promise<DbArticleRow[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("category", category)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as DbArticleRow[];
}

export async function fetchFundingArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("Funding", limit);
}

export async function fetchBusinessArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("Business", limit);
}

export async function fetchStartupArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("Startup", limit);
}

export async function fetchArticleByIdOrSlug(idOrSlug: string): Promise<DbArticleRow | null> {
  const trimmed = idOrSlug.trim();
  if (!trimmed) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed);

  if (isUuid) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("id", trimmed)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as unknown as DbArticleRow | null;
  }

  const { data, error } = await (supabase
    .from("articles")
    .select("*") as any)
    .eq("slug", trimmed)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as DbArticleRow | null;
}

