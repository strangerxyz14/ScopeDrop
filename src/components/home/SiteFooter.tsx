import { Link } from "react-router-dom";

const READ_LINKS: { label: string; to: string }[] = [
  { label: "Today's flagship", to: "/" },
  { label: "The Decode Desk", to: "/startups/news" },
  { label: "The Pattern Desk", to: "/startups/news" },
  { label: "The Data Desk", to: "/funding" },
  { label: "The Radar Desk", to: "/tech/emerging" },
  { label: "Founder Stories", to: "/founder-stories" },
];

const PLATFORM_LINKS: { label: string; to: string }[] = [
  { label: "Company directory", to: "/directory" },
  { label: "Founder Track", to: "/founder-stories" },
  { label: "Term glossary", to: "/newsletter" },
  { label: "Events near you", to: "/events" },
  { label: "Emerging tech radar", to: "/tech/emerging" },
  { label: "Collections", to: "/market-maps" },
];

const ABOUT_LINKS: { label: string; to: string }[] = [
  { label: "Methodology", to: "/how-we-curate" },
  { label: "Data sources", to: "/how-we-curate" },
  { label: "Submit an event", to: "/events" },
  { label: "Submit a company", to: "/startup-submission" },
  { label: "Press inquiries", to: "/contact" },
  { label: "Contact", to: "/contact" },
];

export function SiteFooter() {
  return (
    <footer className="sd-footer">
      <div className="wrap">
        <div className="ft-grid">
          <div className="ft-about">
            <div className="wm">ScopeDrop</div>
            <div className="tag">THE PULSE OF WHAT'S BUILDING</div>
            <p>
              Startup, tech, and AI intelligence — structured, decoded, and delivered daily. Independent,
              editorially rigorous, and computationally serious.
            </p>
            <Link className="method" to="/how-we-curate">
              ↗ How we work · Methodology
            </Link>
            <div className="socials">
              <a href="https://x.com/" aria-label="X" target="_blank" rel="noopener noreferrer">X</a>
              <a href="https://www.linkedin.com/" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">in</a>
              <a href="https://substack.com/" aria-label="Substack" target="_blank" rel="noopener noreferrer">S</a>
              <a href="/rss.xml" aria-label="RSS">≈</a>
            </div>
          </div>
          <div className="ft-col">
            <h5>Read</h5>
            {READ_LINKS.map((l) => (
              <Link key={l.label} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="ft-col">
            <h5>Platform</h5>
            {PLATFORM_LINKS.map((l) => (
              <Link key={l.label} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div className="ft-col">
            <h5>ScopeDrop</h5>
            {ABOUT_LINKS.map((l) => (
              <Link key={l.label} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="ft-bottom">
          <span>© {new Date().getFullYear()} ScopeDrop. All rights reserved.</span>
          <span className="mono">
            <Link to="/privacy-policy">PRIVACY</Link> · <Link to="/terms">TERMS</Link> ·{" "}
            <a href="/rss.xml">RSS</a> · <Link to="/sitemap">SITEMAP</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
