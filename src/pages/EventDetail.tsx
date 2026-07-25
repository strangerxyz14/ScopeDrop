// ============================================================
// EventDetail — /events/:slug (or /events/:id fallback).
// Shows a single approved event with breadcrumb, metadata, cover
// image, prose description, external Register CTA, and up to
// four related upcoming events in the same city.
// ============================================================
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { HeroIllustration } from "@/components/home/HeroIllustration";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate } from "@/components/home/utils";
import type { ScheduledEventRow } from "@/hooks/home/useUpcomingEvents";
import "@/components/home/theme.css";

function sourceAttribution(source: string | null): string | null {
  if (source === "serpapi") return "via Google Events";
  if (source === "self_submitted") return "community submitted";
  return null;
}

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).toUpperCase();
}

function ctaLabel(url: string): string {
  const u = url.toLowerCase();
  if (u.includes("eventbrite") || u.includes("lu.ma") || u.includes("meetup") || u.includes("bookings")) {
    return "Register";
  }
  return "View event";
}

const EventDetail = () => {
  const { slug: slugParam } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<ScheduledEventRow | null>(null);
  const [related, setRelated] = useState<ScheduledEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    (async () => {
      if (!slugParam) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // slug OR id fallback. UUIDs are 36 chars with dashes; slugs are ~24 chars
      // (`serpapi_<16 hex>` or similar). Try slug first, then id.
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
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setEvent(data);
      setLoading(false);

      // Related — same city, other approved upcoming events, not this one.
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
    })();

    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  const attribution = event ? sourceAttribution(event.source) : null;

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
            <div className="l">
              <span>EVENTS</span>
            </div>
          </div>
        </div>

        <section className="ev-sec" style={{ paddingTop: 40 }}>
          <div className="wrap" style={{ maxWidth: 920 }}>
            {loading ? (
              <div className="sd-empty" aria-busy="true">
                <span className="k">Loading event…</span>
              </div>
            ) : notFound ? (
              <div className="sd-empty">
                <span className="k">Event not found</span>
                <p>
                  It may have ended or been removed.{" "}
                  <Link to="/events" style={{ color: "var(--parrot)" }}>
                    Browse upcoming events →
                  </Link>
                </p>
              </div>
            ) : error ? (
              <div className="sd-empty">
                <span className="k">Error</span>
                <p>{error}</p>
              </div>
            ) : event ? (
              <>
                {/* Breadcrumb */}
                <nav
                  aria-label="Breadcrumb"
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--fg-mute)",
                    letterSpacing: ".08em",
                    marginBottom: 24,
                  }}
                >
                  <Link to="/events" style={{ color: "var(--parrot)" }}>
                    EVENTS
                  </Link>
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

                {/* Category kicker */}
                <div className="fmt-line" style={{ marginBottom: 12 }}>
                  <span className="fmt">
                    {(event.relevance_category ?? event.event_type ?? "event").toUpperCase().replace(/_/g, " ")}
                  </span>
                </div>

                {/* Title */}
                <h1
                  className="flag-h"
                  style={{
                    fontSize: "clamp(28px, 3.5vw, 44px)",
                    marginBottom: 20,
                  }}
                >
                  {event.title}
                </h1>

                {/* Metadata row */}
                <div
                  className="mono"
                  style={{
                    fontSize: 12.5,
                    color: "var(--fg-mute)",
                    letterSpacing: ".04em",
                    marginBottom: 32,
                    display: "flex",
                    gap: 24,
                    flexWrap: "wrap",
                    paddingBottom: 20,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span style={{ color: "var(--amber)" }}>{formatFullDateTime(event.starts_at)}</span>
                  <span>
                    {event.is_virtual
                      ? "VIRTUAL"
                      : [event.location, event.city].filter(Boolean).join(" · ").toUpperCase() || "LOCATION TBD"}
                  </span>
                  {attribution && <span style={{ color: "var(--parrot)" }}>{attribution.toUpperCase()}</span>}
                </div>

                {/* Cover image or placeholder */}
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background: "var(--oxford)",
                    overflow: "hidden",
                    position: "relative",
                    marginBottom: 32,
                    borderTop: "2px solid var(--amber)",
                  }}
                >
                  {event.image_url ? (
                    <img
                      src={event.image_url}
                      alt={event.title}
                      loading="lazy"
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <HeroIllustration />
                  )}
                </div>

                {/* Description */}
                {event.description && (
                  <div
                    style={{
                      color: "var(--fg-2)",
                      fontSize: 16,
                      lineHeight: 1.7,
                      marginBottom: 32,
                    }}
                  >
                    {event.description.split(/\n\n+/).map((para, i) => (
                      <p key={i} style={{ marginBottom: 16 }}>
                        {para}
                      </p>
                    ))}
                  </div>
                )}

                {/* CTA */}
                {event.registration_url && (
                  <div style={{ marginBottom: 48 }}>
                    <a
                      href={event.registration_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-block",
                        background: "var(--parrot)",
                        color: "var(--ink)",
                        padding: "14px 32px",
                        fontWeight: 700,
                        fontSize: 14,
                        textDecoration: "none",
                        borderRadius: 4,
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {ctaLabel(event.registration_url)} ↗
                    </a>
                    {event.source_url && event.source_url !== event.registration_url && (
                      <a
                        href={event.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono"
                        style={{
                          marginLeft: 20,
                          color: "var(--fg-mute)",
                          fontSize: 11.5,
                          letterSpacing: ".06em",
                        }}
                      >
                        SOURCE ↗
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </section>

        {/* Related events — same city */}
        {event && event.city && related.length > 0 && (
          <section className="ev-sec" style={{ paddingTop: 32, borderTop: "1px solid var(--line)" }}>
            <div className="wrap">
              <div className="sec-h">
                <h3>More events in {event.city}</h3>
                <Link className="more" to="/events">
                  All events →
                </Link>
              </div>
              <div className="ev-grid">
                {related.map((r) => {
                  const parts = [r.city, r.location, r.is_virtual ? "VIRTUAL" : "IN-PERSON"]
                    .filter(Boolean)
                    .join(" · ")
                    .toUpperCase();
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
