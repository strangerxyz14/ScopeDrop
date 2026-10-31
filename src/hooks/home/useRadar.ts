import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RadarSector {
  name: string;
  /** Change vs the previous 90 days, or null when that window had no deals. */
  velocityPct: number | null;
  /** Bar width, 0–100. */
  barPct: number;
  /** "+42%", "−18%", or "NEW" for sectors with no earlier deals. */
  label: string;
}

/**
 * Spelling variants of one sector, as extraction writes them ("Security",
 * "offensive security", "cybersecurity"), mapped to one display name.
 * Keys are lowercased with hyphens and underscores turned into spaces.
 */
const SECTOR_ALIASES: Record<string, string> = {
  security: "Cybersecurity",
  cybersecurity: "Cybersecurity",
  "cyber security": "Cybersecurity",
  "offensive security": "Cybersecurity",
  edtech: "Edtech",
  "ed tech": "Edtech",
  "education technology": "Edtech",
  healthtech: "Healthtech",
  "health tech": "Healthtech",
  "healthcare tech": "Healthtech",
  "healthcare technology": "Healthtech",
  "digital health": "Healthtech",
  fintech: "Fintech",
  "financial technology": "Fintech",
  cloud: "Cloud",
  "cloud computing": "Cloud",
  robotics: "Robotics",
  "warehouse robotics": "Robotics",
  "data center robotics": "Robotics",
  spacetech: "Spacetech",
  "space tech": "Spacetech",
  space: "Spacetech",
  ai: "AI",
  "artificial intelligence": "AI",
};

const ACRONYMS = new Set(["ai", "gpu", "ev", "evs", "saas", "iot", "ar", "vr", "b2b", "b2c", "d2c", "ml", "api", "hr", "it"]);

function sectorKey(raw: string): { key: string; label: string } {
  const norm = raw.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
  const alias = SECTOR_ALIASES[norm];
  if (alias) return { key: alias.toLowerCase(), label: alias };
  const label = norm.split(" ").map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w)).join(" ");
  return { key: norm, label: label.charAt(0).toUpperCase() + label.slice(1) };
}

/**
 * Computes emerging-tech radar from tracked rounds: sectors ranked by money
 * raised in the last 90 days (where the capital is moving), each labelled with
 * its change against the 90 days before.
 * - A sector with no deals in the earlier window has no honest percentage;
 *   it's labelled NEW instead of a made-up +100%.
 * - The bar is this quarter's amount relative to the top sector.
 * Only closed and agreed deals count: "seeks $20B" or "in talks" stories
 * (deal_status 'reported') aren't money that moved.
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
        .not("amount_usd", "is", null)
        .in("deal_status", ["closed", "agreed"]);
      if (error) throw error;

      type Row = {
        amount_usd: number | null;
        announced_at: string;
        primary_entity: { sector: string | null } | null;
      };
      const rows = (data ?? []) as Row[];

      const bySector = new Map<string, { label: string; current: number; prior: number }>();
      for (const r of rows) {
        const raw = r.primary_entity?.sector?.trim();
        if (!raw) continue;
        const amt = r.amount_usd ?? 0;
        if (!amt) continue;
        const { key, label } = sectorKey(raw);
        const when = new Date(r.announced_at).getTime();
        const bucket = bySector.get(key) ?? { label, current: 0, prior: 0 };
        if (when >= cutoffMs) bucket.current += amt;
        else bucket.prior += amt;
        bySector.set(key, bucket);
      }

      const ranked = [...bySector.values()].filter((s) => s.current > 0).sort((a, b) => b.current - a.current);
      const maxCurrent = ranked[0]?.current ?? 0;
      const sectors: RadarSector[] = ranked.map(({ label, current, prior }) => {
        const pct = prior > 0 ? Math.round(((current - prior) / prior) * 100) : null;
        return {
          name: label,
          velocityPct: pct,
          barPct: maxCurrent > 0 ? Math.max(2, Math.round((current / maxCurrent) * 100)) : 0,
          label: pct === null ? "NEW" : pct >= 0 ? `+${pct}%` : `−${Math.abs(pct)}%`,
        };
      });
      return sectors.slice(0, limit);
    },
    staleTime: 10 * 60 * 1000,
  });
}
