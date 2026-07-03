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
  image_url?: string | null;
};

const CATEGORY_FALLBACK_IMAGES: Record<string, string> = {
  funding:   "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=800&h=450&fit=crop",
  ai:        "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&h=450&fit=crop",
  startups:  "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=450&fit=crop",
  markets:   "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=450&fit=crop",
  policy:    "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&h=450&fit=crop",
  default:   "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=450&fit=crop",
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function mapDbArticleToNewsArticle(row: DbArticleRow): NewsArticle {
  const internalPath = row.id ? `/article/${row.id}` : "#";
  const category = isNonEmptyString(row.category) ? row.category : "default";
  const fallbackImage = CATEGORY_FALLBACK_IMAGES[category] ?? CATEGORY_FALLBACK_IMAGES.default;

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
    image: isNonEmptyString(row.image_url) ? (row.image_url as string) : fallbackImage,
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

