import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type LearningTrack = Database["public"]["Tables"]["learning_tracks"]["Row"];
export type GlossaryTerm = Database["public"]["Tables"]["glossary_terms"]["Row"];

export interface LearnStep {
  title: string;
  minutes?: number;
  done?: boolean;
}

export function useLearnBand() {
  const tracksQuery = useQuery<LearningTrack[]>({
    queryKey: ["home", "learn", "tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const termsQuery = useQuery<GlossaryTerm[]>({
    queryKey: ["home", "learn", "terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });

  return {
    tracks: tracksQuery.data ?? [],
    terms: termsQuery.data ?? [],
    isLoading: tracksQuery.isLoading || termsQuery.isLoading,
    isError: tracksQuery.isError || termsQuery.isError,
  };
}

/** Best-effort parser: steps is jsonb array; each entry may be {title, minutes, done} or a bare string. */
export function parseSteps(steps: LearningTrack["steps"]): LearnStep[] {
  if (!Array.isArray(steps)) return [];
  const out: LearnStep[] = [];
  for (const raw of steps) {
    if (typeof raw === "string") {
      out.push({ title: raw });
    } else if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const rec = raw as Record<string, unknown>;
      const title = typeof rec.title === "string" ? rec.title : null;
      if (!title) continue;
      out.push({
        title,
        minutes: typeof rec.minutes === "number" ? rec.minutes : undefined,
        done: typeof rec.done === "boolean" ? rec.done : false,
      });
    }
  }
  return out;
}
