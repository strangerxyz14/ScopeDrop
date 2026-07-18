import { useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useCapitalRail, type CapitalRailItem } from "@/hooks/home/useCapitalRail";
import {
  formatMoneyShort,
  formatRelativeTime,
  formatRoundType,
} from "./utils";

function useRevealCards<T extends HTMLElement>(container: React.RefObject<T | null>, dep: unknown) {
  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const cards = Array.from(root.querySelectorAll<HTMLElement>(".fcard"));
    if (reduced || typeof IntersectionObserver === "undefined") {
      cards.forEach((el) => el.classList.add("rev"));
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
    cards.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [container, dep]);
}

function Card({ item, maxAmount }: { item: CapitalRailItem; maxAmount: number }) {
  const isAcq = item.event_type === "acquisition" || item.round_type === "acquisition";
  const amt = formatMoneyShort(item.amount_usd);
  const heightPct = maxAmount > 0 && item.amount_usd ? Math.round((item.amount_usd / maxAmount) * 100) : 0;
  const rel = formatRelativeTime(item.announced_at);
  const roundLabel = formatRoundType(item.round_type);
  const sector = item.primary_entity?.sector?.toUpperCase();
  const targetId = item.primary_entity?.id ?? item.primary_entity_id;

  const cardStyle: React.CSSProperties & Record<string, string> = {
    "--h": `${heightPct}%`,
  };

  return (
    <Link
      className={`fcard${item.isNew ? " new-pulse" : ""}`}
      to={targetId ? `/directory?entity=${targetId}` : "/funding"}
      style={cardStyle}
    >
      <span className="bar">
        <i></i>
      </span>
      <span className="fbody">
        <div className="co">{item.primary_entity?.name ?? "—"}</div>
        <div className="tags">
          {roundLabel && (
            <span className={`tag ${isAcq ? "acq-t" : "live"}`}>{roundLabel}</span>
          )}
          {sector && <span className="tag">{sector}</span>}
        </div>
        {amt && <div className={`amt${isAcq ? " acq" : ""}`}>{amt}</div>}
        <div className="fmeta">
          {item.one_liner ? item.one_liner.toUpperCase() : ""}
          {rel ? ` · ${rel}` : ""}
        </div>
      </span>
    </Link>
  );
}

function SkeletonCards() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="fcard rev" style={{ ["--h" as string]: "0%" } as React.CSSProperties}>
          <span className="bar">
            <i></i>
          </span>
          <span className="fbody">
            <div className="co" style={{ color: "var(--fg-mute)" }}>—</div>
            <div className="fmeta" style={{ marginTop: 4 }}>AWAITING SIGNAL</div>
          </span>
        </div>
      ))}
    </>
  );
}

export function CapitalRail() {
  const { data, isLoading } = useCapitalRail();
  const railRef = useRef<HTMLDivElement>(null);

  const maxAmount = useMemo(
    () => data.reduce((m, r) => Math.max(m, r.amount_usd ?? 0), 0),
    [data],
  );

  useRevealCards(railRef, data.length);

  return (
    <section className="rail-sec">
      <div className="wrap">
        <div className="rail-head">
          <h3>
            <span className="pd" aria-hidden="true"></span> Capital events · live
          </h3>
          <span className="note">
            BAR HEIGHT = ROUND SIZE VS LARGEST · UPDATES IN REAL TIME
          </span>
        </div>
        <div className="rail" ref={railRef}>
          {isLoading || data.length === 0 ? <SkeletonCards /> : data.map((r) => (
            <Card key={r.id} item={r} maxAmount={maxAmount} />
          ))}
        </div>
        {!isLoading && data.length === 0 && (
          <p className="ev-note" style={{ marginTop: 16 }}>
            Capital events populate here as rounds are tracked.
          </p>
        )}
      </div>
    </section>
  );
}
