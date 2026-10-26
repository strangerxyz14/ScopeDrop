// ============================================================
// PageShell — the v-g frame (header, footer, back-to-top) for the
// pages the site header links to, plus the listing head and a story
// grid, so each page only supplies its own content.
// ============================================================
import { useRef, type ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { BackToTop } from "./BackToTop";
import { StoryCard, type StoryArticle } from "./StoryCards";
import { useRevealAll } from "@/hooks/home/useRevealAll";
import "./theme.css";
import "./pages.css";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="sdvg">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <BackToTop />
    </div>
  );
}

/** Kicker, h1 and dek under the fixed header; extra controls go in children. */
export function PageHead({
  kicker,
  title,
  dek,
  children,
}: {
  kicker: string;
  title: string;
  dek?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="st-head">
      <div className="wrap">
        <span className="kick">{kicker}</span>
        <h1>{title}</h1>
        {dek && <p>{dek}</p>}
        {children}
      </div>
    </header>
  );
}

/** Story cards in the 3-column listing grid, with loading, error and empty states. */
export function StoryGrid({
  rows,
  isLoading,
  error,
  emptyLabel,
}: {
  rows: StoryArticle[] | undefined;
  isLoading: boolean;
  error?: unknown;
  emptyLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useRevealAll(ref, [rows?.length]);

  if (isLoading) {
    return (
      <div className="st-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="sd-skel" style={{ height: 280 }} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className="sd-empty">
        <span className="k">Couldn't load stories</span>
        <p>Refresh the page to try again.</p>
      </div>
    );
  }
  if (!rows || rows.length === 0) {
    return (
      <div className="sd-empty">
        <span className="k">{emptyLabel}</span>
        <p>The feed populates as stories publish. Check back soon.</p>
      </div>
    );
  }
  return (
    <div className="st-grid" ref={ref}>
      {rows.map((a) => (
        <StoryCard key={a.id} article={a} />
      ))}
    </div>
  );
}
