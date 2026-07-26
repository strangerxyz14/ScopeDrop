// ============================================================
// EventDetail — /events/:slug (slug or UUID id).
// Full Phase 2 spec: breadcrumb, kicker+title+summary, metadata row
// (local timezone from city), presented-by row (organizer + logo),
// cover image (real → template → HeroIllustration placeholder),
// live countdown (parrot, reduced-motion aware), full prose
// description, agenda/speakers/scope sections (all conditional —
// hidden entirely when their fields are null), MapLibre + OpenFreeMap
// map (skipped entirely when no geocoded coords), external Register
// CTA, "More events in {city}" strip.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { HeroIllustration } from "@/components/home/HeroIllustration";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate } from "@/components/home/utils";
import { pickTemplateUrl } from "@/lib/eventImageTemplate";
import type { ScheduledEventRow } from "@/hooks/home/useUpcomingEvents";
import "@/components/home/theme.css";
import "maplibre-gl/dist/maplibre-gl.css";

interface AgendaEntry { time: string; label: string; }
interface Speaker { name: string; role?: string | null; bio?: string | null; photo_url?: string | null; }

// City → IANA timezone. Falls back to system timezone if unknown.
const CITY_TZ: Record<string, string> = {
  delhi: "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  gurugram: "Asia/Kolkata",
  gurgaon: "Asia/Kolkata",
  noida: "Asia/Kolkata",
  bengaluru: "Asia/Kolkata",
  bangalore: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  hyderabad: "Asia/Kolkata",
  chennai: "Asia/Kolkata",
  pune: "Asia/Kolkata",
  "san francisco": "America/Los_Angeles",
  "new york": "America/New_York",
  london: "Europe/London",
  singapore: "Asia/Singapore",
};

function tzForCity(city: string | null): string {
  if (!city) return "UTC";
  return CITY_TZ[city.toLowerCase()] ?? "UTC";
}

function formatLocalDateTime(iso: string, city: string | null): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  const tz = tzForCity(city);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short", month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: tz,
    timeZoneName: "short",
  };
  return d.toLocaleString(undefined, opts).toUpperCase();
}

function sourceAttribution(source: string | null): string | null {
  if (source === "serpapi") return "via Google Events";
  if (source === "self_submitted") return "community submitted";
  if (source === "editorial_blog") return "via editorial coverage";
  return null;
}

function ctaLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("eventbrite") || u.includes("lu.ma") || u.includes("meetup") || u.includes("bookings") || u.includes("register")) {
    return "Register";
  }
  return "View event";
}

// ------------------------------------------------------------
// Live countdown to starts_at
// ------------------------------------------------------------
function useCountdown(target: string | null): { display: string; passed: boolean } {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Even under reduced-motion, update once per minute so the display isn't stuck.
    const period = reduced ? 60_000 : 1_000;
    const t = window.setInterval(() => setNow(Date.now()), period);
    return () => window.clearInterval(t);
  }, []);
  if (!target) return { display: "", passed: false };
  const then = new Date(target).getTime();
  if (!isFinite(then)) return { display: "", passed: false };
  const diff = then - now;
  if (diff <= 0) return { display: "In progress or ended", passed: true };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (days > 0) return { display: `${days}d ${hours}h ${minutes}m`, passed: false };
  if (hours > 0) return { display: `${hours}h ${minutes}m`, passed: false };
  return { display: `${minutes}m`, passed: false };
}

// ------------------------------------------------------------
// MapLibre map — lazy-loaded via dynamic imports so the page still
// renders quickly when no coords exist. OpenFreeMap tiles = no key,
// no account.
// ------------------------------------------------------------
function EventMap({ lat, lng }: { lat: number; lng: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const mod: typeof import("maplibre-gl") = await import("maplibre-gl");
      const maplibregl = (mod as { default?: typeof mod }).default ?? mod;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: "https://tiles.openfreemap.org/styles/positron",
        center: [lng, lat],
        zoom: 13,
        attributionControl: { compact: true },
      });
      new maplibregl.Marker({ color: "#3ECF6E" }).setLngLat([lng, lat]).addTo(map);
      cleanup = () => map.remove();
    })().catch((e) => console.warn("map load failed:", e));
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [lat, lng]);
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        aspectRatio: "16 / 9",
        background: "var(--oxford)",
        border: "1px solid var(--line)",
      }}
    />
  );
}

// ------------------------------------------------------------
// Main page
// ------------------------------------------------------------
const EventDetail = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<ScheduledEventRow | null>(null);
  const [related, setRelated] = useState<ScheduledEventRow[]>([]);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);
    setTemplateUrl(null);

    (async () => {
      if (!slugParam) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const isLikelyUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugParam);
      const q = supabase
        .from("scheduled_events")
        .select("*")
        .eq("status", "approved");
      const { data, error } = await (isLikelyUuid
        ? q.eq("id", slugParam)
        : q.eq("slug", slugParam)
      ).maybeSingle();

      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      if (!data) { setNotFound(true); setLoading(false); return; }
      setEvent(data);
      setLoading(false);

      // Related events — same city.
      if (data.city) {
        const nowIso = new Date().toISOString();
        const { data: rel } = await supabase
          .from("scheduled_events")
          .select("*")
          .eq("status", "approved")
          .eq("city", data.city)
          .neq("id", data.id)
          .gte("starts_at", nowIso)
          .order("starts_at", { ascending: true })
          .limit(4);
        if (!cancelled) setRelated(rel ?? []);
      }

      // Template fallback (only if no real image).
      if (!data.image_url) {
        const tpl = await pickTemplateUrl({
          eventId: data.id,
          category: data.relevance_category ?? data.event_type,
          format: data.is_virtual ? "virtual" : "in_person",
        });
        if (!cancelled) setTemplateUrl(tpl);
      }
    })();

    return () => { cancelled = true; };
  }, [slugParam]);

  const attribution = event ? sourceAttribution(event.source) : null;
  const countdown = useCountdown(event?.starts_at ?? null);
  const agenda = (event?.agenda as unknown as AgendaEntry[] | null) ?? null;
  const speakers = (event?.speakers as unknown as Speaker[] | null) ?? null;
  const hasCoords = event && event.venue_lat != null && event.venue_lng != null;

  return (
    <div className="sdvg">
      <SEO
        title={event ? `${event.title} — ScopeDrop Events` : "Event — ScopeDrop"}
        description={event?.description ?? "Startup, tech, and AI event on ScopeDrop."}
        keywords={[event?.city ?? "", event?.relevance_category ?? "", "events"].filter(Boolean)}
      />
      <SiteHeader />
      <main>
        <div className="masthead">
          <div className="wrap mh">
            <div className="l"><span>EVENTS</span></div>
            {countdown.display && event && !countdown.passed && (
              <div className="r">
                <span className="pd" aria-hidden="true"></span>
                <span style={{ color: "var(--parrot)" }}>{countdown.display}</span> to go
              </div>
            )}
          </div>
        </div>

        <section className="ev-sec" style={{ paddingTop: 40 }}>
          <div className="wrap" style={{ maxWidth: 920 }}>
            {loading ? (
              <div className="sd-empty" aria-busy="true"><span className="k">Loading event…</span></div>
            ) : notFound ? (
              <div className="sd-empty">
                <span className="k">Event not found</span>
                <p>It may have ended or been removed.{" "}
                  <Link to="/events" style={{ color: "var(--parrot)" }}>Browse upcoming events →</Link>
                </p>
              </div>
            ) : error ? (
              <div className="sd-empty"><span className="k">Error</span><p>{error}</p></div>
            ) : event ? (
              <>
                {/* Breadcrumb */}
                <nav aria-label="Breadcrumb" className="mono"
                  style={{ fontSize: 11, color: "var(--fg-mute)", letterSpacing: ".08em", marginBottom: 24 }}>
                  <Link to="/events" style={{ color: "var(--parrot)" }}>EVENTS</Link>
                  {event.city && (
                    <>
                      <span style={{ margin: "0 10px" }}>/</span>
                      <span>{event.city.toUpperCase()}</span>
                    </>
                  )}
                  <span style={{ margin: "0 10px" }}>/</span>
                  <span style={{ color: "var(--fg-2)" }}>
                    {event.title.length > 60 ? event.title.slice(0, 60) + "…" : event.title}
                  </span>
                </nav>

                {/* Kicker */}
                <div className="fmt-line" style={{ marginBottom: 12 }}>
                  <span className="fmt">
                    {(event.relevance_category ?? event.event_type ?? "event").toUpperCase().replace(/_/g, " ")}
                  </span>
                </div>

                {/* Title */}
                <h1 className="flag-h" style={{ fontSize: "clamp(28px, 3.5vw, 44px)", marginBottom: 16 }}>
                  {event.title}
                </h1>

                {/* One-line summary (first sentence of description if short) */}
                {event.description && event.description.length > 30 && (
                  <p className="dek" style={{ marginBottom: 24, maxWidth: 720 }}>
                    {(() => {
                      const first = event.description.split(/(?<=[.!?])\s/)[0];
                      return first.length > 200 ? first.slice(0, 200) + "…" : first;
                    })()}
                  </p>
                )}

                {/* Metadata row */}
                <div className="mono" style={{
                  fontSize: 12.5, color: "var(--fg-mute)", letterSpacing: ".04em",
                  marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap",
                  paddingBottom: 20, borderBottom: "1px solid var(--line)",
                }}>
                  <span style={{ color: "var(--amber)" }}>{formatLocalDateTime(event.starts_at, event.city)}</span>
                  <span>
                    {event.is_virtual
                      ? "VIRTUAL"
                      : [event.location, event.city].filter(Boolean).join(" · ").toUpperCase() || "LOCATION TBD"}
                  </span>
                  {attribution && <span style={{ color: "var(--parrot)" }}>{attribution.toUpperCase()}</span>}
                </div>

                {/* Presented-by row — hidden entirely when organizer unknown */}
                {event.organizer_name && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 14,
                    marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid var(--line)",
                  }}>
                    {event.organizer_logo_url && (
                      <img
                        src={event.organizer_logo_url}
                        alt={event.organizer_name}
                        style={{ height: 36, width: 36, objectFit: "contain", background: "var(--oxford)", borderRadius: 4 }}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-mute)", letterSpacing: ".14em" }}>PRESENTED BY</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-2)" }}>{event.organizer_name}</div>
                    </div>
                  </div>
                )}

                {/* Cover image: real → template → HeroIllustration */}
                <div style={{
                  aspectRatio: "16 / 9", background: "var(--oxford)", overflow: "hidden",
                  position: "relative", marginBottom: 32, borderTop: "2px solid var(--amber)",
                }}>
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : templateUrl ? (
                    <img src={templateUrl} alt="" loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <HeroIllustration />
                  )}
                </div>

                {/* Full prose description */}
                {event.description && (
                  <div style={{ color: "var(--fg-2)", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
                    {event.description.split(/\n\n+/).map((para, i) => (
                      <p key={i} style={{ marginBottom: 16 }}>{para}</p>
                    ))}
                  </div>
                )}

                {/* Agenda — hidden entirely when null/empty */}
                {agenda && agenda.length > 0 && (
                  <section style={{ marginBottom: 32 }}>
                    <h3 className="mono" style={{
                      fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                      textTransform: "uppercase", marginBottom: 16,
                    }}>Agenda</h3>
                    <div className="trk-list">
                      {agenda.map((row, i) => (
                        <div key={i} className="step">
                          <span className="num">{row.time}</span>
                          <span className="t">{row.label}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Speakers — hidden entirely when null */}
                {speakers && speakers.length > 0 && (
                  <section style={{ marginBottom: 32 }}>
                    <h3 className="mono" style={{
                      fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                      textTransform: "uppercase", marginBottom: 16,
                    }}>Speakers</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                      {speakers.map((s, i) => (
                        <div key={i} style={{ background: "var(--oxford)", padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
                          {s.photo_url && (
                            <img src={s.photo_url} alt={s.name} loading="lazy"
                              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, color: "var(--fg)" }}>{s.name}</div>
                            {s.role && <div style={{ fontSize: 12.5, color: "var(--fg-mute)", marginTop: 3 }}>{s.role}</div>}
                            {s.bio && <div style={{ fontSize: 12.5, color: "var(--fg-mute)", marginTop: 6, lineHeight: 1.4 }}>
                              {s.bio.length > 140 ? s.bio.slice(0, 140) + "…" : s.bio}
                            </div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* What's the Scope — hidden when relevance_reason null */}
                {event.relevance_reason && (
                  <section style={{
                    background: "var(--oxford)", padding: "20px 24px", marginBottom: 32,
                    borderLeft: "3px solid var(--parrot)",
                  }}>
                    <div className="mono" style={{
                      fontSize: 10.5, color: "var(--parrot)", letterSpacing: ".14em",
                      textTransform: "uppercase", marginBottom: 8,
                    }}>What's the Scope</div>
                    <div style={{ color: "var(--fg-2)", fontSize: 15, lineHeight: 1.6 }}>{event.relevance_reason}</div>
                  </section>
                )}

                {/* Map — skipped entirely if no coords */}
                {hasCoords && (
                  <section style={{ marginBottom: 32 }}>
                    <h3 className="mono" style={{
                      fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                      textTransform: "uppercase", marginBottom: 12,
                    }}>Location</h3>
                    <EventMap lat={Number(event.venue_lat)} lng={Number(event.venue_lng)} />
                  </section>
                )}

                {/* Register CTA */}
                {event.registration_url && (
                  <div style={{ marginBottom: 48 }}>
                    <a href={event.registration_url} target="_blank" rel="noopener noreferrer" style={{
                      display: "inline-block", background: "var(--parrot)", color: "var(--ink)",
                      padding: "14px 32px", fontWeight: 700, fontSize: 14, textDecoration: "none",
                      borderRadius: 4, fontFamily: "'Inter', sans-serif",
                    }}>
                      {ctaLabel(event.registration_url)} ↗
                    </a>
                    {event.source_url && event.source_url !== event.registration_url && (
                      <a href={event.source_url} target="_blank" rel="noopener noreferrer" className="mono" style={{
                        marginLeft: 20, color: "var(--fg-mute)", fontSize: 11.5, letterSpacing: ".06em",
                      }}>SOURCE ↗</a>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* More events in same city */}
        {event && event.city && related.length > 0 && (
          <section className="ev-sec" style={{ paddingTop: 32, borderTop: "1px solid var(--line)" }}>
            <div className="wrap">
              <div className="sec-h">
                <h3>More events in {event.city}</h3>
                <Link className="more" to="/events">All events →</Link>
              </div>
              <div className="ev-grid">
                {related.map((r) => {
                  const parts = [r.city, r.location, r.is_virtual ? "VIRTUAL" : "IN-PERSON"]
                    .filter(Boolean).join(" · ").toUpperCase();
                  const linkTo = `/events/${r.slug ?? r.id}`;
                  return (
                    <Link key={r.id} className="ev" to={linkTo}>
                      <div className="d">{formatEventDate(r.starts_at)}</div>
                      <h4>{r.title}</h4>
                      {parts && <div className="loc">{parts}</div>}
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default EventDetail;
