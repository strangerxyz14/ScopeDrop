import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

interface CapitalEventRow {
  id: string;
  round_type: string | null;
  amount_usd: number | null;
  valuation_usd: number | null;
  announced_at: string;
  one_liner: string;
  source_url: string | null;
  primary_entity_id: string;
  entities: { name: string; logo_url: string | null; slug: string } | null;
  capital_event_investors: Array<{
    is_lead: boolean;
    investor_entity_id: string;
    investor: { name: string } | null;
  }> | null;
}

/** Stage → functional color. Parrot = early/new, oxford tints = growth stages. */
const STAGE_STYLES: Record<string, string> = {
  pre_seed: "text-parrot-600 border-parrot-300 bg-parrot-50",
  seed: "text-parrot-700 border-parrot-400 bg-parrot-50",
  series_a: "text-oxford-400 border-oxford-200 bg-oxford-50",
  series_b: "text-oxford-500 border-oxford-300 bg-oxford-50",
  series_c: "text-oxford-600 border-oxford-300 bg-oxford-100",
  series_d_plus: "text-oxford-700 border-oxford-400 bg-oxford-100",
  growth: "text-oxford-700 border-oxford-400 bg-oxford-100",
  debt: "text-slate-600 border-slate-300 bg-slate-50",
};

const FundingRounds = () => {
  const { data: rounds, isLoading, error } = useQuery({
    queryKey: ["capital_events", "funding"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("capital_events")
          .select(`
            id,
            round_type,
            amount_usd,
            valuation_usd,
            announced_at,
            one_liner,
            source_url,
            primary_entity_id,
            entities:primary_entity_id ( name, logo_url, slug ),
            capital_event_investors (
              is_lead,
              investor_entity_id,
              investor:investor_entity_id ( name )
            )
          `)
          .eq("event_type", "funding")
          .order("announced_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data ?? []) as unknown as CapitalEventRow[];
      } catch (e) {
        console.warn("Supabase capital_events query failed (missing table or RLS).", e);
        return [] as CapitalEventRow[];
      }
    },
    staleTime: 60_000,
  });

  const formatDate = (value: unknown) => {
    try {
      if (typeof value !== "string" || !value) return "Recently";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return "Recently";
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "Recently";
    }
  };

  const formatAmount = (value: unknown) => {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
    } catch {
      return `$${Math.round(n).toLocaleString()}`;
    }
  };

  const formatStage = (roundType: string | null) => {
    if (!roundType) return "Round";
    return roundType
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  };

  // Signature element: left-edge amount bar, filled proportionally to the
  // largest round currently in view. Data-honest — the fill IS the number.
  const maxAmount = Math.max(
    1,
    ...(rounds ?? []).map((r) => (typeof r.amount_usd === "number" ? r.amount_usd : 0))
  );

  const isFreshRound = (announcedAt: string) => {
    const d = new Date(announcedAt);
    if (Number.isNaN(d.getTime())) return false;
    return Date.now() - d.getTime() < 1000 * 60 * 60 * 48; // 48h
  };

  return (
    <div className="flex flex-col min-h-screen bg-paper">
      <SEO
        title="Funding - ScopeDrop"
        description="Funding rounds, investor moves, and capital flows shaping the startup ecosystem."
        keywords={["ScopeDrop", "funding rounds", "venture capital", "seed", "series a", "series b"]}
      />

      <Header />

      <main className="flex-grow">
        {/* Hero: no stock photos. Ink surface, mono eyebrow, display headline. */}
        <div className="bg-ink text-paper py-14 border-b-4 border-parrot">
          <div className="container mx-auto px-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-parrot mb-3">
              Capital events · live feed
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold mb-3">Funding</h1>
            <p className="text-oxford-100 max-w-2xl">
              Funding rounds, investor moves, and capital flows shaping the startup ecosystem.
            </p>
            {error && (
              <p className="mt-4 font-mono text-sm text-red-300">
                Feed error: {(error as any)?.message ?? "failed to load"}
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-44 w-full rounded-lg" />
                ))}
            </div>
          ) : (rounds ?? []).length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-oxford-50">
              <p className="font-display text-lg text-oxford">No funding rounds published yet.</p>
              <p className="font-mono text-sm text-muted-foreground mt-2">
                capital_events · event_type = 'funding'
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(rounds ?? []).map((row) => {
                const company = row.entities?.name ?? "Unknown Company";
                const stage = formatStage(row.round_type);
                const stageStyle =
                  STAGE_STYLES[row.round_type ?? ""] ??
                  "text-oxford-500 border-oxford-200 bg-oxford-50";
                const amount = formatAmount(row.amount_usd);
                const fillPct =
                  typeof row.amount_usd === "number" && row.amount_usd > 0
                    ? Math.max(8, Math.round((row.amount_usd / maxAmount) * 100))
                    : 0;
                const fresh = isFreshRound(row.announced_at);
                const investors = (row.capital_event_investors ?? [])
                  .map((i) => (i.is_lead && i.investor?.name ? `${i.investor.name} (lead)` : i.investor?.name))
                  .filter(Boolean);

                return (
                  <article
                    key={row.id}
                    className="relative flex bg-white rounded-lg border border-oxford-50 overflow-hidden transition-shadow hover:shadow-md"
                  >
                    {/* ── Signature: left-edge amount bar ── */}
                    <div className="w-1.5 shrink-0 bg-oxford-50 relative" aria-hidden="true">
                      {fillPct > 0 && (
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-amber"
                          style={{ height: `${fillPct}%` }}
                          title={`Relative deal size: ${fillPct}% of largest round shown`}
                        />
                      )}
                    </div>

                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {row.entities?.logo_url && (
                            <img
                              src={row.entities.logo_url}
                              alt=""
                              className="w-9 h-9 rounded-md object-contain bg-oxford-50 shrink-0"
                              loading="lazy"
                            />
                          )}
                          <h2 className="font-display text-lg font-semibold text-ink truncate">
                            {company}
                          </h2>
                          {fresh && (
                            <span className="flex items-center gap-1 shrink-0 font-mono text-[10px] uppercase tracking-wider text-parrot-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-parrot animate-pulse-subtle" />
                              New
                            </span>
                          )}
                        </div>
                        <span
                          className={`shrink-0 font-mono text-[11px] uppercase tracking-wide px-2 py-0.5 rounded border ${stageStyle}`}
                        >
                          {stage}
                        </span>
                      </div>

                      <div className="mt-2 flex items-baseline gap-3 font-mono text-sm">
                        {amount && (
                          <span className="text-amber-deep text-xl font-semibold tabular-nums">
                            {amount}
                          </span>
                        )}
                        <span className="text-muted-foreground">{formatDate(row.announced_at)}</span>
                      </div>

                      {investors.length > 0 && (
                        <p className="mt-2 text-sm text-oxford-500">
                          {investors.join(" · ")}
                        </p>
                      )}

                      {row.one_liner && (
                        <p className="mt-2 text-sm text-gray-700 line-clamp-2">{row.one_liner}</p>
                      )}

                      {typeof row.source_url === "string" && /^https?:\/\//i.test(row.source_url) && (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center font-mono text-xs text-oxford-400 hover:text-oxford-600 hover:underline"
                        >
                          Source
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FundingRounds;
