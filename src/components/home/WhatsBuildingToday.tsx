import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useFreshFlow } from "@/hooks/home/useFreshFlow";
import { useDailyFlagship } from "@/hooks/home/useDailyFlagship";
import { StoryFlow } from "./StoryCards";
import { useRevealAll } from "@/hooks/home/useRevealAll";

export function WhatsBuildingToday() {
  // One extra row: when the hero falls back to the newest story (no
  // flagship picked), drop it here so it isn't shown twice.
  const { data: fetched = [], isLoading } = useFreshFlow(6);
  const { data: flagship } = useDailyFlagship();
  const heroId = flagship?.kind === "latest" ? flagship.article?.id : undefined;
  const rows = useMemo(() => fetched.filter((r) => r.id !== heroId).slice(0, 5), [fetched, heroId]);
  const containerRef = useRef<HTMLDivElement>(null);
  useRevealAll(containerRef, [rows]);

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
            <StoryFlow rows={rows} />
          </div>
        )}
      </div>
    </section>
  );
}
