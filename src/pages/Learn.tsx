// ============================================================
// Learn — /learn, the full version of the home Learn band: every
// active learning track with its steps, and the term glossary.
// ============================================================
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { PageHead, PageShell } from "@/components/home/PageShell";
import { parseSteps, type GlossaryTerm, type LearningTrack } from "@/hooks/home/useLearnBand";
import { supabase } from "@/integrations/supabase/client";

function useLearnPage() {
  const tracks = useQuery<LearningTrack[]>({
    queryKey: ["learn", "tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_tracks")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  const terms = useQuery<GlossaryTerm[]>({
    queryKey: ["learn", "terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("glossary_terms")
        .select("*")
        .order("term", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
  });
  return { tracks, terms };
}

const Learn = () => {
  const { tracks, terms } = useLearnPage();
  const [filter, setFilter] = useState("");
  const { hash } = useLocation();

  // "/learn#glossary" (footer, home Learn band): scroll once the sections have rendered.
  useEffect(() => {
    if (!hash || tracks.isLoading || terms.isLoading) return;
    document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, tracks.isLoading, terms.isLoading]);

  const shownTerms = useMemo(() => {
    const t = filter.trim().toLowerCase();
    const all = terms.data ?? [];
    return t ? all.filter((g) => `${g.term} ${g.short_definition}`.toLowerCase().includes(t)) : all;
  }, [terms.data, filter]);

  return (
    <PageShell>
      <SEO
        title="Learn — ScopeDrop"
        description="Startup and venture concepts, one step at a time: learning tracks and a plain-English term glossary."
        keywords={["startup glossary", "venture capital terms", "learn fundraising", "ScopeDrop"]}
      />
      <PageHead
        kicker="LEARN"
        title="Understand every term. Step by step."
        dek="From the first pitch to the first term sheet. One concept at a time, three minutes each. No jargon walls."
      />

      <section className="flow-sec">
        <div className="wrap">
          <div className="sec-h">
            <h3>Tracks</h3>
          </div>
          {tracks.isLoading ? (
            <div className="lr-tracks" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="sd-skel" style={{ height: 260 }} />
              ))}
            </div>
          ) : (tracks.data?.length ?? 0) === 0 ? (
            <div className="sd-empty">
              <span className="k">Tracks are being written</span>
              <p>The first learning track will appear here.</p>
            </div>
          ) : (
            <div className="lr-tracks">
              {tracks.data!.map((t, i) => {
                const steps = parseSteps(t.steps);
                return (
                  <article key={t.id} className="lr-track">
                    <span className="kick">
                      TRACK {String(i + 1).padStart(2, "0")} ·{" "}
                      {steps.length > 0 ? `${steps.length} STEPS` : "IN PROGRESS"}
                    </span>
                    <h2>{t.title}</h2>
                    {t.description && <p>{t.description}</p>}
                    {steps.length > 0 && (
                      <div className="trk-list">
                        {steps.map((s, j) => (
                          <div key={`${s.title}-${j}`} className={`step${s.done ? " done" : ""}`}>
                            <span className="num">{s.done ? "✓" : String(j + 1).padStart(2, "0")}</span>
                            <span className="t">{s.title}</span>
                            {s.minutes ? <span className="len">{s.minutes} MIN</span> : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="flow-sec" id="glossary">
        <div className="wrap">
          <div className="sec-h">
            <h3>Glossary{terms.data?.length ? ` · ${terms.data.length} terms` : ""}</h3>
          </div>
          {(terms.data?.length ?? 0) > 6 && (
            <label className="co-search dir-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find a term…"
                aria-label="Filter glossary"
              />
            </label>
          )}
          {terms.isLoading ? (
            <div className="sd-skel" style={{ height: 200 }} />
          ) : shownTerms.length === 0 ? (
            <div className="sd-empty">
              <span className="k">{filter ? `No terms match "${filter}"` : "Terms are being written"}</span>
              <p>{filter ? "Try a shorter word." : "The first terms will appear here."}</p>
            </div>
          ) : (
            <dl className="lr-terms">
              {shownTerms.map((g) => (
                <div key={g.id} className="lr-term">
                  <dt>{g.term}</dt>
                  <dd>{g.short_definition}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export default Learn;
