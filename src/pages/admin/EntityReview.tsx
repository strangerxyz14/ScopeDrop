// ============================================================
// EntityReview: unlinked admin surface at /admin/entities.
// Company matches the enrichment rules could not prove. "Same company"
// records the choice and the next enrich-entities run (≤15 min) fills
// the profile; "None of these" blocks the candidates for good.
// Server-side ADMIN_EMAIL check in admin-entities enforces access.
// Intentionally not linked from any nav, footer, or sitemap.
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import "@/components/home/theme.css";

type Source = "wikidata" | "yc";

interface Candidate {
  source: Source;
  id: string;
  label: string;
  description: string | null;
  website: string | null;
  founded: number | null;
  headquarters: string | null;
  link: string;
}

interface ReviewRow {
  id: string;
  name: string;
  entity_type: string;
  enrichment_status: "unconfirmed" | "ambiguous";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enrichment: any;
  news: { one_liner: string | null; source_url: string | null; announced_at: string | null } | null;
}

const MONO = "'IBM Plex Mono', ui-monospace, monospace";

function functionUrl(action: string): string {
  return `${(import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "")}/functions/v1/admin-entities?action=${encodeURIComponent(action)}`;
}

async function callAdmin(action: string, body?: unknown): Promise<{ ok: boolean; rows?: ReviewRow[]; error?: string; status: number }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) return { ok: false, error: "not signed in", status: 401 };
  const res = await fetch(functionUrl(action), {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { ...json, status: res.status };
}

/** The candidates stored by enrich-entities for an uncertain match. */
function candidatesOf(row: ReviewRow): Candidate[] {
  const out: Candidate[] = [];
  const wd = row.enrichment?.wikidata;
  if (wd?.kind === "unconfirmed") {
    out.push({
      source: "wikidata",
      id: wd.id,
      label: wd.label ?? row.name,
      description: wd.description ?? null,
      website: wd.website ?? null,
      founded: wd.inceptionYear ?? null,
      headquarters: [wd.headquarters, wd.country].filter(Boolean).join(", ") || null,
      link: `https://www.wikidata.org/wiki/${wd.id}`,
    });
  } else if (wd?.kind === "ambiguous") {
    for (const c of wd.candidates ?? []) {
      out.push({
        source: "wikidata",
        id: c.id,
        label: c.label ?? row.name,
        description: c.description ?? null,
        website: null,
        founded: null,
        headquarters: null,
        link: `https://www.wikidata.org/wiki/${c.id}`,
      });
    }
  }
  const yc = row.enrichment?.yc_unconfirmed;
  if (yc?.id) {
    out.push({
      source: "yc",
      id: String(yc.id).split("~")[0],
      label: yc.name ?? row.name,
      description: [yc.one_liner, yc.batch && `YC ${yc.batch}`].filter(Boolean).join(" · ") || null,
      website: yc.website ?? null,
      founded: typeof yc.launched_at === "number" ? new Date(yc.launched_at * 1000).getUTCFullYear() : null,
      headquarters: typeof yc.locations === "string" ? yc.locations.split(";")[0] : null,
      link: yc.slug ? `https://www.ycombinator.com/companies/${yc.slug}` : "https://www.ycombinator.com/companies",
    });
  }
  return out;
}

const EntityReview = () => {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await callAdmin("list");
      if (r.status === 403) setError("This account can't review matches.");
      else if (r.status === 401) setError("Your session expired. Sign in again.");
      else if (r.status === 503) setError("Admin review isn't configured yet (ADMIN_EMAIL unset).");
      else if (!r.ok) setError(r.error ?? "unknown error");
      else setRows(r.rows ?? []);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) void load();
  }, [authLoading, isAuthenticated, load]);

  async function decide(row: ReviewRow, action: "confirm" | "reject", candidate?: Candidate) {
    setBusyId(row.id);
    const body = action === "confirm"
      ? { id: row.id, source: candidate!.source, candidate_id: candidate!.id }
      : { id: row.id, candidates: candidatesOf(row).map((c) => ({ source: c.source, id: c.id })) };
    const r = await callAdmin(action, body);
    setBusyId(null);
    if (!r.ok) alert(`Couldn't save that: ${r.error ?? "unknown error"}`);
    else setRows((prev) => prev.filter((x) => x.id !== row.id));
  }

  const authGate = useMemo(() => {
    if (authLoading) return "Loading…";
    if (!isAuthenticated) return "Sign in required. This page isn't publicly reachable.";
    return null;
  }, [authLoading, isAuthenticated]);

  return (
    <div className="sdvg">
      <SEO title="Match review — ScopeDrop admin" description="" keywords={[]} />
      <SiteHeader />
      <main>
        <div className="masthead">
          <div className="wrap mh">
            <div className="l">
              <span>ADMIN · MATCH REVIEW</span>
            </div>
            <div className="r">
              <span className="mono">{user?.email ?? ""}</span>
            </div>
          </div>
        </div>

        <section className="ev-sec">
          <div className="wrap">
            {authGate ? (
              <div className="sd-empty">
                <span className="k">{authGate}</span>
              </div>
            ) : (
              <>
                <div className="sec-h">
                  <h3>Is this the same company?</h3>
                  <button
                    type="button"
                    className="more"
                    onClick={() => void load()}
                    style={{ background: "transparent", border: 0, cursor: "pointer" }}
                  >
                    Refresh →
                  </button>
                </div>
                <p style={{ color: "var(--fg-mute)", fontSize: 13.5, margin: "0 0 20px", lineHeight: 1.5 }}>
                  We found a likely profile but couldn't prove it. Confirm and the card fills in within 15 minutes.
                </p>

                {loading ? (
                  <div className="sd-empty" aria-busy="true">
                    <span className="k">Loading…</span>
                  </div>
                ) : error ? (
                  <div className="sd-empty">
                    <span className="k">Error</span>
                    <p>{error}</p>
                  </div>
                ) : rows.length === 0 ? (
                  <div className="sd-empty">
                    <span className="k">Nothing to review</span>
                    <p>New uncertain matches land here as the enrichment job runs.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontFamily: MONO, fontSize: 12, color: "var(--fg-mute)" }}>
                      {rows.length} TO REVIEW
                    </div>
                    {rows.map((row) => {
                      const candidates = candidatesOf(row);
                      return (
                        <div key={row.id} className="ev" style={{ padding: 24, cursor: "default" }}>
                          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".06em", color: "var(--parrot)" }}>
                            {row.entity_type.toUpperCase()} · {row.enrichment_status.toUpperCase()}
                          </div>
                          <h4 style={{ margin: "6px 0 8px" }}>{row.name}</h4>
                          {row.news?.one_liner && (
                            <p style={{ color: "var(--fg-2)", fontSize: 13.5, margin: "0 0 14px", lineHeight: 1.5 }}>
                              In our news: {row.news.one_liner}
                              {row.news.source_url && (
                                <>
                                  {" "}
                                  <a href={row.news.source_url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--parrot)" }}>
                                    Source ↗
                                  </a>
                                </>
                              )}
                            </p>
                          )}

                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {candidates.map((c) => (
                              <div
                                key={`${c.source}:${c.id}`}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 16,
                                  border: "1px solid var(--line)",
                                  padding: "12px 14px",
                                }}
                              >
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--fg-mute)" }}>
                                    {c.source === "yc" ? "Y COMBINATOR" : "WIKIDATA"} ·{" "}
                                    <a href={c.link} target="_blank" rel="noopener noreferrer" style={{ color: "var(--parrot)" }}>
                                      VIEW ↗
                                    </a>
                                  </div>
                                  <div style={{ fontWeight: 600, margin: "4px 0 2px" }}>{c.label}</div>
                                  {c.description && <div style={{ color: "var(--fg-mute)", fontSize: 13 }}>{c.description}</div>}
                                  <div style={{ fontFamily: MONO, fontSize: 11, color: "var(--fg-mute)", marginTop: 6 }}>
                                    {[c.website, c.founded && `FOUNDED ${c.founded}`, c.headquarters].filter(Boolean).join(" · ")}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void decide(row, "confirm", c)}
                                  disabled={busyId === row.id}
                                  style={{
                                    background: "var(--parrot)",
                                    color: "var(--ink)",
                                    border: 0,
                                    padding: "8px 14px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {busyId === row.id ? "…" : "Same company"}
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => void decide(row, "reject")}
                            disabled={busyId === row.id || candidates.length === 0}
                            style={{
                              marginTop: 12,
                              background: "transparent",
                              color: "var(--amber)",
                              border: "1px solid var(--amber)",
                              padding: "8px 14px",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {busyId === row.id ? "…" : candidates.length > 1 ? "None of these" : "Not this company"}
                          </button>
                        </div>
                      );
                    })}
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

export default EntityReview;
