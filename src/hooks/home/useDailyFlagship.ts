import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type FlagshipArticle = Database["public"]["Tables"]["articles"]["Row"];

// "today"     — the 06:00 IST select-flagship pick for today
// "yesterday" — no pick yet today (before 06:00 IST, or the job failed)
// "latest"    — no flagship for two days: show the newest story instead
//               of an empty hero. WhatsBuildingToday skips this article.
export type FlagshipKind = "today" | "yesterday" | "latest";

export interface FlagshipResult {
  article: FlagshipArticle | null;
  kind: FlagshipKind | null;
}

// The edition is defined in IST (UTC+5:30, no DST), not the viewer's
// local day — a reader in New York shouldn't lose today's flagship at
// their midnight.
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfIstDay(now: Date = new Date()): Date {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(istMidnight - IST_OFFSET_MS);
}

export function useDailyFlagship() {
  return useQuery<FlagshipResult>({
    queryKey: ["home", "flagship"],
    queryFn: async () => {
      const startOfToday = startOfIstDay();
      const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS);

      const { data: flagships, error: flagErr } = await supabase
        .from("articles")
        .select("*")
        .eq("is_flagship", true)
        .eq("status", "published")
        .gte("published_at", startOfYesterday.toISOString())
        .order("published_at", { ascending: false })
        .limit(1);
      if (flagErr) throw flagErr;
      const flagship = flagships?.[0];
      if (flagship?.published_at) {
        const isToday = new Date(flagship.published_at) >= startOfToday;
        return { article: flagship, kind: isToday ? "today" : "yesterday" };
      }

      // Fallback: newest published story, preferring one with an image so
      // the hero isn't a placeholder twice over.
      const latestQuery = (requireImage: boolean) => {
        let q = supabase
          .from("articles")
          .select("*")
          .eq("status", "published")
          .eq("is_flagship", false);
        if (requireImage) q = q.not("image_url", "is", null);
        return q.order("created_at", { ascending: false }).limit(1);
      };
      for (const requireImage of [true, false]) {
        const { data: latest, error: latestErr } = await latestQuery(requireImage);
        if (latestErr) throw latestErr;
        if (latest && latest.length > 0) return { article: latest[0], kind: "latest" };
      }

      return { article: null, kind: null };
    },
    staleTime: 60 * 1000,
  });
}
