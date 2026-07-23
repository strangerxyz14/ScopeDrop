import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { supabase } from "@/integrations/supabase/client";
import { GEO_TABS, type ScheduledEventRow } from "@/hooks/home/useUpcomingEvents";
import { formatEventDate } from "@/components/home/utils";
import "@/components/home/theme.css";

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
      // Warm in parallel with the read; refetch when warm completes.
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
        // ignore secondary refresh failures — user already has initial data
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [geoKey]);

  return (
    <div className="sdvg">
      <SEO
        title="Events — ScopeDrop"
        description="Upcoming demo days, conferences, and startup meetups near you."
        keywords={["startup events", "demo days", "founder meetups"]}
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
                  No upcoming events {geoKey !== "global" ? `in ${GEO_TABS.find((t) => t.key === geoKey)?.label}` : "tracked"}
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
                      , or submit an event.
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

            <div className="ev-note">
              EVENTS SOURCED FROM EVENTBRITE AND PREDICTHQ. TAB CHANGES TRIGGER A FRESH PULL.
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default Events;
