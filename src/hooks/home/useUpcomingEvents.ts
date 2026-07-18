import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ScheduledEventRow = Database["public"]["Tables"]["scheduled_events"]["Row"];

/**
 * Geo values that map to the design's tabs. "Global" = no filter.
 * City rows may live in either `city` or `region` (Delhi NCR spans several cities), so we OR the two.
 */
export interface GeoTab {
  key: string;
  label: string;
  matchCities?: string[];
  matchRegions?: string[];
}

export const GEO_TABS: GeoTab[] = [
  { key: "delhi-ncr", label: "Delhi NCR", matchRegions: ["Delhi NCR"], matchCities: ["Delhi", "New Delhi", "Gurugram", "Gurgaon", "Noida", "Faridabad", "Ghaziabad"] },
  { key: "bengaluru", label: "Bengaluru", matchCities: ["Bengaluru", "Bangalore"] },
  { key: "mumbai", label: "Mumbai", matchCities: ["Mumbai"] },
  { key: "hyderabad", label: "Hyderabad", matchCities: ["Hyderabad"] },
  { key: "global", label: "Global" },
];

export function useUpcomingEvents(geoKey: string, limit = 6) {
  return useQuery<ScheduledEventRow[]>({
    queryKey: ["home", "upcoming-events", geoKey, limit],
    queryFn: async () => {
      const tab = GEO_TABS.find((t) => t.key === geoKey) ?? GEO_TABS[GEO_TABS.length - 1];
      const nowIso = new Date().toISOString();

      let query = supabase
        .from("scheduled_events")
        .select("*")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(limit);

      if (tab.key !== "global") {
        const orParts: string[] = [];
        for (const c of tab.matchCities ?? []) orParts.push(`city.ilike.${c}`);
        for (const r of tab.matchRegions ?? []) orParts.push(`region.ilike.${r}`);
        if (orParts.length > 0) query = query.or(orParts.join(","));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
