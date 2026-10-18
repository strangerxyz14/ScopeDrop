// ============================================================
// ArticleView — /article/:id, in the home v-g design system.
// Single reading column (kicker → headline → dek → byline), a wide
// hero image, the sanitized article body, tags, then "Keep reading"
// with the latest stories from the same category.
// ============================================================
import { useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { SiteHeader } from "@/components/home/SiteHeader";
import { SiteFooter } from "@/components/home/SiteFooter";
import { BackToTop } from "@/components/home/BackToTop";
import { StoryCard, StoryThumb } from "@/components/home/StoryCards";
import { useRevealAll } from "@/hooks/home/useRevealAll";
import { bylineFromArticle, estimateReadTime, kickerFromArticle } from "@/components/home/utils";
import { useArticle, useRelatedStories } from "@/hooks/home/useStories";
import { sanitizeHtml } from "@/utils/sanitize";
import "@/components/home/theme.css";

function formatPublished(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  return d
    .toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    .toUpperCase();
}

function categoryLabel(category: string): string {
  return category.length <= 3 ? category.toUpperCase() : category.charAt(0).toUpperCase() + category.slice(1);
}

const ArticleView = () => {
  const { id } = useParams<{ id: string }>();
  const { data: article, isLoading, error } = useArticle(id);
  const { data: related = [] } = useRelatedStories(article);
  const relatedRef = useRef<HTMLDivElement>(null);
  useRevealAll(relatedRef, [related]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const bodyHtml = useMemo(() => sanitizeHtml(article?.content_html), [article?.content_html]);

  const shell = (children: React.ReactNode) => (
    <div className="sdvg">
      <SEO
        title={article ? `${article.headline} — ScopeDrop` : "Story — ScopeDrop"}
        description={article?.summary ?? "Startup, tech, and AI intelligence from ScopeDrop."}
        keywords={article?.tags ?? []}
        image={article?.image_url ?? undefined}
        type="article"
      />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <BackToTop />
    </div>
  );

  if (isLoading) {
    return shell(
      <div className="ar-top">
        <div className="wrap">
          <div className="ar-col" aria-busy="true">
            <div className="sd-skel" style={{ height: 14, width: 120, marginBottom: 18 }} />
            <div className="sd-skel" style={{ height: 44, marginBottom: 12 }} />
            <div className="sd-skel" style={{ height: 44, width: "70%", marginBottom: 24 }} />
            <div className="sd-skel" style={{ height: 320 }} />
          </div>
        </div>
      </div>,
    );
  }

  if (error || !article) {
    return shell(
      <div className="ar-top">
        <div className="wrap" style={{ paddingBottom: 80 }}>
          <div className="sd-empty">
            <span className="k">{error ? "Couldn't load this story" : "Story not found"}</span>
            <p>
              It may have been moved or unpublished.{" "}
              <Link to="/startups/news" style={{ color: "var(--parrot)" }}>
                Browse all stories →
              </Link>
            </p>
          </div>
        </div>
      </div>,
    );
  }

  const kicker = kickerFromArticle(article);
  const byline = bylineFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  const tags = (article.tags ?? []).filter(Boolean);

  return shell(
    <>
      <div className="ar-top">
        <div className="wrap">
          <div className="ar-col">
            <nav aria-label="Breadcrumb" className="crumb">
              <Link to="/startups/news">STORIES</Link>
              <span className="sep">/</span>
              <Link to={`/startups/news?c=${encodeURIComponent(article.category)}`}>
                {categoryLabel(article.category).toUpperCase()}
              </Link>
            </nav>
            <span className={`kick${kicker.isAcq ? " acq" : ""}`}>{kicker.text}</span>
            <h1 className="ar-h1">{article.headline}</h1>
            {article.summary && <p className="ar-dek">{article.summary}</p>}
            <div className="ar-meta byline">
              <span>
                BY <b>{byline.toUpperCase()}</b>
              </span>
              <span>{formatPublished(article.published_at ?? article.created_at)}</span>
              <span>
                <em>{readTime} MIN READ</em>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="wrap">
        <figure className="ar-hero">
          <StoryThumb src={article.image_url} alt={article.headline} />
        </figure>

        <div className="ar-col">
          {bodyHtml.trim() ? (
            <article className="ar-body" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          ) : (
            <div className="sd-empty">
              <span className="k">Still processing</span>
              <p>This story's full text is still being written. Check back shortly.</p>
            </div>
          )}

          {tags.length > 0 && (
            <div className="ar-tags">
              <span className="lbl">FILED UNDER</span>
              <div className="chips" style={{ marginTop: 0 }}>
                {tags.map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="flow-sec ar-related">
          <div className="wrap">
            <div className="sec-h">
              <h3>Keep reading</h3>
              <Link className="more" to={`/startups/news?c=${encodeURIComponent(article.category)}`}>
                More in {categoryLabel(article.category)} →
              </Link>
            </div>
            <div className="st-grid" ref={relatedRef}>
              {related.map((a) => (
                <StoryCard key={a.id} article={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>,
  );
};

export default ArticleView;
