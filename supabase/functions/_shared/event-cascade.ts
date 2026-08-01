// ============================================================
// Three-tier event extraction cascade.
//
//   Tier 1: schema.org Event JSON-LD  (parseEventJsonLd from
//           event-extraction.ts) — deterministic, free, exact.
//   Tier 2: Open Graph + twitter:*    — fills gaps Tier 1 missed.
//   Tier 3: LLM extraction over cleaned page body — only invoked
//           when mandatory fields (title, start_at, organizer,
//           location-or-online) remain unfilled after Tiers 1+2.
//           Routes through callLLM(TASK.EXTRACT_JSON |
//           TASK.EXTRACT_JSON_LONG) — task class picked by
//           estimateTokens on the cleaned body.
//
// This module is the ORCHESTRATOR. It reuses everything in
// event-extraction.ts that was built for the SerpAPI + editorial-
// blog paths (fetchEventPageHtml, parseEventJsonLd,
// extractCoverImageFromHtml, cleanConcatenatedText) so the cascade
// isn't a parallel implementation — it's a compose layer over
// existing extractors plus two genuinely-new helpers (extractOpenGraph,
// cleanHtmlForLlm) and the LLM tier.
// ============================================================

import {
  fetchEventPageHtml,
  parseEventJsonLd,
  extractCoverImageFromHtml,
  extractOrganizerFromHtml,
} from "./event-extraction.ts";
import { callLLM, TASK, estimateTokens } from "./llm.ts";
import {
  EVENT_EXTRACTION_SYSTEM,
  buildEventExtractionUser,
} from "./event-extraction-prompt.ts";

// ------------------------------------------------------------
// Types
// ------------------------------------------------------------
export interface ExtractedLocation {
  is_online: boolean;
  venue: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
}

export interface ExtractedEvent {
  title: string | null;
  start_at: string | null;
  end_at: string | null;
  timezone: string | null;
  organizer_name: string | null;
  organizer_website: string | null;
  organizer_logo_hint: string | null;
  location: ExtractedLocation;
  registration_url: string | null;
  price: { amount: number; currency: string; is_free: boolean } | null;
  source_description: string | null;
  image_candidates: string[];
  event_type: string | null;
  extraction_tier: "json_ld" | "og_meta" | "llm" | "hybrid";
}

export interface ExtractionResult {
  event: ExtractedEvent | null;
  errors: string[];
  fetched_at: string;
}

// ------------------------------------------------------------
// Tier 2 — Open Graph + Twitter card + canonical
// ------------------------------------------------------------
function readMeta(html: string, property: string, kind: "property" | "name" = "property"): string | null {
  // Both attribute orderings — content=... property=... AND property=... content=...
  const rxA = new RegExp(`<meta[^>]+${kind}=["']${property}["'][^>]+content=["']([^"']+)["']`, "i");
  const rxB = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${kind}=["']${property}["']`, "i");
  return html.match(rxA)?.[1]?.trim() ?? html.match(rxB)?.[1]?.trim() ?? null;
}

function resolveAgainst(base: string, maybeRelative: string | null): string | null {
  if (!maybeRelative) return null;
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative.startsWith("http") ? maybeRelative : null;
  }
}

export function extractOpenGraph(html: string, canonicalUrl: string): Partial<ExtractedEvent> {
  const title = readMeta(html, "og:title") ?? readMeta(html, "twitter:title", "name");
  const description = readMeta(html, "og:description") ?? readMeta(html, "twitter:description", "name");
  const rawImg = readMeta(html, "og:image") ?? readMeta(html, "og:image:secure_url") ?? readMeta(html, "twitter:image", "name");
  const image = resolveAgainst(canonicalUrl, rawImg);
  const siteName = readMeta(html, "og:site_name");

  const image_candidates: string[] = [];
  if (image) image_candidates.push(image);
  const scraped = extractCoverImageFromHtml(html);
  if (scraped && scraped !== image) image_candidates.push(scraped);

  const organizer = extractOrganizerFromHtml(html, canonicalUrl);

  return {
    title,
    source_description: description,
    image_candidates,
    organizer_name: organizer.name ?? siteName ?? null,
    organizer_logo_hint: organizer.logoUrl,
  };
}

// ------------------------------------------------------------
// HTML cleaner for LLM ingestion
// ------------------------------------------------------------
export function cleanHtmlForLlm(html: string, maxChars = 24_000): string {
  let text = html;
  // Strip noisy blocks entirely
  text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
  text = text.replace(/<svg[\s\S]*?<\/svg>/gi, "");
  text = text.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
  text = text.replace(/<header[\s\S]*?<\/header>/gi, "");
  text = text.replace(/<aside[\s\S]*?<\/aside>/gi, "");
  text = text.replace(/<link[^>]*>/gi, "");
  text = text.replace(/<meta[^>]*>/gi, "");
  // Prefer <main> or <article> body if present, else full remainder
  const mainMatch = text.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ??
    text.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (mainMatch?.[1]) text = mainMatch[1];
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, " ");
  // Decode common entities
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  if (text.length <= maxChars) return text;
  // Truncate at last complete word boundary
  const truncated = text.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > maxChars * 0.9 ? truncated.slice(0, lastSpace) : truncated;
}

// ------------------------------------------------------------
// Tier 3 — LLM extraction
// ------------------------------------------------------------
async function extractViaLlm(cleanedHtml: string, canonicalUrl: string): Promise<Partial<ExtractedEvent>> {
  const inputTokens = estimateTokens(cleanedHtml);
  const taskClass = inputTokens > 6000 ? TASK.EXTRACT_JSON_LONG : TASK.EXTRACT_JSON;

  const result = await callLLM(
    taskClass,
    EVENT_EXTRACTION_SYSTEM,
    buildEventExtractionUser(cleanedHtml, canonicalUrl),
    { jsonMode: true, maxTokens: 1500, temperature: 0 },
  );

  // deno-lint-ignore no-explicit-any
  const parsed: any = safeJson(result.content);
  if (!parsed || typeof parsed !== "object") return {};
  return mapLlmResponseToPartial(parsed);
}

// deno-lint-ignore no-explicit-any
function safeJson(s: string): any {
  try { return JSON.parse(s); }
  catch {
    // strip markdown fences the model sometimes emits
    const m = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (m) { try { return JSON.parse(m[1]); } catch { /* fall through */ } }
    return null;
  }
}

// deno-lint-ignore no-explicit-any
function mapLlmResponseToPartial(p: any): Partial<ExtractedEvent> {
  const loc = p.location ?? {};
  return {
    title: strOrNull(p.title),
    start_at: strOrNull(p.start_at),
    end_at: strOrNull(p.end_at),
    timezone: strOrNull(p.timezone),
    organizer_name: strOrNull(p.organizer_name),
    organizer_website: strOrNull(p.organizer_website),
    organizer_logo_hint: strOrNull(p.organizer_logo_hint),
    location: {
      is_online: loc.is_online === true,
      venue: strOrNull(loc.venue),
      address: strOrNull(loc.address),
      city: strOrNull(loc.city),
      country: strOrNull(loc.country),
    },
    registration_url: strOrNull(p.registration_url),
    price: p.price && typeof p.price === "object" ? {
      amount: Number(p.price.amount) || 0,
      currency: strOrNull(p.price.currency) ?? "USD",
      is_free: p.price.is_free === true,
    } : null,
    source_description: strOrNull(p.source_description),
    image_candidates: Array.isArray(p.image_candidates)
      ? p.image_candidates.filter((u: unknown) => typeof u === "string").slice(0, 3)
      : [],
    event_type: strOrNull(p.event_type),
  };
}

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// ------------------------------------------------------------
// Orchestrator
// ------------------------------------------------------------
function hasEmptyMandatory(e: Partial<ExtractedEvent>): boolean {
  return !e.title
    || !e.start_at
    || !e.organizer_name
    || (!e.location?.is_online && !e.location?.city);
}

function mergeExtractions(
  primary: Partial<ExtractedEvent>,
  secondary: Partial<ExtractedEvent>,
): Partial<ExtractedEvent> {
  // primary wins when its value is non-null; falls through to secondary
  const pick = <T>(a: T | null | undefined, b: T | null | undefined): T | null =>
    (a ?? null) !== null ? (a as T) : ((b ?? null) as T | null);

  const primaryLoc = primary.location ?? {} as Partial<ExtractedLocation>;
  const secondaryLoc = secondary.location ?? {} as Partial<ExtractedLocation>;

  return {
    title: pick(primary.title, secondary.title),
    start_at: pick(primary.start_at, secondary.start_at),
    end_at: pick(primary.end_at, secondary.end_at),
    timezone: pick(primary.timezone, secondary.timezone),
    organizer_name: pick(primary.organizer_name, secondary.organizer_name),
    organizer_website: pick(primary.organizer_website, secondary.organizer_website),
    organizer_logo_hint: pick(primary.organizer_logo_hint, secondary.organizer_logo_hint),
    location: {
      is_online: primaryLoc.is_online ?? secondaryLoc.is_online ?? false,
      venue: pick(primaryLoc.venue, secondaryLoc.venue),
      address: pick(primaryLoc.address, secondaryLoc.address),
      city: pick(primaryLoc.city, secondaryLoc.city),
      country: pick(primaryLoc.country, secondaryLoc.country),
    },
    registration_url: pick(primary.registration_url, secondary.registration_url),
    price: primary.price ?? secondary.price ?? null,
    source_description: pick(primary.source_description, secondary.source_description),
    image_candidates: [
      ...(primary.image_candidates ?? []),
      ...(secondary.image_candidates ?? []).filter(
        u => !(primary.image_candidates ?? []).includes(u),
      ),
    ],
    event_type: pick(primary.event_type, secondary.event_type),
  };
}

// Convert the existing parseEventJsonLd output shape into a
// Partial<ExtractedEvent> for the cascade. parseEventJsonLd was
// built for the SerpAPI enrichment path so its output shape is
// narrower than ExtractedEvent — we translate here rather than
// modify that stable helper.
function jsonLdToPartial(canonicalUrl: string, html: string): Partial<ExtractedEvent> | null {
  const j = parseEventJsonLd(html);
  if (!j) return null;
  const organizer = extractOrganizerFromHtml(html, canonicalUrl);
  const images: string[] = [];
  if (j.imageUrl) images.push(j.imageUrl);
  return {
    title: j.title,
    start_at: j.startsAt,
    end_at: j.endsAt,
    timezone: null,
    organizer_name: organizer.name,
    organizer_website: null,
    organizer_logo_hint: organizer.logoUrl,
    location: {
      is_online: j.isVirtual,
      venue: j.venueName,
      address: j.address,
      city: j.city,
      country: null,
    },
    registration_url: j.registrationUrl,
    price: null,
    source_description: j.description,
    image_candidates: images,
    event_type: null,
  };
}

export async function extractEventFromUrl(canonicalUrl: string): Promise<ExtractionResult> {
  const errors: string[] = [];
  const html = await fetchEventPageHtml(canonicalUrl, 15_000);
  if (!html) {
    return {
      event: null,
      errors: [`fetch:failed_or_non_html`],
      fetched_at: new Date().toISOString(),
    };
  }

  const jsonLd = jsonLdToPartial(canonicalUrl, html);
  const openGraph = extractOpenGraph(html, canonicalUrl);

  let merged: Partial<ExtractedEvent> = jsonLd
    ? mergeExtractions(jsonLd, openGraph)
    : openGraph;

  let tier: ExtractedEvent["extraction_tier"] = jsonLd
    ? (hasEmptyMandatory(merged) ? "hybrid" : "json_ld")
    : "og_meta";

  if (hasEmptyMandatory(merged)) {
    try {
      const cleaned = cleanHtmlForLlm(html);
      const llm = await extractViaLlm(cleaned, canonicalUrl);
      merged = mergeExtractions(merged, llm);
      tier = "llm";
    } catch (err) {
      errors.push(`llm:${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const event: ExtractedEvent = {
    title: merged.title ?? null,
    start_at: merged.start_at ?? null,
    end_at: merged.end_at ?? null,
    timezone: merged.timezone ?? null,
    organizer_name: merged.organizer_name ?? null,
    organizer_website: merged.organizer_website ?? null,
    organizer_logo_hint: merged.organizer_logo_hint ?? null,
    location: merged.location ?? {
      is_online: false, venue: null, address: null, city: null, country: null,
    },
    registration_url: merged.registration_url ?? null,
    price: merged.price ?? null,
    source_description: merged.source_description ?? null,
    image_candidates: merged.image_candidates ?? [],
    event_type: merged.event_type ?? null,
    extraction_tier: tier,
  };

  return { event, errors, fetched_at: new Date().toISOString() };
}
