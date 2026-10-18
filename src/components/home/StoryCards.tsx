// ============================================================
// Story cards shared by the home "What's building today" flow and
// the /startups/news listing, so both surfaces render articles the
// same way: kicker → headline → dek → mono meta line.
// ============================================================
import { useState } from "react";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import { LeadThumbFallback } from "./HeroIllustration";
import { bylineFromArticle, estimateReadTime, formatRelativeTime, kickerFromArticle } from "./utils";

export type StoryArticle = Database["public"]["Tables"]["articles"]["Row"];

/** Image with the brand illustration as fallback when the URL is missing or 404s. */
export function StoryThumb({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <LeadThumbFallback />;
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function storyTime(a: StoryArticle): string {
  return formatRelativeTime(a.published_at ?? a.created_at);
}

export function StoryLead({ article }: { article: StoryArticle }) {
  const kicker = kickerFromArticle(article);
  const byline = bylineFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  return (
    <Link className="f-lead f-item" to={`/article/${article.id}`}>
      <div className="thumb">
        <StoryThumb src={article.image_url} alt={article.headline} />
      </div>
      <div>
        <span className={`kick${kicker.isAcq ? " acq" : ""}`}>{kicker.text}</span>
        <h4>{article.headline}</h4>
        <p className="dek-sm">{article.summary}</p>
        <div className="byline st-meta">
          BY {byline.toUpperCase()} · {readTime} MIN · {storyTime(article)}
        </div>
      </div>
    </Link>
  );
}

export function StorySide({
  article,
  hideTopBorder,
}: {
  article: StoryArticle;
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
        {byline.replace(/^The /, "").toUpperCase()} · {readTime} MIN · {storyTime(article)}
      </div>
    </Link>
  );
}

/** Thumbnail card for grids below the lead flow. */
export function StoryCard({ article }: { article: StoryArticle }) {
  const kicker = kickerFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  return (
    <Link className="st-card f-item" to={`/article/${article.id}`}>
      <div className="thumb">
        <StoryThumb src={article.image_url} alt={article.headline} />
      </div>
      <span className={`kick${kicker.isAcq ? " acq" : ""}`}>{kicker.text}</span>
      <h4>{article.headline}</h4>
      {article.summary && <p className="dek-sm">{article.summary}</p>}
      <div className="m">
        {storyTime(article)} · {readTime} MIN
      </div>
    </Link>
  );
}

/** Lead + four side cards: the home flow layout. Expects up to 5 rows. */
export function StoryFlow({ rows }: { rows: StoryArticle[] }) {
  return (
    <>
      {rows[0] && <StoryLead article={rows[0]} />}
      {rows.slice(1, 3).map((a) => (
        <StorySide key={a.id} article={a} hideTopBorder />
      ))}
      {rows.slice(3, 5).map((a) => (
        <StorySide key={a.id} article={a} />
      ))}
    </>
  );
}
