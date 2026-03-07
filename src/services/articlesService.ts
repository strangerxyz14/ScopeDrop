import { supabase } from "@/integrations/supabase/client";
import type { NewsArticle } from "@/types/news";

// React Query defaults for all article fetches
export const ARTICLE_QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000,
  refetchInterval: 10 * 60 * 1000,
  retry: 2,
};

// Maps the new Groq-pipeline articles schema to the frontend NewsArticle type
export type DbArticleRow = Record<string, unknown> & {
  id?: string;
  headline?: string;
  summary?: string;
  content_html?: string | null;
  category?: string | null;
  tags?: string[] | null;
  read_time_minutes?: number | null;
  source_signal_id?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function mapDbArticleToNewsArticle(row: DbArticleRow): NewsArticle {
  const internalPath = row.id ? `/article/${row.id}` : "#";

  return {
    id: row.id,
    title: isNonEmptyString(row.headline) ? row.headline : "Untitled",
    description: isNonEmptyString(row.summary) ? row.summary : "",
    content: isNonEmptyString(row.content_html) ? (row.content_html as string) : undefined,
    url: internalPath,
    publishedAt: (row.created_at ?? new Date().toISOString()) as string,
    source: { name: "ScopeDrop", url: "" },
    category: isNonEmptyString(row.category) ? row.category : undefined,
    tags: Array.isArray(row.tags) ? row.tags : undefined,
    processedByAI: true,
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
  return fetchArticlesByCategory("funding", limit);
}

export async function fetchStartupArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("startups", limit);
}

export async function fetchMarketArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("markets", limit);
}

export async function fetchAIArticles(limit: number = 20): Promise<DbArticleRow[]> {
  return fetchArticlesByCategory("ai", limit);
}

export async function fetchArticleById(id: string): Promise<DbArticleRow | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", trimmed)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as unknown as DbArticleRow | null;
}

