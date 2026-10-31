// ============================================================
// StartupNews — /startups/news, the "All stories" listing, in the
// home v-g design system. Category filter lives in ?c= so article
// breadcrumbs can deep-link into it. First page opens with the home
// flow layout (lead + 4 side cards); everything after is a grid.
// ============================================================
import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { StoryCard, StoryFlow } from "@/components/home/StoryCards";
import { useRevealAll } from "@/hooks/home/useRevealAll";
import { formatRelativeTime } from "@/components/home/utils";
import { useStories } from "@/hooks/home/useStories";
import "@/components/home/theme.css";
import { SECTIONS, SECTION_KEYS } from "../../supabase/functions/_shared/sections";

const CATEGORIES: { key: string | null; label: string }[] = [
  { key: null, label: "All" },
  ...SECTION_KEYS.map((key) => ({ key, label: SECTIONS[key].label })),
];

const StartupNews = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get("c");
  const active = CATEGORIES.find((c) => c.key === category) ?? CATEGORIES[0];

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useStories(category);
  const rows = data?.pages.flat() ?? [];
  const lead = rows.slice(0, 5);
  const rest = rows.slice(5);

  const flowRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useRevealAll(flowRef, [category, lead.length]);
  useRevealAll(gridRef, [category, rest.length]);

  const setCategory = (key: string | null) => {
    const next = new URLSearchParams(params);
    if (key) next.set("c", key);
    else next.delete("c");
    setParams(next, { replace: true });
  };

  const latest = rows[0] ? formatRelativeTime(rows[0].published_at ?? rows[0].created_at) : null;

  return (
    <div className="sdvg">
      <SEO
        title={category ? `${active.label} stories — ScopeDrop` : "All stories — ScopeDrop"}
        description="The latest startup, funding, AI and market stories, decoded daily by ScopeDrop."
        keywords={["startup news", "funding", "AI", "venture capital"]}
      />
      <SiteHeader />
      <main>
        <header className="st-head">
          <div className="wrap">
            <span className="kick">
              ALL STORIES{latest ? ` · LAST UPDATED ${latest}` : ""}
            </span>
            <h1>What's building, as it happens</h1>
            <p>
              Funding rounds, launches, acquisitions and the moves shaping startups, tech and AI —
              decoded by the ScopeDrop desk.
            </p>
            <div className="st-filters" role="tablist" aria-label="Filter by category">
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  role="tab"
                  aria-selected={c.key === active.key}
                  className={c.key === active.key ? "on" : undefined}
                  onClick={() => setCategory(c.key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="flow-sec">
          <div className="wrap">
            {isLoading ? (
              <div className="st-grid" aria-busy="true">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="sd-skel" style={{ height: 280 }} />
                ))}
              </div>
            ) : error ? (
              <div className="sd-empty">
                <span className="k">Couldn't load stories</span>
                <p>Refresh the page to try again.</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="sd-empty">
                <span className="k">No {active.key ? active.label : ""} stories yet</span>
                <p>New stories land here through the day. Check back shortly.</p>
              </div>
            ) : (
              <>
                <div className="flow" ref={flowRef}>
                  <StoryFlow rows={lead} />
                </div>

                {rest.length > 0 && (
                  <>
                    <div className="sec-h st-more-h">
                      <h3>More stories</h3>
                    </div>
                    <div className="st-grid" ref={gridRef}>
                      {rest.map((a) => (
                        <StoryCard key={a.id} article={a} />
                      ))}
                    </div>
                  </>
                )}

                {hasNextPage && (
                  <div className="st-load">
                    <button
                      type="button"
                      onClick={() => fetchNextPage()}
                      disabled={isFetchingNextPage}
                    >
                      {isFetchingNextPage ? "Loading…" : "Load more stories"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default StartupNews;
