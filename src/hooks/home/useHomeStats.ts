import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeStats {
  roundsThisQuarter: number;
  companiesTracked: number;
}

export function useHomeStats() {
  return useQuery<HomeStats>({
    queryKey: ["home", "stats"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceIso = since.toISOString().slice(0, 10);

      const [rounds, companies] = await Promise.all([
        supabase
          .from("capital_events")
          .select("id", { count: "exact", head: true })
          .gte("announced_at", sinceIso),
        supabase
          .from("entities")
          .select("id", { count: "exact", head: true })
          .eq("entity_type", "company"),
      ]);

      if (rounds.error) throw rounds.error;
      if (companies.error) throw companies.error;

      return {
        roundsThisQuarter: rounds.count ?? 0,
        companiesTracked: companies.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
