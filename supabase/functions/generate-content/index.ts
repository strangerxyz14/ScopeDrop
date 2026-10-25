import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, hasBudget, TASK } from "../_shared/llm.ts";
import { offTopicReason, CLASSIFIED_RELEVANT } from "../_shared/relevance.ts";
import { classifierDecision, routeSection, decisionColumns } from "../_shared/section-router.ts";

const ALLOWED_ORIGINS = [
  ...(Deno.env.get("ENVIRONMENT") === "development"
    ? ["http://localhost:5173", "http://localhost:8080"]
    : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev'))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// ── Image generation: Pollinations → Pexels → Unsplash ───
const CATEGORY_PEXELS_QUERIES: Record<string, string> = {
  funding:     "venture capital investment business",
  ai:          "artificial intelligence technology future",
  startups:    "startup entrepreneur office innovation",
  markets:     "stock market finance graph data",
  policy:      "government policy law regulation",
  acquisitions:"business merger corporate deal",
  tech:        "technology software developer code",
};

// Extract likely proper-noun tokens (product/company names) from a headline,
// e.g. "OnePlus N6" out of "OnePlus N6 Accessorized" — so stock-photo fallback
// searches don't collapse to a generic "smartphone" query that can return an
// unrelated real product photo (a different phone, a different company).
function extractProperNouns(headline: string): string {
  const words = headline.split(/\s+/).filter(Boolean);
  const proper = words.filter((w) => /^[A-Z0-9]/.test(w) && !/^(The|A|An|In|On|For|With|Is|Are)$/i.test(w));
  return proper.slice(0, 3).join(" ");
}

async function fetchPollinationsOnce(headline: string): Promise<string | null> {
  try {
    const prompt = encodeURIComponent(
      `editorial illustration for: ${headline}, clean minimal tech style, professional, no text, no logos, no people`
    );
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${prompt}?width=1200&height=630&nologo=true&model=flux&seed=${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000); // 12s timeout
    const res = await fetch(pollinationsUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok && res.headers.get("content-type")?.startsWith("image/")) {
      return pollinationsUrl;
    }
  } catch (e) {
    console.warn("Pollinations attempt failed:", e instanceof Error ? e.message : e);
  }
  return null;
}

async function fetchImageUrl(
  headline: string,
  category: string,
  tags: string[],
  pexelsKey: string | undefined,
  unsplashKey: string | undefined,
): Promise<string | null> {
  // 1. Pollinations.ai — unique AI image from headline (Flux, free, no key).
  // Two attempts: transient network/queue failures are common and a unique
  // AI image is always preferable to a stock photo of an unrelated product.
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = await fetchPollinationsOnce(headline);
    if (url) {
      console.log(`Image: Pollinations OK (attempt ${attempt + 1})`);
      return url;
    }
  }

  // Prefer proper nouns from the headline (product/company names) over
  // generic AI-assigned tags — "OnePlus N6" beats "smartphone launch" for
  // avoiding a stock photo of a different, unrelated product.
  const properNouns = extractProperNouns(headline);
  const fallbackQuery =
    properNouns || tags.slice(0, 2).join(" ") || CATEGORY_PEXELS_QUERIES[category] || "technology startup";

  // 2. Pexels — keyword search
  if (pexelsKey) {
    try {
      const query = encodeURIComponent(fallbackQuery);
      const res = await fetch(
        `https://api.pexels.com/v1/search?query=${query}&per_page=1&orientation=landscape`,
        { headers: { Authorization: pexelsKey } }
      );
      if (res.ok) {
        const json = await res.json();
        const url = json.photos?.[0]?.src?.large2x ?? json.photos?.[0]?.src?.original ?? null;
        if (url) { console.log("Image: Pexels OK"); return url; }
      }
    } catch (e) {
      console.warn("Pexels failed:", e instanceof Error ? e.message : e);
    }
  }

  // 3. Unsplash — keyword search
  if (unsplashKey) {
    try {
      const query = encodeURIComponent(fallbackQuery);
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`,
        { headers: { Authorization: `Client-ID ${unsplashKey}` } }
      );
      if (res.ok) {
        const json = await res.json();
        const url = json.results?.[0]?.urls?.regular ?? null;
        if (url) { console.log("Image: Unsplash OK"); return url; }
      }
    } catch (e) {
      console.warn("Unsplash failed:", e instanceof Error ? e.message : e);
    }
  }

  console.warn("Image: all sources failed, using null");
  return null;
}

// Model + provider fallback chain lives in _shared/llm.ts under
// TASK.LONG_ANALYTICAL (Groq llama-70b primary, Cerebras Qwen-3 32B
// fallback, Cerebras llama-70b emergency). Deprecating the local chain.

const INTER_ARTICLE_DELAY_MS = 15_000;

// ── 4C: Sanitize raw content ──────────────────────────────
function sanitizeContent(raw: string): string {
  let text = raw;
  // Remove script, style, nav, footer, header, aside blocks
  text = text.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Strip all HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  // Remove URLs
  text = text.replace(/https?:\/\/[^\s]+/gi, "");
  // Remove inline CSS and data attributes leftovers
  text = text.replace(/style\s*=\s*"[^"]*"/gi, "");
  text = text.replace(/data-[a-z-]+\s*=\s*"[^"]*"/gi, "");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  // Truncate to 800 characters
  return text.slice(0, 800);
}

// ── System prompt ─────────────────────────────────────────
// No "category" field: the section is picked by _shared/section-router.ts
// from the source text, not by this copywriting call.
const SYSTEM_PROMPT = `You are an editorial AI for ScopeDrop, an intelligence platform for startup founders and tech professionals. Transform raw news signals into original, plagiarism-free editorial content.

STRICT RULES:
- Never copy source text verbatim. Rewrite entirely in your own words.
- ScopeDrop voice: sharp, founder-first, data-aware, zero fluff.
- Output ONLY valid JSON. No markdown. No backticks. No preamble. No explanation. Nothing except the JSON object.
- Every field is required. Never return null or empty strings.
- article_html must have minimum 3 paragraphs with <h2> subheadings and original analysis — not just a summary of the source.

Return exactly this structure:
{
  "homepage_headline": "punchy headline under 12 words",
  "homepage_summary": "2 sentences, founder perspective, no fluff",
  "article_html": "full article as HTML, min 3 paragraphs, <h2> subheadings, original insight",
  "read_time_minutes": 3,
  "tags": ["tag1", "tag2", "tag3"]
}`;

// LLM call: _shared/llm.ts TASK.LONG_ANALYTICAL at priority "article",
// the top of the budget allocator, so articles can use a model's whole
// daily allowance. Model fallback, 429 cooldowns and telemetry live there.
async function writeArticle(sanitizedContent: string): Promise<string> {
  const res = await callLLM(
    TASK.LONG_ANALYTICAL,
    SYSTEM_PROMPT,
    "Transform this news signal into ScopeDrop editorial content: " + sanitizedContent,
    { jsonMode: true, maxTokens: 1000, temperature: 0.7, priority: "article" },
  );
  return res.content;
}

// ── Safe JSON parse ───────────────────────────────────────
function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  // Strip accidental markdown fences
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  }
  return JSON.parse(cleaned);
}

// ── Validate parsed response ──────────────────────────────
function validateResponse(parsed: any): string | null {
  const required = [
    "homepage_headline",
    "homepage_summary",
    "article_html",
    "read_time_minutes",
    "tags",
  ];
  for (const key of required) {
    if (parsed[key] === undefined || parsed[key] === null || parsed[key] === "") {
      return `missing_or_empty_field: ${key}`;
    }
  }
  if (typeof parsed.homepage_headline !== "string") return "homepage_headline not string";
  if (typeof parsed.homepage_summary !== "string") return "homepage_summary not string";
  if (typeof parsed.article_html !== "string") return "article_html not string";
  if (!Array.isArray(parsed.tags)) return "tags not array";
  return null;
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
    // LLM API keys are owned by _shared/llm.ts (callLLM reads them per
    // provider); this function no longer reads GROQ_API_KEY directly.
    const pexelsKey = Deno.env.get("PEXELS_API_KEY");
    const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_TOKEN");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 4A: Budget guard ──────────────────────────────────
    // Real per-model token budget (_shared/llm.ts allocator). The old
    // guard compared fixed 1,200-token estimates against a 450K figure
    // that matched no actual Groq limit. Signals stay queued when there's
    // no budget; nothing is marked paused or lost.
    const today = new Date().toISOString().slice(0, 10);
    const { data: statsRow } = await supabase
      .from("pipeline_stats")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (!statsRow) {
      await supabase.from("pipeline_stats").insert({ date: today });
    }

    const tokensUsedToday = statsRow?.tokens_used ?? 0;
    if (!(await hasBudget(TASK.LONG_ANALYTICAL, "article"))) {
      return new Response(
        JSON.stringify({
          processed: 0,
          published: 0,
          rejected: 0,
          waiting: 0,
          reason: "llm_budget_exhausted",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── 4B: Fetch classified pending signals ──────────────
    // Only signals extract-structured's classifier accepted. This function
    // used to take any pending row, and since it runs ~3x as often as the
    // classifier most articles skipped classification entirely — that's
    // how gadget reviews and game news reached the homepage.
    const { data: pendingSignals, error: fetchError } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
      .eq("error_message", CLASSIFIED_RELEVANT)
      .order("created_at", { ascending: true })
      .limit(3);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!pendingSignals || pendingSignals.length === 0) {
      return new Response(
        JSON.stringify({
          processed: 0,
          published: 0,
          rejected: 0,
          waiting: 0,
          reason: "no_pending_signals",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Process each signal ───────────────────────────────
    let published = 0;
    let rejected = 0;
    let waiting = 0;
    let stopEarly = false;

    for (let idx = 0; idx < pendingSignals.length; idx++) {
      const signal = pendingSignals[idx];

      if (stopEarly) {
        // Leave remaining signals as pending
        break;
      }

      try {
        // ── 4C: Sanitize ────────────────────────────────
        const rawText = signal.raw_content ?? signal.title ?? "";
        const sanitized = sanitizeContent(rawText);

        if (sanitized.length < 50) {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "insufficient_content" })
            .eq("id", signal.id);
          rejected++;
          // 4J: Delay even on rejection
          if (idx < pendingSignals.length - 1) {
            await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
          }
          continue;
        }

        // ── 4D: Deterministic off-topic backstop ────────
        const offTopic = offTopicReason(signal.title, sanitized);
        if (offTopic) {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: `off_topic: ${offTopic}` })
            .eq("id", signal.id);
          rejected++;
          continue;
        }

        // ── 4E: LLM call ────────────────────────────────
        let articleText: string;
        try {
          articleText = await writeArticle(sanitized);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          // Every model in the chain was rate limited, cooling down or out
          // of budget. Leave the signal pending + tagged so the next run
          // retries it, and stop: the rest of the batch would fail too.
          // (These used to be set to 'paused', which nothing ever read,
          // so the stories were lost.)
          if (errMsg.includes("All providers exhausted")) {
            console.warn(`generate-content: no LLM capacity, ${signal.id} stays queued:`, errMsg.slice(0, 300));
            waiting++;
            stopEarly = true;
            continue;
          }
          throw e;
        }

        // ── 4H: Parse and validate ──────────────────────
        let parsed: any;
        try {
          parsed = safeJsonParse(articleText);
        } catch {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "invalid_json_response" })
            .eq("id", signal.id);
          rejected++;
          if (idx < pendingSignals.length - 1) {
            await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
          }
          continue;
        }

        const validationError = validateResponse(parsed);
        if (validationError) {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: `validation_failed: ${validationError}` })
            .eq("id", signal.id);
          rejected++;
          if (idx < pendingSignals.length - 1) {
            await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
          }
          continue;
        }

        // ── 4I: Route to a section ──────────────────────
        // A recorded funding/M&A event wins (rule); otherwise the section
        // extract-structured's relevance call already picked, so no extra
        // LLM call. Only signals without one (classified before
        // 2026-10-25, or an invalid section) go through the router, on the
        // source headline and text, not the rewrite. Never throws: a router
        // failure falls back to "startups" with status "review".
        const s = signal as any;
        const section = classifierDecision({
          verdict: s.classifier_verdict ?? null,
          section: s.classifier_section ?? null,
          secondary: s.classifier_section_secondary ?? null,
          confidence: s.classifier_section_confidence ?? null,
          reason: s.classifier_section_reason ?? null,
        }) ?? await routeSection({
          headline: signal.title ?? parsed.homepage_headline,
          body: rawText,
          verdict: s.classifier_verdict ?? null,
        });

        // ── 4J: Generate image (Pollinations → Pexels → Unsplash) ─
        const image_url = await fetchImageUrl(
          parsed.homepage_headline,
          section.section,
          Array.isArray(parsed.tags) ? parsed.tags : [],
          pexelsKey,
          unsplashKey,
        );

        // ── 4K: Insert article ──────────────────────────
        const articleRow = {
          headline: parsed.homepage_headline,
          summary: parsed.homepage_summary,
          content_html: parsed.article_html,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          read_time_minutes:
            typeof parsed.read_time_minutes === "number"
              ? Math.max(2, Math.min(8, parsed.read_time_minutes))
              : 3,
          source_signal_id: signal.id,
          image_url: image_url ?? (signal as any).image_url ?? null,
          status: "published",
          // Feeds sort on published_at; rows inserted without it sank
          // below every backfilled row and the homepage froze.
          published_at: new Date().toISOString(),
        };
        let { error: insertError } = await supabase
          .from("articles")
          .insert({ ...articleRow, ...decisionColumns(section) });
        // Before migration 20261025130000 adds the section_* columns, the
        // insert above fails on them; keep publishing with the category.
        if (insertError && /section_|router_version/.test(insertError.message)) {
          ({ error: insertError } = await supabase
            .from("articles")
            .insert({ ...articleRow, category: section.section }));
        }

        if (insertError) {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: `insert_failed: ${insertError.message}` })
            .eq("id", signal.id);
          rejected++;
          if (idx < pendingSignals.length - 1) {
            await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
          }
          continue;
        }

        // Mark signal as published (and drop the classifier tag)
        await supabase
          .from("raw_signals")
          .update({ status: "published", processed_at: new Date().toISOString(), error_message: null })
          .eq("id", signal.id);

        // Update pipeline stats
        // The router's LLM call is ~600 tokens and one more request; rule and
        // classifier decisions cost nothing here.
        const routerUsedLLM = section.source === "llm" || section.source === "fallback";
        await supabase.rpc("increment_pipeline_stats_safe", {
          p_date: today,
          p_tokens: 1200 + (routerUsedLLM ? 600 : 0),
          p_articles: 1,
          p_requests: 1 + (routerUsedLLM ? 1 : 0),
        }).then(({ error }) => {
          // Fallback if RPC doesn't exist yet
          if (error) {
            return supabase
              .from("pipeline_stats")
              .update({
                tokens_used: (statsRow?.tokens_used ?? 0) + 1200 * (published + 1),
                articles_generated: (statsRow?.articles_generated ?? 0) + published + 1,
                requests_made: (statsRow?.requests_made ?? 0) + published + rejected + 1,
                last_updated: new Date().toISOString(),
              })
              .eq("date", today);
          }
        });

        published++;
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to process signal ${signal.id}:`, errMsg);
        await supabase
          .from("raw_signals")
          .update({ status: "rejected", error_message: errMsg.slice(0, 500) })
          .eq("id", signal.id);
        rejected++;
      }

      // ── 4J: 15-second delay between articles ─────────
      if (idx < pendingSignals.length - 1 && !stopEarly) {
        await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
      }
    }

    // ── Final pipeline_stats update (direct, reliable) ──
    const { data: finalStats } = await supabase
      .from("pipeline_stats")
      .select("tokens_used")
      .eq("date", today)
      .maybeSingle();

    const finalTokensUsed = finalStats?.tokens_used ?? tokensUsedToday + published * 1200;

    // ── 4K: Return summary ──────────────────────────────
    return new Response(
      JSON.stringify({
        processed: published + rejected,
        published,
        rejected,
        waiting,
        tokens_used_today: finalTokensUsed,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-content fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Worker queue failure",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
