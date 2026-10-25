// ─────────────────────────────────────────────────────────────
// Section router: picks articles.category for a story.
//
// The section used to come from the copywriting call (temperature 0.7,
// no section definitions, any string accepted). That's how executive
// pay ended up under Funding and why ~40 junk categories exist. Routing
// is now its own step, cheapest and most certain first:
//   1. Rules: extract-structured recorded a funding round or an
//      M&A/IPO event for the signal → funding / acquisitions.
//   2. LLM: TASK.CLASSIFY at temperature 0 over the SOURCE headline and
//      text (not the rewrite), with section definitions, precedence
//      rules and examples. The output is validated against SECTIONS.
//   3. Fallback when the LLM fails: the legacy category if it maps,
//      else "startups". Always status "review" so route-section retries.
//      rateLimited marks a fallback caused by a 429/cooldown, so
//      route-section can stop instead of writing it.
// Below REVIEW_CONFIDENCE, the decision is kept but marked "review".
//
// legacyDecision() is a fourth, free path that route-section uses for old
// articles: keep the existing category when it maps to a section.
//
// Used by generate-content (new articles) and route-section (reruns).
// ─────────────────────────────────────────────────────────────
import { callLLM, type Priority, TASK } from "./llm.ts";
import { isSectionKey, normalizeSection, SECTION_KEYS, SECTIONS, type SectionKey } from "./sections.ts";

// Bump when the prompt, examples or rules change. A bump only labels new
// decisions: route-section no longer reruns everything with an older
// version (on 2026-10-24 that meant ~1,000 LLM calls per bump and used up
// Groq's daily tokens). Re-route deliberately with route-section {"ids": …}.
export const ROUTER_VERSION = "2026-10-25.3";
export const REVIEW_CONFIDENCE = 0.7;
const SOURCE_CHARS = 1500;

// raw_signals.classifier_verdict, written by extract-structured. Only
// the bare "funding" / "acquisition" values mean an event was recorded;
// "*_unconfirmed" means the classifier said so but extraction failed.
export type ClassifierVerdict =
  | "funding"
  | "acquisition"
  | "funding_unconfirmed"
  | "acquisition_unconfirmed"
  | "narrative";

export interface RouteInput {
  /** Source headline (raw_signals.title), not the generated one. */
  headline: string;
  /** Source text; HTML is stripped here. */
  body: string;
  verdict?: string | null;
  /** Legacy articles.category, used only when the LLM fails. */
  fallback?: string | null;
  /** Budget priority for the LLM call; route-section passes "backfill". */
  priority?: Priority;
}

export interface SectionDecision {
  section: SectionKey;
  secondary: SectionKey | null;
  confidence: number;
  /** classifier = picked by extract-structured's relevance call (one LLM call for both). */
  source: "rule" | "llm" | "classifier" | "fallback" | "legacy";
  reason: string;
  status: "routed" | "review";
  version: string;
  /** Set on a fallback caused by a rate limit; not written to the DB. */
  rateLimited?: boolean;
}

/** Columns route-section and generate-content write on articles. */
export function decisionColumns(d: SectionDecision) {
  return {
    category: d.section,
    section_secondary: d.secondary,
    section_confidence: d.confidence,
    section_source: d.source,
    section_reason: d.reason,
    section_status: d.status,
    router_version: d.version,
  };
}

export function sourceText(raw: string): string {
  return raw
    .replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, SOURCE_CHARS);
}

export function ruleSection(verdict: string | null | undefined): SectionKey | null {
  if (verdict === "funding") return "funding";
  if (verdict === "acquisition") return "acquisitions";
  return null;
}

/**
 * Section definitions, tie-break rules and examples. Shared by the router
 * prompt below and extract-structured's relevance call (which picks the
 * section in the same request), so both decide the same way.
 */
export const SECTION_GUIDE = `Sections:
${SECTION_KEYS.map((k) => `- ${k}: ${SECTIONS[k].definition}`).join("\n")}

When a story fits more than one section:
1. A named company announcing its own funding round is "funding", even when it is an AI company.
2. An acquisition, merger, IPO or listing is "acquisitions".
3. Otherwise pick what the story is mainly about, and put the runner-up in "secondary".
Executive pay, public-company valuations and stock moves are "markets", not "funding". A model or product release by an AI lab is "ai". A product launch by any other startup is "startups", even when the product is built on AI. A launch by an established developer-tools, cloud or security company is "tech". Layoffs and shutdowns at startups are "startups".

Examples:
"Mistral raises €600M Series C led by General Catalyst" -> funding
"Ramp closes a $150M venture debt facility" -> funding
"Salesforce agrees to buy Informatica for $8B" -> acquisitions
"Figma files for an IPO on the NYSE" -> acquisitions
"OpenAI releases a new reasoning model" -> ai
"GPU shortage pushes up AI cloud rental prices" -> ai
"Y Combinator cuts its batch size" -> startups
"Fintech startup Bench shuts down abruptly" -> startups
"A seed-stage startup launches an AI agent for sales teams" -> startups
"Apple's services revenue hits a record in Q3" -> markets
"A chipmaker's CEO pay package is disclosed in its proxy filing" -> markets
"EU fines Meta under the Digital Markets Act" -> policy
"US tightens export controls on AI chips to China" -> policy
"Google limits free access to its top Gemini models" -> ai
"Vercel ships a new edge runtime for Next.js" -> tech
"CrowdStrike outage grounds airlines worldwide" -> tech`;

const ROUTER_SYSTEM = `You route news stories into exactly one section of ScopeDrop, a news product for startup founders and investors.

${SECTION_GUIDE}

Output ONLY a JSON object: {"section": "<key>", "secondary": "<key>" or null, "confidence": <number from 0 to 1>, "reason": "<at most 20 words>"}`;

function verdictHint(verdict: string | null | undefined): string {
  if (verdict === "funding_unconfirmed") return "An upstream classifier thought this is a funding round, but no round could be extracted.";
  if (verdict === "acquisition_unconfirmed") return "An upstream classifier thought this is an acquisition or IPO, but no deal could be extracted.";
  return "";
}

type SectionFields = Omit<SectionDecision, "source" | "status" | "version" | "rateLimited">;

/** Validates section / secondary / confidence / reason from any model output. */
export function sectionFields(raw: { section?: unknown; secondary?: unknown; confidence?: unknown; reason?: unknown } | null | undefined): SectionFields | null {
  const section = typeof raw?.section === "string" ? raw.section.trim().toLowerCase() : "";
  if (!isSectionKey(section)) return null;
  const secondaryRaw = typeof raw?.secondary === "string" ? raw.secondary.trim().toLowerCase() : "";
  const secondary = isSectionKey(secondaryRaw) && secondaryRaw !== section ? secondaryRaw : null;
  const conf = Number(raw?.confidence);
  return {
    section,
    secondary,
    confidence: Number.isFinite(conf) ? Math.min(1, Math.max(0, conf)) : 0.5,
    reason: String(raw?.reason ?? "").slice(0, 200),
  };
}

export function parseRouterOutput(text: string): SectionFields | null {
  try {
    return sectionFields(JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch {
    return null;
  }
}

function ruleDecision(section: SectionKey): SectionDecision {
  return {
    section,
    secondary: null,
    confidence: 1,
    source: "rule",
    status: "routed",
    reason: section === "funding" ? "funding round recorded by extract-structured" : "M&A/IPO event recorded by extract-structured",
    version: ROUTER_VERSION,
  };
}

/**
 * The section extract-structured's relevance call already picked (stored
 * on raw_signals.classifier_section*), so generate-content can skip its
 * own router call. A recorded funding/M&A event still wins. Null when the
 * classifier gave no valid section; the caller then runs routeSection().
 */
export function classifierDecision(input: {
  verdict?: string | null;
  section?: string | null;
  secondary?: string | null;
  confidence?: number | null;
  reason?: string | null;
}): SectionDecision | null {
  const ruled = ruleSection(input.verdict);
  if (ruled) return ruleDecision(ruled);
  const fields = sectionFields(input);
  if (!fields) return null;
  return {
    ...fields,
    source: "classifier",
    status: fields.confidence >= REVIEW_CONFIDENCE ? "routed" : "review",
    version: ROUTER_VERSION,
  };
}

/**
 * Free routing for old articles: keep the existing category when it maps
 * to a section. Null when it doesn't (e.g. "fashion"); those need the LLM.
 */
export function legacyDecision(category: string | null | undefined): SectionDecision | null {
  const section = normalizeSection(category);
  if (!section) return null;
  return {
    section,
    secondary: null,
    // The copywriting call's guess, never checked; not a measured value.
    confidence: 0.5,
    source: "legacy",
    status: "routed",
    reason: `kept legacy category "${category}"`,
    version: ROUTER_VERSION,
  };
}

export async function routeSection(input: RouteInput): Promise<SectionDecision> {
  const base = { version: ROUTER_VERSION };

  const ruled = ruleSection(input.verdict);
  if (ruled) return ruleDecision(ruled);

  const user = [
    `Headline: ${input.headline.trim()}`,
    `Text: ${sourceText(input.body)}`,
    verdictHint(input.verdict),
  ].filter(Boolean).join("\n");

  let rateLimited = false;
  try {
    const res = await callLLM(TASK.CLASSIFY, ROUTER_SYSTEM, user, {
      jsonMode: true, maxTokens: 120, temperature: 0, priority: input.priority ?? "router",
    });
    const parsed = parseRouterOutput(res.content);
    if (parsed) {
      return {
        ...base,
        ...parsed,
        source: "llm",
        status: parsed.confidence >= REVIEW_CONFIDENCE ? "routed" : "review",
      };
    }
    console.warn("section-router: unusable LLM output:", res.content.slice(0, 200));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // callLLM lists each chain entry's error: "…:429 {…}", "…:cooldown",
    // or "…:budget" (the allocator held the call back).
    rateLimited = /:429\b|:cooldown\b|:budget\b/.test(msg);
    console.warn("section-router: LLM failed:", msg);
  }

  return {
    ...base,
    section: normalizeSection(input.fallback) ?? "startups",
    secondary: null,
    confidence: 0,
    source: "fallback",
    status: "review",
    reason: rateLimited ? "router LLM rate limited" : "router LLM unavailable or invalid output",
    ...(rateLimited ? { rateLimited } : {}),
  };
}
