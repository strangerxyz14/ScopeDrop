import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import MarketMapsSection from "@/components/MarketMapsSection";
import { supabase } from "@/integrations/supabase/client";
import type { MarketMap } from "@/types/news";

const MarketMaps = () => {
  const { data: marketMaps, isLoading } = useQuery({
    queryKey: ["collections", "market_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, title, description, slug, entity_ids, generated_at")
        .eq("collection_type", "market_map")
        .order("generated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []).map(
        (row): MarketMap => ({
          id: row.slug,
          title: row.title,
          sector: "Market Map",
          companyCount: Array.isArray(row.entity_ids) ? row.entity_ids.length : 0,
          description: row.description ?? undefined,
        })
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <SEO
        title="Market Maps - ScopeDrop"
        description="Industry landscape overviews and sector maps."
        keywords={["market maps", "industry landscape", "sector intelligence", "ScopeDrop"]}
      />
      <Header />
      <main className="flex-grow pt-16">
        <MarketMapsSection marketMaps={marketMaps ?? []} isLoading={isLoading} />
      </main>
      <Footer />
    </div>
  );
};

export default MarketMaps;
