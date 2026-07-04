
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <SEO
        title="Funding - ScopeDrop"
        description="Funding rounds, investor moves, and capital flows shaping the startup ecosystem."
        keywords={["ScopeDrop", "funding rounds", "venture capital", "seed", "series a", "series b"]}
      />

      <Header />

      <main className="flex-grow">
        <div
          className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(0, 33, 71, 0.92), rgba(0, 33, 71, 0.82)), url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Funding</h1>
            <p className="text-blue-100 max-w-2xl">
              Funding rounds, investor moves, and capital flows shaping the startup ecosystem.
            </p>
            {error && (
              <p className="mt-4 text-sm text-red-100">
                Feed error: {(error as any)?.message ?? "failed to load"}
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array(8)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full rounded-lg" />
                ))}
            </div>
          ) : (rounds ?? []).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No funding rounds published yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Agents should publish into <code className="px-1">capital_events</code> (event_type = 'funding') in Supabase.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(rounds ?? []).map((row) => {
                const company = row.entities?.name ?? "Unknown Company";
                const stage = formatStage(row.round_type);
                const amount = formatAmount(row.amount_usd);
                const investors = (row.capital_event_investors ?? [])
                  .map((i) => i.investor?.name)
                  .filter(Boolean);

                return (
                  <Card key={row.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-lg">{company}</CardTitle>
                        <Badge variant="secondary" className="shrink-0">
                          {stage}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <span>{formatDate(row.announced_at)}</span>
                        {amount && (
                          <>
                            <span className="text-muted-foreground">·</span>
                            <span className="font-medium text-oxford">{amount}</span>
                          </>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {investors.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Investors:</span> {investors.join(", ")}
                        </p>
                      )}

                      {row.one_liner && (
                        <p className="text-sm text-gray-700 line-clamp-3">{row.one_liner}</p>
                      )}

                      {typeof row.source_url === "string" && /^https?:\/\//i.test(row.source_url) && (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-oxford hover:underline"
                        >
                          Source
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
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
