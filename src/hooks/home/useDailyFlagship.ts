import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FlagshipArticle = Database["public"]["Tables"]["articles"]["Row"];

export interface FlagshipResult {
  article: FlagshipArticle | null;
  isYesterday: boolean;
}

export function useDailyFlagship() {
  return useQuery<FlagshipResult>({
    queryKey: ["home", "flagship"],
    queryFn: async () => {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);

      const { data: today, error: todayErr } = await supabase
        .from("articles")
        .select("*")
        .eq("is_flagship", true)
        .eq("status", "published")
        .gte("published_at", startOfToday.toISOString())
        .order("published_at", { ascending: false })
        .limit(1);
      if (todayErr) throw todayErr;
      if (today && today.length > 0) return { article: today[0], isYesterday: false };

      const { data: prev, error: prevErr } = await supabase
        .from("articles")
        .select("*")
        .eq("is_flagship", true)
        .eq("status", "published")
        .gte("published_at", startOfYesterday.toISOString())
        .lt("published_at", startOfToday.toISOString())
        .order("published_at", { ascending: false })
        .limit(1);
      if (prevErr) throw prevErr;
      if (prev && prev.length > 0) return { article: prev[0], isYesterday: true };

      return { article: null, isYesterday: false };
    },
    staleTime: 60 * 1000,
  });
}
