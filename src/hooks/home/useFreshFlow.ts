import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FreshFlowArticle = Database["public"]["Tables"]["articles"]["Row"];

export function useFreshFlow(limit = 5) {
  return useQuery<FreshFlowArticle[]>({
    queryKey: ["home", "fresh-flow", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .eq("is_flagship", false)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });
}
