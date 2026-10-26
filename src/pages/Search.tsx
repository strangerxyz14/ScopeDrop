// ============================================================
// Search — /search?q=, stories (headline + summary) and companies
// (name), matched server-side. The query lives in ?q= so results
// can be linked and the back button restores them.
// ============================================================
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { PageHead, PageShell, StoryGrid } from "@/components/home/PageShell";
import type { StoryArticle } from "@/components/home/StoryCards";
import type { CompanyEntity } from "@/hooks/home/useTrendingCompanies";
import { formatMoneyShort } from "@/components/home/utils";
import { supabase } from "@/integrations/supabase/client";

/** Strip characters that carry meaning in PostgREST filters and ilike patterns. */
function cleanTerm(raw: string): string {
  return raw.replace(/[,()"\\%_*:]/g, " ").replace(/\s+/g, " ").trim();
}

const Search = () => {
  const [params, setParams] = useSearchParams();
  const q = cleanTerm(params.get("q") ?? "");
  const [input, setInput] = useState(params.get("q") ?? "");

  // Debounce typing into ?q= so each keystroke doesn't hit the database.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      if (input.trim()) next.set("q", input.trim());
      else next.delete("q");
      if (next.toString() !== params.toString()) setParams(next, { replace: true });
    }, 300);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const enabled = q.length >= 2;

  const stories = useQuery<StoryArticle[]>({
    queryKey: ["search", "stories", q],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .or(`headline.ilike.%${q}%,summary.ilike.%${q}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const companies = useQuery<CompanyEntity[]>({
    queryKey: ["search", "companies", q],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("entity_type", "company")
        .ilike("name", `%${q}%`)
        .order("total_funding_raised", { ascending: false, nullsFirst: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60 * 1000,
  });

  return (
    <PageShell>
      <SEO
        title={q ? `Search: ${q} — ScopeDrop` : "Search — ScopeDrop"}
        description="Search ScopeDrop stories and companies."
        keywords={["search", "startup news", "ScopeDrop"]}
      />
      <PageHead kicker="SEARCH" title="Search stories and companies">
        <form className="co-search dir-search sr-box" role="search" onSubmit={(e) => e.preventDefault()}>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Company, investor, technology…"
            aria-label="Search"
            autoFocus
          />
        </form>
      </PageHead>

      <section className="flow-sec">
        <div className="wrap">
          {!enabled ? (
            <div className="sd-empty">
              <span className="k">Type at least two characters</span>
              <p>
                Or browse <Link to="/startups/news" style={{ color: "var(--parrot)" }}>all stories</Link>{" "}
                and the <Link to="/directory" style={{ color: "var(--parrot)" }}>company directory</Link>.
              </p>
            </div>
          ) : (
            <>
              {(companies.data?.length ?? 0) > 0 && (
                <div className="sr-companies">
                  <div className="sec-h">
                    <h3>Companies</h3>
                    <Link className="more" to={`/directory?q=${encodeURIComponent(q)}`}>
                      In the directory →
                    </Link>
                  </div>
                  <div className="co-list">
                    {companies.data!.map((c) => (
                      <Link key={c.id} className="co-row" to={`/directory?entity=${c.id}`}>
                        <div>
                          <div className="nm">{c.name}</div>
                          {(c.sector || c.headquarters) && (
                            <div className="sec">
                              {[c.sector, c.headquarters].filter(Boolean).join(" · ").toUpperCase()}
                            </div>
                          )}
                        </div>
                        {formatMoneyShort(c.total_funding_raised) && (
                          <div className="v">{formatMoneyShort(c.total_funding_raised)}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              <div className="sec-h">
                <h3>Stories</h3>
              </div>
              <StoryGrid
                rows={stories.data}
                isLoading={stories.isLoading}
                error={stories.error}
                emptyLabel={`No stories match "${q}"`}
              />
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Search;
