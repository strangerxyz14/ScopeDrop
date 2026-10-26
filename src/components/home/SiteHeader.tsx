import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./pages.css";

/**
 * Every destination here renders in the v-g design:
 *   News         → /startups/news (All stories)
 *   Funding      → /startups/news?c=funding (the old /funding redirects there)
 *   Companies    → /directory
 *   Learn        → /learn (tracks + glossary)
 *   Events       → /events
 *   Acquisitions → /startups/news?c=acquisitions (the old /acquisitions redirects there)
 *   Sign in      → /newsletter?from=signin  (no reader sign-in page yet)
 */
const NAV_ITEMS: { label: string; to: string }[] = [
  { label: "News", to: "/startups/news" },
  { label: "Funding", to: "/startups/news?c=funding" },
  { label: "Companies", to: "/directory" },
  { label: "Learn", to: "/learn" },
  { label: "Events", to: "/events" },
];

const MORE_ITEMS: { label: string; to: string }[] = [
  { label: "Acquisitions", to: "/startups/news?c=acquisitions" },
  { label: "Emerging Tech Radar", to: "/tech/emerging" },
  { label: "Founder Stories", to: "/founder-stories" },
  { label: "Collections", to: "/market-maps" },
  { label: "Methodology", to: "/how-we-curate" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Land each new page at the top (the router doesn't), and close the
  // mobile menu on any navigation, including ?c= links to the same page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className={`sd-header${scrolled || menuOpen ? " scrolled" : ""}`}>
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
            <button type="button" className="more-btn" aria-haspopup="true">
              More
              <span className="caret" aria-hidden="true">▾</span>
            </button>
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
          <button
            type="button"
            className="hd-burger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="sd-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="sd-mobile-menu" className="m-menu" aria-label="Mobile">
          <div className="wrap">
            {NAV_ITEMS.map((n) => (
              <Link key={n.label} to={n.to}>
                {n.label}
              </Link>
            ))}
            <span className="m-h">More</span>
            {MORE_ITEMS.map((n) => (
              <Link key={n.label} to={n.to}>
                {n.label}
              </Link>
            ))}
            <Link to="/search">Search</Link>
            <div className="m-cta">
              <Link className="hd-cta" to="/newsletter">
                Get Your Scope
              </Link>
              <Link className="hd-signin" to="/newsletter?from=signin">
                Sign in
              </Link>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
