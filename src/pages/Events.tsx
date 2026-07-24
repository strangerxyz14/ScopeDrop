import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { supabase } from "@/integrations/supabase/client";
import { GEO_TABS, type ScheduledEventRow } from "@/hooks/home/useUpcomingEvents";
import { formatEventDate } from "@/components/home/utils";
import "@/components/home/theme.css";

// ============================================================
// Enable once ADMIN_EMAIL notifications are wired (see submit-event/index.ts TODO)
// ============================================================
const SUBMIT_EVENT_ENABLED = false;

const warmedGeos = new Set<string>();

async function warmGeo(geoKey: string) {
  if (warmedGeos.has(geoKey)) return;
  const tab = GEO_TABS.find((t) => t.key === geoKey);
  if (!tab || !tab.warmCity) return;
  warmedGeos.add(geoKey);
  try {
    await supabase.functions.invoke("fetch-events", {
      body: { city: tab.warmCity, region: tab.warmRegion ?? null },
    });
  } catch (err) {
    console.warn(`fetch-events warm failed for ${geoKey}:`, err);
    warmedGeos.delete(geoKey);
  }
}

async function fetchEvents(geoKey: string): Promise<ScheduledEventRow[]> {
  const tab = GEO_TABS.find((t) => t.key === geoKey) ?? GEO_TABS[GEO_TABS.length - 1];
  const nowIso = new Date().toISOString();
  let q = supabase
    .from("scheduled_events")
    .select("*")
    .eq("status", "approved")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(60);

  if (tab.key !== "global") {
    const orParts: string[] = [];
    for (const c of tab.matchCities ?? []) orParts.push(`city.ilike.${c}`);
    for (const r of tab.matchRegions ?? []) orParts.push(`region.ilike.${r}`);
    if (orParts.length > 0) q = q.or(orParts.join(","));
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

function sourceLabel(source: string | null): string | null {
  if (source === "serpapi") return "via Google Events";
  if (source === "self_submitted") return "via community submission";
  if (source === "manual") return null;
  return null;
}

const Events = () => {
  const [geoKey, setGeoKey] = useState<string>("global");
  const [rows, setRows] = useState<ScheduledEventRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      const warm = warmGeo(geoKey);
      try {
        const initial = await fetchEvents(geoKey);
        if (!cancelled) setRows(initial);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }

      await warm;
      if (cancelled) return;
      try {
        const refreshed = await fetchEvents(geoKey);
        if (!cancelled) setRows(refreshed);
      } catch {
        // ignore secondary refresh failures
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geoKey]);

  const activeTab = useMemo(
    () => GEO_TABS.find((t) => t.key === geoKey) ?? GEO_TABS[GEO_TABS.length - 1],
    [geoKey],
  );

  return (
    <div className="sdvg">
      <SEO
        title="Events — ScopeDrop"
        description="Upcoming demo days, hackathons, tech conferences, and startup meetups."
        keywords={["startup events", "demo days", "hackathons", "tech conferences"]}
      />
      <SiteHeader />
      <main>
        <div className="masthead">
          <div className="wrap mh">
            <div className="l">
              <span>EVENTS · WHAT'S HAPPENING</span>
            </div>
          </div>
        </div>

        <section className="ev-sec">
          <div className="wrap">
            <div className="sec-h">
              <h3>
                Upcoming events
                <span className="geo" role="tablist" aria-label="Filter events by city">
                  {GEO_TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={t.key === geoKey}
                      className={t.key === geoKey ? "on" : ""}
                      onClick={() => setGeoKey(t.key)}
                    >
                      {t.label}
                    </button>
                  ))}
                </span>
              </h3>
              <Link className="more" to="/">
                ← Back home
              </Link>
            </div>

            {loading && (!rows || rows.length === 0) ? (
              <div className="ev-grid" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="ev">
                    <div className="sd-skel" style={{ height: 60 }}></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="sd-empty">
                <span className="k">Something went wrong</span>
                <p>{error}</p>
              </div>
            ) : rows && rows.length === 0 ? (
              <div className="sd-empty">
                <span className="k">
                  No upcoming events in {activeTab.label} yet
                </span>
                <p>
                  {geoKey !== "global" ? (
                    <>
                      Try{" "}
                      <button
                        type="button"
                        onClick={() => setGeoKey("global")}
                        style={{
                          color: "var(--parrot)",
                          background: "transparent",
                          border: 0,
                          cursor: "pointer",
                          font: "inherit",
                        }}
                      >
                        Global
                      </button>
                      .
                    </>
                  ) : (
                    <>Events populate as they're added.</>
                  )}
                </p>
              </div>
            ) : (
              <div className="ev-grid">
                {(rows ?? []).map((e) => {
                  const parts = [e.city, e.location, e.is_virtual ? "VIRTUAL" : "IN-PERSON"]
                    .filter(Boolean)
                    .join(" · ")
                    .toUpperCase();
                  const source = sourceLabel(e.source);
                  const content = (
                    <>
                      <div className="d">{formatEventDate(e.starts_at)}</div>
                      <h4>{e.title}</h4>
                      {parts && <div className="loc">{parts}</div>}
                      {e.description && (
                        <p
                          style={{
                            color: "var(--fg-mute)",
                            fontSize: 13,
                            marginTop: 10,
                            lineHeight: 1.5,
                          }}
                        >
                          {e.description.length > 180
                            ? e.description.slice(0, 180) + "…"
                            : e.description}
                        </p>
                      )}
                      {source && (
                        <div
                          className="mono"
                          style={{
                            fontSize: 10.5,
                            color: "var(--fg-mute)",
                            marginTop: 12,
                            letterSpacing: ".08em",
                            textTransform: "uppercase",
                          }}
                        >
                          {source}
                        </div>
                      )}
                    </>
                  );
                  if (e.registration_url) {
                    return (
                      <a
                        key={e.id}
                        className="ev"
                        href={e.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {content}
                      </a>
                    );
                  }
                  return (
                    <div key={e.id} className="ev" style={{ cursor: "default" }}>
                      {content}
                    </div>
                  );
                })}
              </div>
            )}

            {SUBMIT_EVENT_ENABLED && <SubmitEventForm />}

            <div className="ev-note">
              EVENTS SOURCED FROM GOOGLE EVENTS (VIA SERPAPI) · AI-FILTERED FOR RELEVANCE
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

// ============================================================
// SubmitEventForm: complete + tested against the submit-event edge
// function, gated behind SUBMIT_EVENT_ENABLED above. Flipping the flag
// to true is the only step required to expose it — no further backend
// work needed. Enable once ADMIN_EMAIL notifications are wired
// (see supabase/functions/submit-event/index.ts TODO).
// ============================================================
type SubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "err"; message: string };

function SubmitEventForm() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^https?:\/\//.test(url)) {
      setState({ kind: "err", message: "Enter a valid https:// URL." });
      return;
    }
    setState({ kind: "loading" });
    try {
      const { data, error } = await supabase.functions.invoke("submit-event", {
        body: { url: url.trim(), submitted_by_email: email.trim() || undefined },
      });
      if (error) {
        setState({ kind: "err", message: error.message });
        return;
      }
      const payload = data as { ok?: boolean; error?: string; parsed?: { title?: string } };
      if (payload?.ok) {
        setState({
          kind: "ok",
          message: `Submitted for review${payload.parsed?.title ? `: ${payload.parsed.title}` : ""}. You'll hear back once reviewed.`,
        });
        setUrl("");
        setEmail("");
      } else {
        setState({ kind: "err", message: payload?.error ?? "Submission failed." });
      }
    } catch (err) {
      setState({ kind: "err", message: String(err) });
    }
  }

  return (
    <section
      className="nl"
      style={{ marginTop: 48, padding: "56px 0", textAlign: "left" }}
      aria-labelledby="submit-heading"
    >
      <div className="wrap" style={{ maxWidth: 640, margin: "0 auto" }}>
        <span className="lh">Submit an event</span>
        <h3 id="submit-heading" style={{ margin: "12px 0 8px" }}>
          Know an event that belongs here?
        </h3>
        <p style={{ maxWidth: "none", margin: "0 auto 20px", textAlign: "left" }}>
          Paste the event page URL. We'll parse it and add it to the review queue.
        </p>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="url"
            placeholder="https://lu.ma/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            disabled={state.kind === "loading"}
            style={{ width: "100%", background: "var(--oxford)", border: "1px solid var(--line)", color: "var(--fg-2)", padding: "12px 16px", fontSize: 14 }}
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state.kind === "loading"}
            style={{ width: "100%", background: "var(--oxford)", border: "1px solid var(--line)", color: "var(--fg-2)", padding: "12px 16px", fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={state.kind === "loading"}
            style={{
              background: "var(--parrot)",
              color: "var(--ink)",
              border: 0,
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: 700,
              cursor: state.kind === "loading" ? "default" : "pointer",
              opacity: state.kind === "loading" ? 0.6 : 1,
            }}
          >
            {state.kind === "loading" ? "Submitting…" : "Submit for review"}
          </button>
        </form>
        {state.kind === "ok" && (
          <div className="nl-msg" style={{ textAlign: "left" }}>
            {state.message}
          </div>
        )}
        {state.kind === "err" && (
          <div className="nl-msg err" style={{ textAlign: "left" }}>
            {state.message}
          </div>
        )}
      </div>
    </section>
  );
}

export default Events;
