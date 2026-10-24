// ─────────────────────────────────────────────────────────────
// ScopeDrop's sections: the one place they are defined.
//
// articles.category holds one of these keys. The pipeline
// (section-router.ts, generate-content, route-section) and the site
// (src/services/sectionFeed.ts, the All stories tabs) import this file,
// so a section can't exist on one side only. Until 2026-10 the generator
// could only emit funding|ai|markets|startups|policy, while /acquisitions
// and /tech/* queried values nothing produced.
//
// Pure module (no Deno or browser APIs) so both sides can bundle it.
// ─────────────────────────────────────────────────────────────

export const SECTIONS = {
  startups: {
    label: "Startups",
    definition:
      "The startup ecosystem: startups' product launches (AI-built ones included), pivots, shutdowns, layoffs, founder and executive moves, accelerators and VC firms themselves.",
  },
  ai: {
    label: "AI",
    definition:
      "The AI industry: AI labs and model builders (OpenAI, Anthropic, Google DeepMind, Mistral and peers), model releases, the economics of AI compute and infrastructure, and industry-wide AI trends and safety.",
  },
  funding: {
    label: "Funding",
    definition:
      "A named company announcing a specific funding round: equity, venture debt or a strategic investment.",
  },
  acquisitions: {
    label: "Acquisitions",
    definition: "M&A, acqui-hires, mergers, IPOs and listings, SPACs and tender offers.",
  },
  markets: {
    label: "Markets",
    definition:
      "Big-tech strategy, earnings and revenue, public-market moves of tech companies, competition and market share.",
  },
  policy: {
    label: "Policy",
    definition:
      "Action by governments, regulators or courts aimed at tech: regulation, antitrust, export controls, data-protection rules, government lawsuits and fines. A company changing its own terms, pricing or product access is not policy.",
  },
  tech: {
    label: "Tech",
    definition:
      "Developer tools, cloud, chips and semiconductors, enterprise software and cybersecurity incidents.",
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;

export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

export function isSectionKey(value: unknown): value is SectionKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SECTIONS, value);
}

// Legacy articles.category values seen live (2026-10-25) that clearly
// mean one section. Anything else ("fashion", "wellness", "space") has
// no safe mapping and gets routed from the article text instead.
const ALIASES: Record<string, SectionKey> = {
  "artificial intelligence": "ai",
  "machine learning": "ai",
  genai: "ai",
  startup: "startups",
  founder: "startups",
  fundraising: "funding",
  "venture capital": "funding",
  acquisition: "acquisitions",
  "m&a": "acquisitions",
  merger: "acquisitions",
  ipo: "acquisitions",
  market: "markets",
  stocks: "markets",
  earnings: "markets",
  regulation: "policy",
  legal: "policy",
  privacy: "policy",
  technology: "tech",
  technologies: "tech",
  security: "tech",
  cybersecurity: "tech",
  hardware: "tech",
  semiconductors: "tech",
  cloud: "tech",
};

/**
 * Maps a raw category string to a section key, or null when it has no
 * clear meaning. Handles case, aliases and the generator's old
 * "energy | startups | markets" lists (first part that maps wins).
 */
export function normalizeSection(raw: unknown): SectionKey | null {
  if (typeof raw !== "string") return null;
  for (const part of raw.toLowerCase().split(/[|,/]/)) {
    const key = part.trim();
    if (isSectionKey(key)) return key;
    if (ALIASES[key]) return ALIASES[key];
  }
  return null;
}
