import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadarSector {
  name: string;
  velocityPct: number;
}

/**
 * Computes emerging-tech radar: for each sector with tracked rounds, momentum =
 * ((sum of amount_usd in the last 90 days) / (sum of amount_usd in the prior 90 days) - 1) * 100.
 * When there is no prior-window baseline, the sector uses a floor of its current-window amount as a proxy.
 * Empty return means no capital events tracked yet.
 */
export function useRadar(limit = 5) {
  return useQuery<RadarSector[]>({
    queryKey: ["home", "radar", limit],
    queryFn: async () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - 180);
      const iso = start.toISOString().slice(0, 10);
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 90);
      const cutoffMs = cutoff.getTime();

      const { data, error } = await supabase
        .from("capital_events")
        .select(
          "amount_usd, announced_at, primary_entity:entities!capital_events_primary_entity_id_fkey(sector)",
        )
        .gte("announced_at", iso)
        .not("amount_usd", "is", null);
      if (error) throw error;

      type Row = {
        amount_usd: number | null;
        announced_at: string;
        primary_entity: { sector: string | null } | null;
      };
      const rows = (data ?? []) as Row[];

      const bySector = new Map<string, { current: number; prior: number }>();
      for (const r of rows) {
        const sector = r.primary_entity?.sector?.trim();
        if (!sector) continue;
        const amt = r.amount_usd ?? 0;
        if (!amt) continue;
        const when = new Date(r.announced_at).getTime();
        const bucket = bySector.get(sector) ?? { current: 0, prior: 0 };
        if (when >= cutoffMs) bucket.current += amt;
        else bucket.prior += amt;
        bySector.set(sector, bucket);
      }

      const scored: RadarSector[] = [];
      for (const [name, { current, prior }] of bySector) {
        if (current <= 0) continue;
        const base = prior > 0 ? prior : current;
        const velocityPct = Math.round(((current - (prior > 0 ? prior : 0)) / base) * 100);
        scored.push({ name, velocityPct: Math.max(velocityPct, 0) });
      }

      scored.sort((a, b) => b.velocityPct - a.velocityPct);
      return scored.slice(0, limit);
    },
    staleTime: 10 * 60 * 1000,
  });
}
