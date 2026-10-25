import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { PageHead, PageShell } from "@/components/home/PageShell";
import { supabase } from "@/integrations/supabase/client";

const MarketMaps = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["collections", "market_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, title, description, slug, entity_ids, generated_at")
        .eq("collection_type", "market_map")
        .order("generated_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PageShell>
      <SEO
        title="Collections — ScopeDrop"
        description="Market maps and sector landscapes built from the companies ScopeDrop tracks."
        keywords={["market maps", "industry landscape", "sector intelligence", "ScopeDrop"]}
      />
      <PageHead
        kicker="COLLECTIONS"
        title="Market maps"
        dek="Sector landscapes built from the companies and rounds the desk tracks."
      />
      <section className="flow-sec">
        <div className="wrap">
          {isLoading ? (
            <div className="st-grid" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="sd-skel" style={{ height: 160 }} />
              ))}
            </div>
          ) : error ? (
            <div className="sd-empty">
              <span className="k">Couldn't load collections</span>
              <p>Refresh the page to try again.</p>
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="sd-empty">
              <span className="k">No collections published yet</span>
              <p>
                Market maps appear here as the directory fills in. Meanwhile, browse the{" "}
                <Link to="/directory" style={{ color: "var(--parrot)" }}>
                  company directory
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="st-grid">
              {data!.map((m) => (
                <Link key={m.id} className="mm-card" to={`/market-maps/${m.slug}`}>
                  <span className="kick">
                    MARKET MAP · {Array.isArray(m.entity_ids) ? m.entity_ids.length : 0} COMPANIES
                  </span>
                  <h4>{m.title}</h4>
                  {m.description && <p>{m.description}</p>}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default MarketMaps;
