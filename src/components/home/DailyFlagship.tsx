import { Link } from "react-router-dom";
import { useDailyFlagship } from "@/hooks/home/useDailyFlagship";
import { HeroIllustration } from "./HeroIllustration";
import { bylineFromArticle, estimateReadTime, kickerFromArticle } from "./utils";

export function DailyFlagship() {
  const { data, isLoading } = useDailyFlagship();
  const article = data?.article ?? null;
  const isYesterday = data?.isYesterday ?? false;

  if (isLoading) {
    return (
      <section className="hero" aria-busy="true">
        <div className="wrap hg">
          <div className="hero-text">
            <div>
              <div className="fmt-line">
                <span className="fmt">Flagship</span>
                <span className="div"></span>
                <span className="num">Loading…</span>
              </div>
              <h1 className="flag-h">&nbsp;</h1>
              <p className="dek">&nbsp;</p>
            </div>
          </div>
          <div className="hero-illus">
            <div className="amber-rule"></div>
            <HeroIllustration />
          </div>
        </div>
      </section>
    );
  }

  if (!article) {
    return (
      <section className="hero">
        <div className="wrap hg">
          <div className="hero-text">
            <div>
              <div className="fmt-line">
                <span className="fmt">Flagship</span>
                <span className="div"></span>
                <span className="num">Awaiting today's edition</span>
              </div>
              <h1 className="flag-h">Today's flagship publishes at 06:00 IST.</h1>
              <p className="dek">The Decode Desk is preparing this edition.</p>
            </div>
            <div>
              <div className="byline-row">
                <div className="byline">
                  By <b>The ScopeDrop Desk</b>
                </div>
              </div>
            </div>
          </div>
          <div className="hero-illus">
            <div className="amber-rule"></div>
            <HeroIllustration />
            <div className="cred">Illustration · The ScopeDrop Desk</div>
          </div>
        </div>
      </section>
    );
  }

  const kicker = kickerFromArticle(article);
  const byline = bylineFromArticle(article);
  const readTime = estimateReadTime(article.content_html, article.read_time_minutes);
  const numLabel = isYesterday ? "Yesterday's flagship" : "Today's flagship";
  const to = `/article/${article.id}`;

  return (
    <section className="hero">
      <div className="wrap hg">
        <div className="hero-text">
          <div>
            <div className="fmt-line">
              <span className="fmt">{kicker.text}</span>
              <span className="div"></span>
              <span className="num">{numLabel}</span>
            </div>
            <Link to={to}>
              <h1 className="flag-h">{article.headline}</h1>
            </Link>
            <p className="dek">{article.summary}</p>
          </div>
          <div>
            {article.tags && article.tags.length > 0 && (
              <div className="chips">
                {article.tags.slice(0, 4).map((t) => (
                  <span key={t} className="chip">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <div className="byline-row">
              <div className="byline">
                By <b>{byline}</b> &nbsp;·&nbsp; <em>{readTime} min read</em>
              </div>
              {article.published_at && (
                <div className="byline">
                  Published{" "}
                  {new Date(article.published_at).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="hero-illus">
          <div className="amber-rule"></div>
          {article.image_url ? (
            <img src={article.image_url} alt={article.headline} loading="lazy" />
          ) : (
            <HeroIllustration />
          )}
          <div className="cred">Illustration · {byline}</div>
        </div>
      </div>
    </section>
  );
}
