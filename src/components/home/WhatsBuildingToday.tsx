import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useFreshFlow, type FreshFlowArticle } from "@/hooks/home/useFreshFlow";
import { LeadThumbFallback } from "./HeroIllustration";
import { bylineFromArticle, estimateReadTime, kickerFromArticle } from "./utils";

function useRevealAll<T extends HTMLElement>(container: React.RefObject<T | null>) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const items = Array.from(root.querySelectorAll<HTMLElement>(".f-item"));
    if (reduced || typeof IntersectionObserver === "undefined") {
      items.forEach((el) => el.classList.add("rev"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("rev");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [container]);
}

function LeadCard({ article }: { article: FreshFlowArticle }) {
  const kicker = kickerFromArticle(article);
  const byline = bylineFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  return (
    <Link className="f-lead f-item" to={`/article/${article.id}`}>
      <div className="thumb">
        {article.image_url ? (
          <img src={article.image_url} alt={article.headline} loading="lazy" />
        ) : (
          <LeadThumbFallback />
        )}
      </div>
      <div>
        <span className={`kick${kicker.isAcq ? " acq" : ""}`}>{kicker.text}</span>
        <h4>{article.headline}</h4>
        <p className="dek-sm">{article.summary}</p>
        <div
          className="byline"
          style={{
            marginTop: 14,
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: "10.5px",
            letterSpacing: ".06em",
          }}
        >
          BY {byline.toUpperCase()} · {readTime} MIN
        </div>
      </div>
    </Link>
  );
}

function SideCard({
  article,
  hideTopBorder,
}: {
  article: FreshFlowArticle;
  hideTopBorder?: boolean;
}) {
  const kicker = kickerFromArticle(article);
  const byline = bylineFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  return (
    <Link
      className="f-side f-item"
      to={`/article/${article.id}`}
      style={hideTopBorder ? { borderTop: 0, paddingTop: 0 } : undefined}
    >
      <span className={`kick${kicker.isAcq ? " acq" : ""}`}>{kicker.text}</span>
      <h4>{article.headline}</h4>
      <p className="dek-sm">{article.summary}</p>
      <div className="m">
        {byline.replace(/^The /, "").toUpperCase()} · {readTime} MIN
      </div>
    </Link>
  );
}

export function WhatsBuildingToday() {
  const { data: rows = [], isLoading } = useFreshFlow(5);
  const containerRef = useRef<HTMLDivElement>(null);
  useRevealAll(containerRef);

  return (
    <section className="flow-sec">
      <div className="wrap">
        <div className="sec-h">
          <h3>What's building today</h3>
          <Link className="more" to="/startups/news">
            All stories →
          </Link>
        </div>
        {isLoading ? (
          <div className="flow" ref={containerRef} aria-busy="true">
            <div className="f-lead f-item">
              <div className="thumb sd-skel"></div>
            </div>
            <div className="f-side f-item" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="sd-skel" style={{ height: 80 }}></div>
            </div>
            <div className="f-side f-item" style={{ borderTop: 0, paddingTop: 0 }}>
              <div className="sd-skel" style={{ height: 80 }}></div>
            </div>
            <div className="f-side f-item">
              <div className="sd-skel" style={{ height: 80 }}></div>
            </div>
            <div className="f-side f-item">
              <div className="sd-skel" style={{ height: 80 }}></div>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="sd-empty">
            <span className="k">The feed populates as stories publish</span>
            <p>Check back soon.</p>
          </div>
        ) : (
          <div className="flow" ref={containerRef}>
            {rows[0] && <LeadCard article={rows[0]} />}
            {rows.slice(1, 3).map((a, i) => (
              <SideCard key={a.id} article={a} hideTopBorder={i < 2} />
            ))}
            {rows.slice(3, 5).map((a) => (
              <SideCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
