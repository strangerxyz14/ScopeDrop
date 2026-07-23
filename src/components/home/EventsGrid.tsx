import { useState } from "react";
import { Link } from "react-router-dom";
import { GEO_TABS, useUpcomingEvents } from "@/hooks/home/useUpcomingEvents";
import { formatEventDate } from "./utils";

export function EventsGrid() {
  const [geoKey, setGeoKey] = useState<string>("delhi-ncr");
  const { data: rows = [], isLoading } = useUpcomingEvents(geoKey, 6);
  const { data: globalRows = [] } = useUpcomingEvents("global", 1);

  const showEmptyForCity = !isLoading && rows.length === 0 && geoKey !== "global";
  const showEmptyForAll = !isLoading && rows.length === 0 && geoKey === "global";
  const cityTab = GEO_TABS.find((t) => t.key === geoKey);

  return (
    <section className="ev-sec">
      <div className="wrap">
        <div className="sec-h">
          <h3>
            Events near you
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
          <Link className="more" to="/events">
            All events →
          </Link>
        </div>

        {isLoading ? (
          <div className="ev-grid" aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="ev">
                <div className="sd-skel" style={{ height: 60 }}></div>
              </div>
            ))}
          </div>
        ) : showEmptyForAll ? (
          <div className="sd-empty">
            <span className="k">No upcoming events tracked</span>
            <p>
              Events populate as they're added.{" "}
              <Link to="/events" style={{ color: "var(--parrot)" }}>
                Submit an event →
              </Link>
            </p>
          </div>
        ) : showEmptyForCity ? (
          <div className="sd-empty">
            <span className="k">
              No upcoming events in {cityTab?.label ?? "this city"}
            </span>
            <p>
              {globalRows.length > 0 ? (
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
                <>Check back soon.</>
              )}
            </p>
          </div>
        ) : (
          <div className="ev-grid">
            {rows.map((e) => {
              const parts = [e.city, e.location, e.is_virtual ? "VIRTUAL" : "IN-PERSON"]
                .filter(Boolean)
                .join(" · ")
                .toUpperCase();
              const content = (
                <>
                  <div className="d">{formatEventDate(e.starts_at)}</div>
                  <h4>{e.title}</h4>
                  {parts && <div className="loc">{parts}</div>}
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
              // No external URL → link to the events page (same-app navigation, new UI).
              return (
                <Link key={e.id} className="ev" to="/events">
                  {content}
                </Link>
              );
            })}
          </div>
        )}

        <div className="ev-note">
          EVENTS SOURCED FROM PARTNER CALENDARS AND SUBMITTED LISTINGS ·{" "}
          <Link to="/events" style={{ color: "var(--parrot)" }}>
            SUBMIT AN EVENT →
          </Link>
        </div>
      </div>
    </section>
  );
}
