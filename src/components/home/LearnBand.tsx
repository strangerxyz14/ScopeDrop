import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { parseSteps, useLearnBand } from "@/hooks/home/useLearnBand";

function useTermCycle(count: number, intervalMs = 6500): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (count <= 1) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = window.setInterval(() => {
      setI((prev) => (prev + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [count, intervalMs]);
  return i;
}

export function LearnBand() {
  const { tracks, terms } = useLearnBand();
  const activeIdx = useTermCycle(terms.length);

  const featured = tracks[0];
  const featuredSteps = featured ? parseSteps(featured.steps) : [];
  const hasTracks = tracks.length > 0;

  return (
    <section className="learn-sec">
      <div className={`wrap`}>
        <div className={`learn-grid${hasTracks ? "" : " no-tracks"}`}>
          <div className="learn-intro">
            <h3>Learn</h3>
            <h2>Understand every term. Step by step.</h2>
            <p>
              From the first pitch to the first term sheet. One concept at a time, three minutes each. No
              jargon walls.
            </p>
            {hasTracks && (
              <div className="tracks">
                {tracks.slice(0, 4).map((t, i) => {
                  const stepCount = parseSteps(t.steps).length;
                  const num = String(i + 1).padStart(2, "0");
                  return (
                    <Link key={t.id} className="trk" to="/newsletter">
                      <span>
                        <span className="n">{num} · </span>
                        <span className="t">{t.title}</span>
                      </span>
                      <span className="l">{stepCount > 0 ? `${stepCount} STEPS` : "IN PROGRESS"}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {hasTracks && featured && (
            <div>
              <h3 className="trk-side-h">{featured.title} — up next</h3>
              {featuredSteps.length > 0 ? (
                <div className="trk-list">
                  {featuredSteps.slice(0, 5).map((s, i) => (
                    <div key={`${s.title}-${i}`} className={`step${s.done ? " done" : ""}`}>
                      <span className="num">{s.done ? "✓" : String(i + 1).padStart(2, "0")}</span>
                      <span className="t">{s.title}</span>
                      {s.minutes ? <span className="len">{s.minutes} MIN</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sd-empty">
                  <span className="k">Steps forthcoming</span>
                  <p>The Founder Track is being written.</p>
                </div>
              )}
            </div>
          )}

          <aside className="term-side">
            <h4>Term of the day</h4>
            {terms.length === 0 ? (
              <div className="termbox">
                <div className="term on">
                  <div className="d" style={{ color: "var(--fg-mute)" }}>
                    Terms are being written. The first will appear here.
                  </div>
                </div>
              </div>
            ) : (
              <div className="termbox">
                {terms.map((t, i) => (
                  <div key={t.id} className={`term${i === activeIdx ? " on" : ""}`}>
                    <div className="w">{t.term}</div>
                    <div className="d">{t.short_definition}</div>
                  </div>
                ))}
              </div>
            )}
            <Link className="cta" to="/newsletter">
              See all terms →
            </Link>
          </aside>
        </div>
      </div>
    </section>
  );
}
