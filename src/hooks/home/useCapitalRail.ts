import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CapitalEventRow = Database["public"]["Tables"]["capital_events"]["Row"];
type EntityRow = Database["public"]["Tables"]["entities"]["Row"];

export interface CapitalRailItem extends CapitalEventRow {
  primary_entity: Pick<EntityRow, "id" | "name" | "slug" | "sector"> | null;
  isNew?: boolean;
}

const MAX_VISIBLE = 4;

async function fetchTopN(limit: number): Promise<CapitalRailItem[]> {
  const { data, error } = await supabase
    .from("capital_events")
    .select(
      "*, primary_entity:entities!capital_events_primary_entity_id_fkey(id,name,slug,sector)",
    )
    .order("announced_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CapitalRailItem[];
}

async function fetchOne(id: string): Promise<CapitalRailItem | null> {
  const { data, error } = await supabase
    .from("capital_events")
    .select(
      "*, primary_entity:entities!capital_events_primary_entity_id_fkey(id,name,slug,sector)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CapitalRailItem | null) ?? null;
}

export function useCapitalRail() {
  const queryClient = useQueryClient();
  const query = useQuery<CapitalRailItem[]>({
    queryKey: ["home", "capital-rail"],
    queryFn: () => fetchTopN(MAX_VISIBLE),
    staleTime: 30 * 1000,
  });

  const [flashIds, setFlashIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel("home-capital-rail")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "capital_events" },
        async (payload) => {
          const newId = (payload.new as { id?: string }).id;
          if (!newId) return;
          const enriched = await fetchOne(newId);
          if (!enriched) return;

          queryClient.setQueryData<CapitalRailItem[]>(
            ["home", "capital-rail"],
            (prev) => {
              const existing = prev ?? [];
              if (existing.some((r) => r.id === enriched.id)) return existing;
              return [enriched, ...existing].slice(0, MAX_VISIBLE);
            },
          );

          setFlashIds((prev) => {
            const next = new Set(prev);
            next.add(enriched.id);
            return next;
          });
          window.setTimeout(() => {
            setFlashIds((prev) => {
              const next = new Set(prev);
              next.delete(enriched.id);
              return next;
            });
          }, 800);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const decorated = (query.data ?? []).map((row) => ({
    ...row,
    isNew: flashIds.has(row.id),
  }));

  return {
    data: decorated,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
