import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type CompanyEntity = Database["public"]["Tables"]["entities"]["Row"];

/**
 * No heat metric yet — orders by most recently added company entities.
 * Section can be labelled "Recent additions" when this hook is used.
 */
export function useTrendingCompanies(limit = 4) {
  return useQuery<CompanyEntity[]>({
    queryKey: ["home", "trending-companies", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("entity_type", "company")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
