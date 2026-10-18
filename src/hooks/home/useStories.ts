import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StoryArticle } from "@/components/home/StoryCards";

// The listing opens with a 5-story lead flow, then a 3-column grid.
// The first page carries 5 extra rows so the grid always fills whole rows.
export const STORY_LEAD_SIZE = 5;
export const STORY_PAGE_SIZE = 24;

function pageRange(page: number): [number, number] {
  if (page === 0) return [0, STORY_LEAD_SIZE + STORY_PAGE_SIZE - 1];
  const from = STORY_LEAD_SIZE + page * STORY_PAGE_SIZE;
  return [from, from + STORY_PAGE_SIZE - 1];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Published articles, newest first, paged. `category` null = all. */
export function useStories(category: string | null) {
  return useInfiniteQuery<StoryArticle[]>({
    queryKey: ["stories", category],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const [from, to] = pageRange(pageParam as number);
      let q = supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        // created_at: see useFreshFlow for why published_at can't be trusted.
        .order("created_at", { ascending: false })
        .range(from, to);
      if (category) q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last, all) => {
      const [from, to] = pageRange(all.length - 1);
      return last.length === to - from + 1 ? all.length : undefined;
    },
    staleTime: 60 * 1000,
  });
}

/** One published article by UUID. Non-UUID ids (legacy slug links) resolve to null. */
export function useArticle(id: string | undefined) {
  return useQuery<StoryArticle | null>({
    queryKey: ["article", id],
    enabled: Boolean(id),
    queryFn: async () => {
      if (!id || !UUID_RE.test(id)) return null;
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Latest stories in the same category, excluding the current one. */
export function useRelatedStories(article: StoryArticle | null | undefined, limit = 3) {
  return useQuery<StoryArticle[]>({
    queryKey: ["article-related", article?.id, article?.category, limit],
    enabled: Boolean(article),
    queryFn: async () => {
      if (!article) return [];
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .eq("category", article.category)
        .neq("id", article.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
