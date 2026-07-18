import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Design nav labels vs. what routes actually exist in this app:
 *   News       → /startups/news
 *   Funding    → /funding
 *   Companies  → /directory  (no /companies route; nearest is directory)
 *   Learn      → /newsletter (no learn page; routes to newsletter until built)
 *   Events     → /events
 *   Sign in    → /newsletter?from=signin  (no /signin route)
 * These map to real, non-broken destinations only.
 */
const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "News", to: "/startups/news" },
  { label: "Funding", to: "/funding" },
  { label: "Companies", to: "/directory" },
  { label: "Learn", to: "/newsletter" },
  { label: "Events", to: "/events" },
];

const MORE_ITEMS: { label: string; to: string }[] = [
  { label: "Acquisitions", to: "/acquisitions" },
  { label: "Emerging Tech Radar", to: "/tech/emerging" },
  { label: "Founder Stories", to: "/founder-stories" },
  { label: "Collections", to: "/market-maps" },
  { label: "Methodology", to: "/how-we-curate" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`sd-header${scrolled ? " scrolled" : ""}`}>
      <div className="wrap hd">
        <Link className="wm" to="/" aria-label="ScopeDrop home">
          ScopeDrop
        </Link>
        <nav className="nav" aria-label="Primary">
          {NAV_ITEMS.map((n) => (
            <Link key={n.label} to={n.to}>
              {n.label}
            </Link>
          ))}
          <div className="more">
            <Link to="/directory" aria-haspopup="true">More ▾</Link>
            <div className="dropdown" role="menu">
              {MORE_ITEMS.map((n) => (
                <Link key={n.label} to={n.to} role="menuitem">
                  {n.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="hd-right">
          <Link className="hd-search" to="/search" aria-label="Search">
            <span aria-hidden="true">⌕</span>&nbsp;Search
            <span className="k">⌘K</span>
          </Link>
          <Link className="hd-signin" to="/newsletter?from=signin">
            Sign in
          </Link>
          <Link className="hd-cta" to="/newsletter">
            Get Your Scope
          </Link>
        </div>
      </div>
    </header>
  );
}
