// ============================================================
// Directory — /directory, the company lookup behind "Companies".
// Lists company entities (most funded first) with a client-side
// filter; ?entity=<id> opens one company with its tracked rounds
// and the stories that name it.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { PageHead, PageShell, StoryGrid } from "@/components/home/PageShell";
import type { StoryArticle } from "@/components/home/StoryCards";
import type { CompanyEntity } from "@/hooks/home/useTrendingCompanies";
import { formatMoneyShort, formatRoundType } from "@/components/home/utils";
import { supabase } from "@/integrations/supabase/client";

const PAGE = 60;

function useCompanies() {
  return useQuery<CompanyEntity[]>({
    queryKey: ["directory", "companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entities")
        .select("*")
        .eq("entity_type", "company")
        .order("total_funding_raised", { ascending: false, nullsFirst: false })
        .order("name", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function metaLine(c: CompanyEntity): string {
  return [c.sector, c.headquarters, c.founded_year ? `FOUNDED ${c.founded_year}` : null]
    .filter(Boolean)
    .join(" · ")
    .toUpperCase();
}

function CompanyDetail({ id }: { id: string }) {
  const company = useQuery({
    queryKey: ["directory", "entity", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("entities").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const c = company.data;

  const rounds = useQuery({
    queryKey: ["directory", "rounds", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_events")
        .select("id, event_type, round_type, amount_usd, announced_at, one_liner, source_url")
        .eq("primary_entity_id", id)
        .order("announced_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const stories = useQuery({
    queryKey: ["directory", "stories", c?.name],
    enabled: Boolean(c?.name),
    queryFn: async () => {
      // Escape the ilike wildcards so names like "100%" match literally.
      const name = c!.name.replace(/[%_\\]/g, (m) => `\\${m}`);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("status", "published")
        .ilike("headline", `%${name}%`)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as StoryArticle[];
    },
  });

  if (company.isLoading) return <div className="sd-skel" style={{ height: 180 }} />;
  if (!c) {
    return (
      <div className="sd-empty">
        <span className="k">Company not found</span>
        <p>It may have been merged into another entry. Search the directory below.</p>
      </div>
    );
  }

  const raised = formatMoneyShort(c.total_funding_raised);
  return (
    <article className="dir-detail">
      <div className="dir-detail-h">
        <div>
          <span className="kick">{metaLine(c) || "COMPANY"}</span>
          <h2>{c.name}</h2>
          {c.description && <p>{c.description}</p>}
          {c.website && (
            <a className="dir-web" href={c.website} target="_blank" rel="noopener noreferrer">
              {c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
        </div>
        {raised && (
          <div className="dir-raised">
            <span>TOTAL RAISED</span>
            <b>{raised}</b>
            {c.last_funding_stage && <span>{formatRoundType(c.last_funding_stage)}</span>}
          </div>
        )}
      </div>

      {(rounds.data?.length ?? 0) > 0 && (
        <div className="co-list dir-rounds">
          {rounds.data!.map((r) => (
            <div key={r.id} className="co-row">
              <div>
                <div className="nm">{r.one_liner}</div>
                <div className="sec">
                  {[formatRoundType(r.round_type ?? r.event_type), r.announced_at.slice(0, 10)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
              {formatMoneyShort(r.amount_usd) && <div className="v">{formatMoneyShort(r.amount_usd)}</div>}
            </div>
          ))}
        </div>
      )}

      {(stories.data?.length ?? 0) > 0 && (
        <>
          <div className="sec-h st-more-h">
            <h3>Stories naming {c.name}</h3>
          </div>
          <StoryGrid rows={stories.data} isLoading={false} emptyLabel="" />
        </>
      )}
    </article>
  );
}

const Directory = () => {
  const [params, setParams] = useSearchParams();
  const entityId = params.get("entity");
  const [term, setTerm] = useState(params.get("q") ?? "");
  const [shown, setShown] = useState(PAGE);
  const { data = [], isLoading, error } = useCompanies();

  // Opening a company from the list shows its panel at the top.
  useEffect(() => {
    if (entityId) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [entityId]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return data;
    return data.filter((c) =>
      [c.name, c.sector, c.headquarters, ...(c.tags ?? [])].some((v) => v?.toLowerCase().includes(t)),
    );
  }, [data, term]);

  const onTerm = (value: string) => {
    setTerm(value);
    setShown(PAGE);
    const next = new URLSearchParams(params);
    if (value.trim()) next.set("q", value);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <PageShell>
      <SEO
        title="Company directory — ScopeDrop"
        description="Look up the startups and companies ScopeDrop tracks: sector, headquarters, funding raised and recent rounds."
        keywords={["startup directory", "companies", "funding", "ScopeDrop"]}
      />
      <PageHead
        kicker={`COMPANIES${data.length ? ` · ${data.length} TRACKED` : ""}`}
        title="Company directory"
        dek="Every company the ScopeDrop desk tracks, built from the funding rounds and stories we cover."
      />
      <section className="flow-sec">
        <div className="wrap">
          {entityId && (
            <div className="dir-detail-wrap">
              <CompanyDetail id={entityId} />
              <Link className="dir-back" to="/directory">
                ← All companies
              </Link>
            </div>
          )}

          <label className="co-search dir-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={term}
              onChange={(e) => onTerm(e.target.value)}
              placeholder="Filter by name, sector or city…"
              aria-label="Filter companies"
            />
          </label>

          {isLoading ? (
            <div className="co-list" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="sd-skel" style={{ height: 52, marginTop: 8 }} />
              ))}
            </div>
          ) : error ? (
            <div className="sd-empty">
              <span className="k">Couldn't load the directory</span>
              <p>Refresh the page to try again.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="sd-empty">
              <span className="k">No companies match "{term}"</span>
              <p>Try a shorter name, or search stories instead.</p>
            </div>
          ) : (
            <>
              <div className="co-list dir-list">
                {filtered.slice(0, shown).map((c) => (
                  <Link key={c.id} className="co-row" to={`/directory?entity=${c.id}`}>
                    <div>
                      <div className="nm">{c.name}</div>
                      {metaLine(c) && <div className="sec">{metaLine(c)}</div>}
                    </div>
                    {formatMoneyShort(c.total_funding_raised) && (
                      <div className="v">{formatMoneyShort(c.total_funding_raised)}</div>
                    )}
                  </Link>
                ))}
              </div>
              {filtered.length > shown && (
                <div className="st-load">
                  <button type="button" onClick={() => setShown((n) => n + PAGE)}>
                    Show more companies
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Directory;
