import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type ScheduledEventRow = Database["public"]["Tables"]["scheduled_events"]["Row"];

/**
 * Geo values that map to the design's tabs. "Global" = no filter.
 * City rows may live in either `city` or `region` (Delhi NCR spans several cities), so we OR the two.
 * `warmCity` / `warmRegion` are what the fetch-events edge function is asked to pull for this tab.
 */
export interface GeoTab {
  key: string;
  label: string;
  matchCities?: string[];
  matchRegions?: string[];
  warmCity?: string;
  warmRegion?: string;
}

export const GEO_TABS: GeoTab[] = [
  {
    key: "delhi-ncr",
    label: "Delhi NCR",
    matchRegions: ["Delhi NCR"],
    matchCities: ["Delhi", "New Delhi", "Gurugram", "Gurgaon", "Noida", "Faridabad", "Ghaziabad"],
    warmCity: "Delhi",
    warmRegion: "Delhi NCR",
  },
  { key: "bengaluru", label: "Bengaluru", matchCities: ["Bengaluru", "Bangalore"], warmCity: "Bengaluru" },
  { key: "mumbai", label: "Mumbai", matchCities: ["Mumbai"], warmCity: "Mumbai" },
  { key: "hyderabad", label: "Hyderabad", matchCities: ["Hyderabad"], warmCity: "Hyderabad" },
  { key: "global", label: "Global" },
];

/**
 * Session-level record of which geos we've already asked the edge function to refresh.
 * Prevents hitting Eventbrite/PredictHQ every time a user toggles tabs. Cleared on page reload.
 */
const warmedGeos = new Set<string>();

async function warmGeo(geoKey: string): Promise<boolean> {
  if (warmedGeos.has(geoKey)) return false;
  const tab = GEO_TABS.find((t) => t.key === geoKey);
  if (!tab || !tab.warmCity) return false;

  warmedGeos.add(geoKey); // mark early so parallel triggers don't double-fire

  try {
    const { error } = await supabase.functions.invoke("fetch-events", {
      body: { city: tab.warmCity, region: tab.warmRegion ?? null },
    });
    if (error) {
      console.warn(`fetch-events warm failed for ${geoKey}:`, error.message);
      warmedGeos.delete(geoKey); // allow retry on next tab click
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`fetch-events warm threw for ${geoKey}:`, err);
    warmedGeos.delete(geoKey);
    return false;
  }
}

export function useUpcomingEvents(geoKey: string, limit = 6) {
  const queryClient = useQueryClient();
  const queryKey = ["home", "upcoming-events", geoKey, limit];

  const query = useQuery<ScheduledEventRow[]>({
    queryKey,
    queryFn: async () => {
      const tab = GEO_TABS.find((t) => t.key === geoKey) ?? GEO_TABS[GEO_TABS.length - 1];
      const nowIso = new Date().toISOString();

      let q = supabase
        .from("scheduled_events")
        .select("*")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(limit);

      if (tab.key !== "global") {
        const orParts: string[] = [];
        for (const c of tab.matchCities ?? []) orParts.push(`city.ilike.${c}`);
        for (const r of tab.matchRegions ?? []) orParts.push(`region.ilike.${r}`);
        if (orParts.length > 0) q = q.or(orParts.join(","));
      }

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    let cancelled = false;
    void warmGeo(geoKey).then((warmed) => {
      if (warmed && !cancelled) {
        // New rows may have landed in scheduled_events — refetch this tab.
        void queryClient.invalidateQueries({ queryKey });
      }
    });
    return () => {
      cancelled = true;
    };
    // queryKey identity changes on geoKey/limit change, but we intentionally track only geoKey here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoKey]);

  return query;
}
