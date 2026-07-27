import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fetchEventPageHtml,
  parseEventJsonLd,
  slugFromEventFields,
  cleanConcatenatedText,
  isUsableImageUrl,
  extractCoverImageFromHtml,
} from "../_shared/event-extraction.ts";

const ALLOWED_ORIGINS = [
  ...(Deno.env.get("ENVIRONMENT") === "development"
    ? ["http://localhost:5173", "http://localhost:8080"]
    : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".pages.dev") || origin.endsWith(".workers.dev"))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// Model fallback chains (same family as generate-content).
// Classifier uses cheapest-first; extractor uses strongest-first.
const CLASSIFY_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
const EXTRACT_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

const MAX_SIGNALS_PER_RUN = 5;

// ── Editorial-event promotion (blog post → scheduled_events) ──
// Source names allowed to promote posts as editorial events. Kept small
// on purpose — general-tech blogs mostly cover news, not events. Extend
// deliberately, one source at a time, after checking the source
// actually publishes dated attendable events.
const EDITORIAL_EVENT_SOURCES = new Set<string>([
  "Y Combinator Blog",
]);

// Cheap keyword pre-filter before spending a Groq call. Matches the
// vocabulary blogs use to announce dated events — deliberately narrow
// so personnel/product/IPO announcements from the same sources don't
// waste extraction calls.
const EVENT_TITLE_KEYWORDS = [
  "demo day", "demo days", "hackathon", "conference", "summit",
  "meetup", "pitch competition", "pitch day", "cohort dates",
  "batch dates", "founder retreat", "launch event",
];

function looksLikeEventCandidate(sourceName: string | null, title: string | null): boolean {
  if (!sourceName || !title) return false;
  if (!EDITORIAL_EVENT_SOURCES.has(sourceName)) return false;
  const t = title.toLowerCase();
  return EVENT_TITLE_KEYWORDS.some((k) => t.includes(k));
}

// ── Sanitize raw content (same approach as generate-content) ──
function sanitizeContent(raw: string): string {
  let text = raw;
  text = text.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/https?:\/\/[^\s]+/gi, "");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 1500);
}

// Longer variant for event-page extraction: preserves URLs (so a "register"
// link survives) and keeps 3k chars so multi-date blog posts (like YC's
// seasonal batch pages) don't get truncated before the date list.
function sanitizeLong(raw: string): string {
  let text = raw;
  text = text.replace(/<(script|style|nav|footer|header|aside|form|button)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 3000);
}

// ── Groq call with model fallback on 429 ──
async function callGroq(
  apiKey: string,
  models: string[],
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  for (const model of models) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) {
      console.warn(`429 from ${model}, trying next model...`);
      continue;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("429_all_models_exhausted");
}

function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  }
  return JSON.parse(cleaned);
}

// ── Prompts ──
const CLASSIFY_SYSTEM = `You are a classifier for a startup news pipeline. Given a headline and article text, output ONLY a JSON object: {"content_type": X} where X is exactly one of: "funding" (a specific company raising a specific round), "acquisition" (a company being acquired, merging, or IPOing), "narrative" (startup/tech news, analysis, trends, profiles), "irrelevant" (not startup/tech related). If the text merely mentions funding in passing but is not primarily announcing a round, classify as "narrative". Never guess "funding" without an explicit company + round.`;

const EXTRACT_FUNDING_SYSTEM = `You extract structured funding data for a startup intelligence platform. Extract ONLY facts explicitly stated in the source text. If a field is not stated, return null. Never estimate or infer amounts, valuations, or investor names.

Output ONLY a JSON object with exactly this shape:
{
  "company_name": "string",
  "company_website": "string|null",
  "sector": "string|null",
  "round_type": "pre_seed|seed|series_a|series_b|series_c|series_d_plus|growth|debt|null",
  "amount_usd": number|null,
  "valuation_usd": number|null,
  "announced_at": "YYYY-MM-DD",
  "lead_investors": ["string"],
  "other_investors": ["string"],
  "one_liner": "string, max 15 words, factual, no hype adjectives"
}
amount_usd and valuation_usd are plain numbers in US dollars (e.g. 50000000 for $50M). If the announcement date is not stated, use today's date provided by the user.`;

const EXTRACT_EVENT_SYSTEM = `You extract details of a specific dated event from a blog post or article body, for a startup/tech events directory.

Output ONLY a JSON object with exactly this shape:
{
  "is_event": boolean,
  "title": "string — the event's own name (not the article title if they differ)",
  "description": "string — 1-2 sentence founder-facing description, factual",
  "starts_at": "YYYY-MM-DDTHH:mm:ssZ (UTC) — earliest FUTURE occurrence; null if not stated",
  "ends_at": "YYYY-MM-DDTHH:mm:ssZ or null",
  "city": "string or null — primary host city, ASCII",
  "venue": "string or null — venue name if explicitly stated",
  "is_virtual": boolean,
  "registration_url": "https:// URL or null — apply/register link if given",
  "category": "ai|startup|crypto|emerging_tech|other"
}

Set is_event = true ONLY when the article describes a SPECIFIC dated event a founder or investor could plan to attend or apply for (demo day, hackathon, conference, summit, meetup, pitch competition, cohort application deadline). Set is_event = false for: retrospectives, past events, personnel news, program launches without a specific event date, IPO/acquisition announcements, market analysis.

DATE SELECTION IS CRITICAL. Follow this procedure exactly:
1. List EVERY date mentioned in the body that could be an event date (e.g. "March 24", "June 16", "September 10", "December 2").
2. Assume the year is the article's stated year if given, otherwise the current year from "Today's date".
3. Filter to only dates that are strictly AFTER "Today's date".
4. Pick the EARLIEST remaining date. That is starts_at.
5. If step 3 leaves no dates (all dates are in the past), set is_event = false. Do NOT return a past date.

Example — Today's date: 2026-07-26. Body says "Winter Demo Day: March 24. Spring: June 16. Summer: September 10. Fall: December 2." All in 2026. Past dates: March 24, June 16. Future dates: September 10, December 2. Earliest future: September 10 → starts_at = "2026-09-10T12:00:00Z".

If a time-of-day is not stated, use 12:00 UTC. If starts_at cannot be determined, set is_event = false rather than guessing.`;

const EXTRACT_ACQUISITION_SYSTEM = `You extract structured acquisition/IPO data for a startup intelligence platform. Extract ONLY facts explicitly stated in the source text. If a field is not stated, return null. Never estimate or infer amounts or valuations.

Output ONLY a JSON object with exactly this shape:
{
  "acquirer_name": "string|null",
  "acquired_name": "string",
  "deal_value_usd": number|null,
  "deal_type": "acquisition|ipo",
  "announced_at": "YYYY-MM-DD",
  "one_liner": "string, max 15 words, factual, no hype adjectives"
}
For an IPO, acquirer_name is null and acquired_name is the company going public. If the announcement date is not stated, use today's date provided by the user.`;

// ── Validators ──
const ROUND_TYPES = new Set([
  "pre_seed", "seed", "series_a", "series_b", "series_c",
  "series_d_plus", "growth", "debt",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim().length > 0) : [];
}

// ── Entity helpers ──
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.]?\s*(inc|ltd|llc|pvt|corp|co|limited|corporation|incorporated)\.?\s*$/i, "")
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "entity";
}

// deno-lint-ignore no-explicit-any
async function resolveEntity(supabase: any, name: string, entityType: string, extras: Record<string, unknown> = {}): Promise<string> {
  const original = name.trim().replace(/\s+/g, " ");
  const normalized = normalizeName(original);

  // 2. Exact match on lower(name) for this entity_type
  const { data: exact } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", entityType)
    .ilike("name", normalized)
    .limit(1);
  if (exact && exact.length > 0) return exact[0].id;

  // Also try exact on the original (with legal suffix)
  if (normalized !== original) {
    const { data: exactOrig } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", entityType)
      .ilike("name", original)
      .limit(1);
    if (exactOrig && exactOrig.length > 0) return exactOrig[0].id;
  }

  // 3. Fuzzy match via pg_trgm RPC (similarity > 0.55)
  const { data: fuzzy, error: fuzzyErr } = await supabase.rpc("match_entity", {
    p_name: normalized,
    p_type: entityType,
  });
  if (!fuzzyErr && Array.isArray(fuzzy) && fuzzy.length > 0 && fuzzy[0].id) {
    return fuzzy[0].id;
  }

  // 4. Insert with slug retry on unique violation
  const baseSlug = slugify(normalized);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: inserted, error: insErr } = await supabase
      .from("entities")
      .insert({ name: original, slug, entity_type: entityType, ...extras })
      .select("id")
      .single();
    if (!insErr && inserted) return inserted.id;
    if (insErr && !String(insErr.message).includes("duplicate key")) {
      throw new Error(`entity insert failed: ${insErr.message}`);
    }
  }
  throw new Error(`entity slug exhausted for: ${original}`);
}

// ── Dedup guard: same entity + type + round within ±3 days ──
// deno-lint-ignore no-explicit-any
async function isDuplicateEvent(supabase: any, primaryEntityId: string, eventType: string, roundType: string | null, announcedAt: string): Promise<boolean> {
  const d = new Date(announcedAt + "T00:00:00Z");
  const lo = new Date(d.getTime() - 3 * 86400_000).toISOString().slice(0, 10);
  const hi = new Date(d.getTime() + 3 * 86400_000).toISOString().slice(0, 10);

  let q = supabase
    .from("capital_events")
    .select("id")
    .eq("primary_entity_id", primaryEntityId)
    .eq("event_type", eventType)
    .gte("announced_at", lo)
    .lte("announced_at", hi)
    .limit(1);
  q = roundType === null ? q.is("round_type", null) : q.eq("round_type", roundType);

  const { data } = await q;
  return Boolean(data && data.length > 0);
}

// ── Editorial-event promotion pipeline ──────────────────────────────
// For a raw_signal that passed looksLikeEventCandidate(), fetch the
// source page and try JSON-LD Event extraction first (deterministic,
// free). If that misses, fall back to a Groq extraction on the article
// body. Insert a scheduled_events row with source='editorial_blog' on
// success. Returns which path fired so callers can account tokens.
interface PromoteResult {
  outcome: "inserted" | "duplicate" | "not_event" | "no_date" | "past_event" | "error";
  usedGroq: boolean;
  slug?: string;
  reason?: string;
}

// deno-lint-ignore no-explicit-any
async function promoteEditorialEvent(
  supabase: any,
  groqApiKey: string,
  signal: { id: string; title: string | null; raw_content: string | null; source_url: string | null; source_name: string | null; image_url: string | null },
): Promise<PromoteResult> {
  if (!signal.source_url) return { outcome: "error", usedGroq: false, reason: "no_source_url" };

  const html = await fetchEventPageHtml(signal.source_url);
  if (!html) return { outcome: "error", usedGroq: false, reason: "fetch_failed" };

  // Try deterministic JSON-LD Event first — free, exact.
  const jsonLd = parseEventJsonLd(html);
  let title: string | null = null;
  let description: string | null = null;
  let startsAt: string | null = null;
  let endsAt: string | null = null;
  let city: string | null = null;
  let venue: string | null = null;
  let isVirtual = false;
  let registrationUrl: string | null = null;
  let category = "other";
  let usedGroq = false;

  if (jsonLd?.startsAt) {
    title = jsonLd.title ?? signal.title;
    description = jsonLd.description;
    startsAt = jsonLd.startsAt;
    endsAt = jsonLd.endsAt;
    city = jsonLd.city;
    venue = jsonLd.venueName;
    isVirtual = jsonLd.isVirtual;
    registrationUrl = jsonLd.registrationUrl ?? signal.source_url;
  } else {
    // No structured event data — Groq extraction fallback.
    usedGroq = true;
    // Prefer the FETCHED page HTML — the RSS raw_content is usually just a
    // one-sentence teaser that doesn't contain the actual dates. Sanitizer
    // strips scripts/nav/tags and clips to 3k chars (up from the default 1.5k
    // used for classification) so the extractor sees enough body to locate a
    // date/venue in a long-form blog post.
    const body = sanitizeLong(html);
    const today = new Date().toISOString().slice(0, 10);
    let extractRaw: string;
    try {
      extractRaw = await callGroq(
        groqApiKey, EXTRACT_MODELS, EXTRACT_EVENT_SYSTEM,
        `Today's date: ${today}\nArticle title: ${signal.title ?? ""}\nArticle body:\n${body}`, 500,
      );
    } catch (err) {
      return { outcome: "error", usedGroq: true, reason: `groq: ${err instanceof Error ? err.message : String(err)}` };
    }
    let parsed: Record<string, unknown>;
    try { parsed = safeJsonParse(extractRaw); }
    catch { return { outcome: "error", usedGroq: true, reason: "invalid_json" }; }

    if (parsed.is_event !== true) return { outcome: "not_event", usedGroq: true };
    if (typeof parsed.starts_at !== "string") return { outcome: "no_date", usedGroq: true };
    const parsedStart = new Date(parsed.starts_at);
    if (!isFinite(parsedStart.getTime())) return { outcome: "no_date", usedGroq: true };

    title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : signal.title;
    description = typeof parsed.description === "string" ? parsed.description : null;
    startsAt = parsedStart.toISOString();
    endsAt = typeof parsed.ends_at === "string" ? (isFinite(new Date(parsed.ends_at).getTime()) ? new Date(parsed.ends_at).toISOString() : null) : null;
    city = typeof parsed.city === "string" ? parsed.city : null;
    venue = typeof parsed.venue === "string" ? parsed.venue : null;
    isVirtual = parsed.is_virtual === true;
    registrationUrl = typeof parsed.registration_url === "string" && /^https?:\/\//i.test(parsed.registration_url)
      ? parsed.registration_url
      : signal.source_url;
    category = typeof parsed.category === "string" ? parsed.category : "other";
  }

  if (!title || !startsAt) return { outcome: "no_date", usedGroq };
  // Drop past events. 1h grace so an event that started an hour ago still shows.
  if (new Date(startsAt).getTime() < Date.now() - 3600_000) return { outcome: "past_event", usedGroq };

  // Cover image: prefer signal.image_url (already og:image-scraped by ingest),
  // else JSON-LD image, else re-scrape via extractCoverImageFromHtml, else null.
  let imageUrl: string | null = isUsableImageUrl(signal.image_url) ? signal.image_url : null;
  if (!imageUrl && jsonLd?.imageUrl) imageUrl = jsonLd.imageUrl;
  if (!imageUrl) imageUrl = extractCoverImageFromHtml(html);

  const slug = await slugFromEventFields("editorial", title, startsAt, city);

  // Idempotent upsert on slug — reprocessing the same signal produces the same slug.
  const { error: insErr } = await supabase
    .from("scheduled_events")
    .upsert({
      slug,
      source: "editorial_blog",
      source_id: signal.id,
      source_url: signal.source_url,
      title,
      description: cleanConcatenatedText(description),
      starts_at: startsAt,
      ends_at: endsAt,
      city,
      region: null,
      is_virtual: isVirtual,
      location: venue,
      registration_url: registrationUrl,
      image_url: imageUrl,
      event_type: "conference", // default; editorial posts rarely disclose a granular type
      relevance_category: category,
      relevance_reason: description ? description.slice(0, 240) : null,
      status: "approved",
    }, { onConflict: "slug", ignoreDuplicates: false });

  if (insErr) {
    if (String(insErr.message).includes("duplicate")) return { outcome: "duplicate", usedGroq, slug };
    return { outcome: "error", usedGroq, reason: `insert: ${insErr.message}` };
  }
  return { outcome: "inserted", usedGroq, slug };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS_HEADERS = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL, SERVICE_ROLE_KEY, or GROQ_API_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Two-batch fetch:
    // - editorial candidates from whitelisted sources are processed
    //   separately, up to MAX_EDITORIAL_PER_RUN — otherwise the older
    //   TechCrunch/HN queue would starve them for hours.
    // - regular batch is the existing FIFO pending pull for the classifier.
    // Total per run is bounded at MAX_SIGNALS_PER_RUN + MAX_EDITORIAL_PER_RUN.
    const MAX_EDITORIAL_PER_RUN = 3;
    const editorialWhitelist = Array.from(EDITORIAL_EVENT_SOURCES);
    const { data: editorialSignals } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
      .in("source_name", editorialWhitelist)
      .order("created_at", { ascending: true })
      .limit(MAX_EDITORIAL_PER_RUN);

    const { data: regularSignals, error: fetchError } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
      .not("source_name", "in", `(${editorialWhitelist.map((s) => `"${s}"`).join(",")})`)
      .order("created_at", { ascending: true })
      .limit(MAX_SIGNALS_PER_RUN);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const pendingSignals = [...(editorialSignals ?? []), ...(regularSignals ?? [])];

    const today = new Date().toISOString().slice(0, 10);
    const summary = {
      processed: 0,
      classified_funding: 0,
      classified_acquisition: 0,
      classified_narrative: 0,
      classified_irrelevant: 0,
      events_created: 0,
      editorial_events_created: 0,
      editorial_not_event: 0,
      editorial_past: 0,
      duplicates: 0,
      errors: 0,
    };
    let tokensUsed = 0;
    let requestsMade = 0;

    for (const signal of pendingSignals ?? []) {
      try {
        // ── Editorial-event pre-branch ──
        // Whitelisted blog + event-shaped title → try to promote to
        // scheduled_events before running the funding/acquisition classifier.
        // Consumes the signal (status='published') on any decisive outcome
        // (inserted / not_event / past) so it doesn't re-hit the branch.
        //
        // A whitelisted editorial signal whose title fails the keyword filter
        // (personnel news, IPO/acquisition announcements, product launches)
        // is marked rejected here too — otherwise the editorial fetch would
        // keep re-picking the same items on every run and starve the event
        // candidates further down the queue.
        const isEditorialSource = signal.source_name != null && EDITORIAL_EVENT_SOURCES.has(signal.source_name);
        if (isEditorialSource && !looksLikeEventCandidate(signal.source_name, signal.title)) {
          await supabase.from("raw_signals")
            .update({ status: "rejected", error_message: "editorial: not an event candidate" })
            .eq("id", signal.id);
          summary.editorial_not_event++;
          summary.processed++;
          continue;
        }

        if (looksLikeEventCandidate(signal.source_name, signal.title)) {
          const res = await promoteEditorialEvent(supabase, groqApiKey, signal);
          if (res.usedGroq) { requestsMade++; tokensUsed += 900; }
          if (res.outcome === "inserted") {
            summary.editorial_events_created++;
            summary.processed++;
            await supabase.from("raw_signals")
              .update({ status: "published", processed_at: new Date().toISOString() })
              .eq("id", signal.id);
            continue;
          }
          if (res.outcome === "duplicate") {
            summary.duplicates++;
            summary.processed++;
            await supabase.from("raw_signals")
              .update({ status: "published", processed_at: new Date().toISOString() })
              .eq("id", signal.id);
            continue;
          }
          if (res.outcome === "not_event") {
            summary.editorial_not_event++;
            summary.processed++;
            await supabase.from("raw_signals")
              .update({ status: "rejected", error_message: "editorial: not_event" })
              .eq("id", signal.id);
            continue;
          }
          if (res.outcome === "past_event") {
            summary.editorial_past++;
            summary.processed++;
            await supabase.from("raw_signals")
              .update({ status: "rejected", error_message: "editorial: past_event" })
              .eq("id", signal.id);
            continue;
          }
          // outcome === "no_date" | "error" — log and fall through to the
          // normal classifier so we don't lose the signal entirely.
          console.warn(`editorial branch inconclusive ${signal.id}: ${res.outcome} ${res.reason ?? ""}`);
        }

        const rawText = `${signal.title ?? ""}\n${sanitizeContent(signal.raw_content ?? "")}`.trim();
        if (rawText.length < 30) {
          // Too thin to classify — leave for generate-content's own rejection path
          summary.classified_narrative++;
          continue;
        }

        // ── CALL 1: classify (cheap model) ──
        const classifyRaw = await callGroq(
          groqApiKey, CLASSIFY_MODELS, CLASSIFY_SYSTEM,
          `Headline and text:\n${rawText}`, 60
        );
        requestsMade++;
        tokensUsed += 400;

        let contentType: string;
        try {
          contentType = String(safeJsonParse(classifyRaw)?.content_type ?? "narrative");
        } catch {
          contentType = "narrative"; // unparseable → safest is leave for narrative pipeline
        }

        summary.processed++;

        if (contentType === "narrative") {
          // Leave untouched for generate-content — do NOT change status
          summary.classified_narrative++;
          continue;
        }

        if (contentType === "irrelevant") {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "classified_irrelevant" })
            .eq("id", signal.id);
          summary.classified_irrelevant++;
          continue;
        }

        if (contentType !== "funding" && contentType !== "acquisition") {
          summary.classified_narrative++;
          continue; // unknown label → treat as narrative, leave alone
        }

        // ── CALL 2: extract (strong model) ──
        const extractSystem = contentType === "funding" ? EXTRACT_FUNDING_SYSTEM : EXTRACT_ACQUISITION_SYSTEM;
        const extractRaw = await callGroq(
          groqApiKey, EXTRACT_MODELS, extractSystem,
          `Today's date: ${today}\nSource text:\n${rawText}`, 500
        );
        requestsMade++;
        tokensUsed += 900;

        let parsed: any;
        try {
          parsed = safeJsonParse(extractRaw);
        } catch {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "extract_invalid_json" })
            .eq("id", signal.id);
          summary.errors++;
          continue;
        }

        if (contentType === "funding") {
          summary.classified_funding++;

          // Validate required fields
          const companyName = typeof parsed.company_name === "string" ? parsed.company_name.trim() : "";
          const announcedAt = typeof parsed.announced_at === "string" && DATE_RE.test(parsed.announced_at)
            ? parsed.announced_at : "";
          if (!companyName || !announcedAt) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "extract_missing_required: company_name/announced_at" })
              .eq("id", signal.id);
            summary.errors++;
            continue;
          }

          const roundType = ROUND_TYPES.has(parsed.round_type) ? parsed.round_type : null;

          const companyId = await resolveEntity(supabase, companyName, "company", {
            website: typeof parsed.company_website === "string" ? parsed.company_website : null,
            sector: typeof parsed.sector === "string" ? parsed.sector : null,
          });

          if (await isDuplicateEvent(supabase, companyId, "funding", roundType, announcedAt)) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "duplicate_event" })
              .eq("id", signal.id);
            summary.duplicates++;
            continue;
          }

          const leadNames = asStringArray(parsed.lead_investors);
          const otherNames = asStringArray(parsed.other_investors);

          const { data: eventRow, error: evErr } = await supabase
            .from("capital_events")
            .insert({
              event_type: "funding",
              primary_entity_id: companyId,
              round_type: roundType,
              amount_usd: asNumberOrNull(parsed.amount_usd),
              valuation_usd: asNumberOrNull(parsed.valuation_usd),
              announced_at: announcedAt,
              one_liner: typeof parsed.one_liner === "string" && parsed.one_liner.trim()
                ? parsed.one_liner.trim()
                : `${companyName} raised a funding round.`,
              source_url: signal.source_url ?? null,
            })
            .select("id")
            .single();
          if (evErr || !eventRow) throw new Error(`capital_events insert: ${evErr?.message}`);

          // Investors — resolve and link, lead flag preserved
          const investorRows: Array<{ capital_event_id: string; investor_entity_id: string; is_lead: boolean }> = [];
          for (const nm of leadNames) {
            const invId = await resolveEntity(supabase, nm, "investor");
            investorRows.push({ capital_event_id: eventRow.id, investor_entity_id: invId, is_lead: true });
          }
          for (const nm of otherNames) {
            const invId = await resolveEntity(supabase, nm, "investor");
            if (!investorRows.some((r) => r.investor_entity_id === invId)) {
              investorRows.push({ capital_event_id: eventRow.id, investor_entity_id: invId, is_lead: false });
            }
          }
          if (investorRows.length > 0) {
            await supabase.from("capital_event_investors").upsert(investorRows, { onConflict: "capital_event_id,investor_entity_id" });
          }

          summary.events_created++;
        } else {
          summary.classified_acquisition++;

          const acquiredName = typeof parsed.acquired_name === "string" ? parsed.acquired_name.trim() : "";
          const announcedAt = typeof parsed.announced_at === "string" && DATE_RE.test(parsed.announced_at)
            ? parsed.announced_at : "";
          const dealType = parsed.deal_type === "ipo" ? "ipo" : "acquisition";
          if (!acquiredName || !announcedAt) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "extract_missing_required: acquired_name/announced_at" })
              .eq("id", signal.id);
            summary.errors++;
            continue;
          }

          const acquiredId = await resolveEntity(supabase, acquiredName, "company");
          const acquirerId = typeof parsed.acquirer_name === "string" && parsed.acquirer_name.trim()
            ? await resolveEntity(supabase, parsed.acquirer_name.trim(), "company")
            : null;

          if (await isDuplicateEvent(supabase, acquiredId, dealType, dealType, announcedAt)) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "duplicate_event" })
              .eq("id", signal.id);
            summary.duplicates++;
            continue;
          }

          const { error: evErr } = await supabase.from("capital_events").insert({
            event_type: dealType,
            primary_entity_id: acquiredId,
            counterparty_entity_id: acquirerId,
            round_type: dealType, // 'acquisition' | 'ipo' are valid round_type values
            amount_usd: asNumberOrNull(parsed.deal_value_usd),
            announced_at: announcedAt,
            one_liner: typeof parsed.one_liner === "string" && parsed.one_liner.trim()
              ? parsed.one_liner.trim()
              : `${acquiredName} ${dealType === "ipo" ? "went public" : "was acquired"}.`,
            source_url: signal.source_url ?? null,
          });
          if (evErr) throw new Error(`capital_events insert: ${evErr.message}`);

          summary.events_created++;
        }

        // Mark signal consumed
        await supabase
          .from("raw_signals")
          .update({ status: "published", processed_at: new Date().toISOString() })
          .eq("id", signal.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`extract-structured signal ${signal.id} failed:`, msg);
        await supabase
          .from("raw_signals")
          .update({ error_message: `extract: ${msg}`.slice(0, 500) })
          .eq("id", signal.id);
        summary.errors++;
        // continue with the rest — never let one bad signal kill the batch
      }
    }

    // pipeline_stats accounting (same RPC as generate-content)
    if (requestsMade > 0) {
      await supabase.rpc("increment_pipeline_stats_safe", {
        p_date: today,
        p_tokens: tokensUsed,
        p_articles: 0,
        p_requests: requestsMade,
      });
    }

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-structured fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "extraction failure" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
