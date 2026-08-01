// ============================================================
// EventDetail — /events/:slug (slug or UUID id).
// Layout matches the stitch mockup: full-bleed hero cover with a
// glass-pane title/dek overlay, then a two-column body — main content
// (description → agenda → speakers → scope) on the left and a sticky
// sidebar on the right with a Registration Details card (D/H/M/S
// countdown, date/time/venue/format rows, Register CTA) and a Location
// card (always shown; interactive map if coords, always a Google Maps
// link so users can navigate regardless).
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { EventHero } from "@/components/events/EventHero";
import { OrganizerLogo } from "@/components/events/OrganizerLogo";
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

function formatDatePart(iso: string, city: string | null): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "2-digit", year: "numeric",
    timeZone: tzForCity(city),
  });
}

function formatTimePart(iso: string, city: string | null): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit",
    timeZone: tzForCity(city), timeZoneName: "short",
  });
}

function sourceAttribution(source: string | null): string | null {
  if (source === "serpapi") return "via Google Events";
  if (source === "self_submitted") return "community submitted";
  if (source === "editorial_blog") return "via editorial coverage";
  return null;
}

function ctaLabel(url: string | null): string {
  if (!url) return "Register";
  const u = url.toLowerCase();
  if (u.includes("eventbrite") || u.includes("lu.ma") || u.includes("meetup") || u.includes("bookings") || u.includes("register") || u.includes("tickets")) {
    return "Register Now";
  }
  return "View Event";
}

// ------------------------------------------------------------
// Live countdown to starts_at — returns D/H/M/S so we can render each
// unit in its own tile (matching the mockup).
// ------------------------------------------------------------
interface CountdownParts {
  days: number; hours: number; minutes: number; seconds: number;
  passed: boolean;
}
function useCountdownParts(target: string | null): CountdownParts {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const period = reduced ? 60_000 : 1_000;
    const t = window.setInterval(() => setNow(Date.now()), period);
    return () => window.clearInterval(t);
  }, []);
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  const then = new Date(target).getTime();
  if (!isFinite(then)) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  const diff = then - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    passed: false,
  };
}

function pad(n: number): string { return n.toString().padStart(2, "0"); }

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
        zoom: 14,
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
  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}

function googleMapsUrl(event: ScheduledEventRow): string {
  if (event.venue_lat != null && event.venue_lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${event.venue_lat},${event.venue_lng}`;
  }
  const q = [event.location, event.city].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || "location")}`;
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
        .in("status", ["approved", "published"]);
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
          .in("status", ["approved", "published"])
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
  const countdown = useCountdownParts(event?.starts_at ?? null);
  const agenda = (event?.agenda as unknown as AgendaEntry[] | null) ?? null;
  const speakers = (event?.speakers as unknown as Speaker[] | null) ?? null;
  const hasCoords = !!event && event.venue_lat != null && event.venue_lng != null;

  // First sentence of description → dek in the hero glass pane.
  const dek = useMemo(() => {
    if (!event?.description) return null;
    const first = event.description.split(/(?<=[.!?])\s/)[0]?.trim() ?? "";
    if (first.length < 20) return null;
    return first.length > 160 ? first.slice(0, 160) + "…" : first;
  }, [event?.description]);

  return (
    <div className="sdvg">
      <SEO
        title={event ? `${event.title} — ScopeDrop Events` : "Event — ScopeDrop"}
        description={event?.description ?? "Startup, tech, and AI event on ScopeDrop."}
        keywords={[event?.city ?? "", event?.relevance_category ?? "", "events"].filter(Boolean)}
        image={event?.image_url ?? templateUrl ?? undefined}
        type="article"
      />
      <SiteHeader />
      <main>
        {loading ? (
          <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
            <div className="sd-empty" aria-busy="true"><span className="k">Loading event…</span></div>
          </div>
        ) : notFound ? (
          <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
            <div className="sd-empty">
              <span className="k">Event not found</span>
              <p>It may have ended or been removed.{" "}
                <Link to="/events" style={{ color: "var(--parrot)" }}>Browse upcoming events →</Link>
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="wrap" style={{ paddingTop: 120, paddingBottom: 80 }}>
            <div className="sd-empty"><span className="k">Error</span><p>{error}</p></div>
          </div>
        ) : event ? (
          <>
            {/* HERO — EventHero primitive handles image loading + fallback +
                gradient. className overrides preserve the signature full-bleed
                16:7 aspect + hard edges (vs. the primitive's default rounded 16:9
                for card usage). Glass pane sits in children so it composites
                above the gradient without layout coupling. */}
            <div style={{ marginTop: 66 }}>
              <EventHero
                imageUrl={event.image_url ?? templateUrl ?? undefined}
                title={event.title}
                className="rounded-none aspect-[16/7] min-h-[320px] border-b border-[color:var(--line)]"
              >
                <div className="ev-hero-glass">
                  <span className="kicker">
                    {(event.relevance_category ?? event.event_type ?? "event").toUpperCase().replace(/_/g, " ")}
                  </span>
                  <h1>{event.title}</h1>
                  {dek && <p className="dek">{dek}</p>}
                </div>
              </EventHero>
            </div>

            <div className="wrap">
              {/* Breadcrumb */}
              <nav aria-label="Breadcrumb" className="mono"
                style={{ fontSize: 11, color: "var(--fg-mute)", letterSpacing: ".08em", paddingTop: 20 }}>
                <Link to="/events" style={{ color: "var(--parrot)" }}>EVENTS</Link>
                {event.city && (
                  <>
                    <span style={{ margin: "0 10px" }}>/</span>
                    <span>{event.city.toUpperCase()}</span>
                  </>
                )}
                {attribution && (
                  <>
                    <span style={{ margin: "0 10px" }}>·</span>
                    <span style={{ color: "var(--parrot)" }}>{attribution.toUpperCase()}</span>
                  </>
                )}
              </nav>

              {/* BODY — main content + sticky sidebar */}
              <div className="ev-body">
                {/* LEFT: description → agenda → speakers → scope */}
                <div className="ev-main">
                  {/* Presented-by row — OrganizerLogo primitive handles the
                      img/monogram-fallback pattern. Row is still hidden when
                      organizer_name is null (no name = nothing to attribute). */}
                  {event.organizer_name && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 14,
                      marginBottom: 28, paddingBottom: 20, borderBottom: "1px solid var(--line)",
                    }}>
                      <OrganizerLogo
                        logoUrl={event.organizer_logo_url}
                        organizerName={event.organizer_name}
                        size={44}
                      />
                      <div>
                        <div className="mono" style={{ fontSize: 10.5, color: "var(--fg-mute)", letterSpacing: ".14em" }}>PRESENTED BY</div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--fg-2)" }}>{event.organizer_name}</div>
                      </div>
                    </div>
                  )}

                  {/* Full description */}
                  {event.description && (
                    <section style={{ marginBottom: 32 }}>
                      <h3 className="mono" style={{
                        fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                        textTransform: "uppercase", marginBottom: 12,
                      }}>Event Description</h3>
                      <div style={{ color: "var(--fg-2)", fontSize: 15.5, lineHeight: 1.7 }}>
                        {event.description.split(/\n\n+/).map((para, i) => (
                          <p key={i} style={{ marginBottom: 14 }}>{para}</p>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Highlights — Phase 3's editorial-grade `highlights` column
                      takes precedence over legacy `ai_summary`. Section always
                      renders with a placeholder when both are null. */}
                  <section style={{ marginBottom: 32 }}>
                    <h3 className="mono" style={{
                      fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                      textTransform: "uppercase", marginBottom: 12,
                    }}>Highlights</h3>
                    <div style={{
                      background: "var(--oxford)", padding: "16px 20px",
                      borderLeft: "2px solid var(--acq)", borderRadius: 4,
                      color: (event.highlights ?? event.ai_summary) ? "var(--fg-2)" : "var(--fg-mute)",
                      fontSize: 14.5, lineHeight: 1.65,
                      fontStyle: (event.highlights ?? event.ai_summary) ? "normal" : "italic",
                    }}>
                      {event.highlights ?? event.ai_summary ?? "Editorial highlights coming soon."}
                    </div>
                  </section>

                  {/* Speakers */}
                  {speakers && speakers.length > 0 && (
                    <section style={{ marginBottom: 32 }}>
                      <h3 className="mono" style={{
                        fontSize: 12, letterSpacing: ".16em", color: "var(--fg-mute)",
                        textTransform: "uppercase", marginBottom: 16,
                      }}>Speakers</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
                        {speakers.map((s, i) => (
                          <div key={i} style={{ background: "var(--oxford)", padding: 16, display: "flex", gap: 12, alignItems: "flex-start", borderRadius: 6 }}>
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

                  {/* What's the Scope — Phase 3's `scope_analysis` (Economist-
                      voice analytical block) takes precedence over legacy
                      `relevance_reason` (classifier's one-liner). */}
                  <section style={{
                    background: "var(--oxford)", padding: "18px 22px", marginBottom: 8,
                    borderLeft: "3px solid var(--parrot)", borderRadius: 4,
                  }}>
                    <div className="mono" style={{
                      fontSize: 10.5, color: "var(--parrot)", letterSpacing: ".14em",
                      textTransform: "uppercase", marginBottom: 8,
                    }}>What's the Scope</div>
                    <div style={{
                      color: (event.scope_analysis ?? event.relevance_reason) ? "var(--fg-2)" : "var(--fg-mute)",
                      fontSize: 15, lineHeight: 1.6,
                      fontStyle: (event.scope_analysis ?? event.relevance_reason) ? "normal" : "italic",
                    }}>
                      {event.scope_analysis ?? event.relevance_reason ?? "Editorial angle coming soon."}
                    </div>
                  </section>
                </div>

                {/* RIGHT: sticky sidebar — Registration + Location cards */}
                <aside className="ev-side">
                  {/* Registration card */}
                  <div className="ev-card ev-card--reg">
                    <h3>Registration Details</h3>
                    {!countdown.passed ? (
                      <>
                        <div className="ev-count-label">Event starts in</div>
                        <div className="ev-count" role="timer" aria-live="off">
                          {[
                            { n: countdown.days, u: "Days" },
                            { n: countdown.hours, u: "Hours" },
                            { n: countdown.minutes, u: "Minutes" },
                            { n: countdown.seconds, u: "Seconds" },
                          ].map((c, i) => (
                            <div key={i} className="ev-count-cell">
                              <div className="ev-count-num">{pad(c.n)}</div>
                              <div className="ev-count-unit">{c.u}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="ev-count-label" style={{ marginBottom: 18 }}>Event in progress or ended</div>
                    )}

                    <div className="ev-facts">
                      <div><span className="lbl">Date:</span> {formatDatePart(event.starts_at, event.city)}</div>
                      <div><span className="lbl">Time:</span> {formatTimePart(event.starts_at, event.city)}</div>
                      <div><span className="lbl">Venue:</span> {event.is_virtual ? "Virtual event" : (event.location ?? "TBD")}</div>
                      <div><span className="lbl">Format:</span> {event.is_virtual ? "Virtual" : "In-Person"}</div>
                    </div>

                    {event.registration_url ? (
                      <a
                        className="btn-primary"
                        href={event.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {ctaLabel(event.registration_url)} ↗
                      </a>
                    ) : (
                      <button className="btn-primary is-disabled" disabled type="button">
                        Registration TBD
                      </button>
                    )}
                    <p className="ev-reg-note">
                      {countdown.passed
                        ? "Registration may still be open — check the organizer page."
                        : "Opens on the organizer's page in a new tab."}
                    </p>
                  </div>

                  {/* Location card — always shown, with Maps link either way */}
                  {!event.is_virtual && (event.location || event.city) && (
                    <div className="ev-card">
                      <h3>Location</h3>
                      {event.location && <p className="ev-loc-venue">{event.location}</p>}
                      {event.city && <p className="ev-loc-city">{event.city.toUpperCase()}</p>}
                      {hasCoords && (
                        <div className="ev-loc-map">
                          <EventMap lat={Number(event.venue_lat)} lng={Number(event.venue_lng)} />
                        </div>
                      )}
                      <a
                        className="ev-loc-link"
                        href={googleMapsUrl(event)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Google Maps ↗
                      </a>
                    </div>
                  )}
                </aside>
              </div>
            </div>

            {/* More events in same city */}
            {event.city && related.length > 0 && (
              <section className="ev-sec" style={{ borderTop: "1px solid var(--line)" }}>
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
                          {r.organizer_logo_url && (
                            <img
                              className="ev-logo"
                              src={r.organizer_logo_url}
                              alt={r.organizer_name ?? ""}
                              loading="lazy"
                              onError={(err) => { (err.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
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
          </>
        ) : null}
      </main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
};

export default EventDetail;
