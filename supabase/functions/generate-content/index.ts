import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://scopedrop.lovable.app",
  "https://id-preview--4acd3d99-4555-4448-bee8-897d547c57c0.lovable.app",
  ...(Deno.env.get("ENVIRONMENT") === "development"
    ? ["http://localhost:5173", "http://localhost:8080"]
    : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// ── 4D: Model fallback chain ──────────────────────────────
const MODELS = [
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "llama3-8b-8192",
];

const DAILY_TOKEN_BUDGET = 450_000;
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
  "category": "one of: funding | ai | markets | startups | policy",
  "read_time_minutes": 3,
  "tags": ["tag1", "tag2", "tag3"]
}`;

// ── Groq API call with model fallback ─────────────────────
interface GroqResult {
  text: string;
  remainingTokens: number;
  remainingRequests: number;
  resetTokens: string;
}

async function callGroq(
  apiKey: string,
  sanitizedContent: string,
  modelIndex: number,
  retriedFullChain: boolean
): Promise<GroqResult> {
  for (let i = modelIndex; i < MODELS.length; i++) {
    const model = MODELS[i];
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content:
              "Transform this news signal into ScopeDrop editorial content: " +
              sanitizedContent,
          },
        ],
      }),
    });

    // 4G: Handle 429
    if (res.status === 429) {
      console.warn(`429 from model ${model}, trying next...`);
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq ${res.status}: ${errText}`);
    }

    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";

    // 4F: Read rate limit headers
    const remainingTokens = parseInt(
      res.headers.get("x-ratelimit-remaining-tokens") ?? "999999",
      10
    );
    const remainingRequests = parseInt(
      res.headers.get("x-ratelimit-remaining-requests") ?? "999",
      10
    );
    const resetTokens =
      res.headers.get("x-ratelimit-reset-tokens") ?? "";

    return { text, remainingTokens, remainingRequests, resetTokens };
  }

  // All 3 models returned 429
  if (!retriedFullChain) {
    // Wait 60 seconds and retry the full chain once
    console.warn("All models 429 — waiting 60s for retry...");
    await new Promise((r) => setTimeout(r, 60_000));
    return callGroq(apiKey, sanitizedContent, 0, true);
  }

  throw new Error("429_all_models_exhausted");
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
    "category",
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
  if (typeof parsed.category !== "string") return "category not string";
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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GROQ_API_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 4A: Daily budget guard ────────────────────────────
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
    if (tokensUsedToday >= DAILY_TOKEN_BUDGET) {
      return new Response(
        JSON.stringify({
          processed: 0,
          published: 0,
          rejected: 0,
          paused: 0,
          tokens_used_today: tokensUsedToday,
          tokens_remaining_today: 0,
          reason: "daily_budget_reached",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── 4B: Fetch pending signals ─────────────────────────
    const { data: pendingSignals, error: fetchError } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
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
          paused: 0,
          tokens_used_today: tokensUsedToday,
          tokens_remaining_today: DAILY_TOKEN_BUDGET - tokensUsedToday,
          reason: "no_pending_signals",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    // ── Process each signal ───────────────────────────────
    let published = 0;
    let rejected = 0;
    let paused = 0;
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

        // ── 4E: Groq API call ───────────────────────────
        let groqResult: GroqResult;
        try {
          groqResult = await callGroq(groqApiKey, sanitized, 0, false);
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : String(e);
          if (errMsg === "429_all_models_exhausted") {
            await supabase
              .from("raw_signals")
              .update({ status: "paused", error_message: "429_all_models_exhausted" })
              .eq("id", signal.id);
            paused++;
            // 4J: Delay
            if (idx < pendingSignals.length - 1) {
              await new Promise((r) => setTimeout(r, INTER_ARTICLE_DELAY_MS));
            }
            continue;
          }
          throw e;
        }

        // ── 4F: Rate limit headroom check ───────────────
        if (groqResult.remainingTokens < 2000 || groqResult.remainingRequests < 2) {
          console.warn("Rate limit headroom low — stopping early");
          stopEarly = true;
          // Still process THIS signal's response, just don't do more after
        }

        // ── 4H: Parse and validate ──────────────────────
        let parsed: any;
        try {
          parsed = safeJsonParse(groqResult.text);
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

        // ── 4I: Insert article ──────────────────────────
        const { error: insertError } = await supabase.from("articles").insert({
          headline: parsed.homepage_headline,
          summary: parsed.homepage_summary,
          content_html: parsed.article_html,
          category: parsed.category,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
          read_time_minutes:
            typeof parsed.read_time_minutes === "number"
              ? Math.max(2, Math.min(8, parsed.read_time_minutes))
              : 3,
          source_signal_id: signal.id,
          status: "published",
        });

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

        // Mark signal as published
        await supabase
          .from("raw_signals")
          .update({ status: "published", processed_at: new Date().toISOString() })
          .eq("id", signal.id);

        // Update pipeline stats
        await supabase.rpc("increment_pipeline_stats_safe", {
          p_date: today,
          p_tokens: 1200,
          p_articles: 1,
          p_requests: 1,
        }).then(({ error }) => {
          // Fallback if RPC doesn't exist yet
          if (error) {
            return supabase
              .from("pipeline_stats")
              .update({
                tokens_used: (statsRow?.tokens_used ?? 0) + 1200 * (published + 1),
                articles_generated: (statsRow?.articles_generated ?? 0) + published + 1,
                requests_made: (statsRow?.requests_made ?? 0) + published + rejected + paused + 1,
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
        processed: published + rejected + paused,
        published,
        rejected,
        paused,
        tokens_used_today: finalTokensUsed,
        tokens_remaining_today: Math.max(0, DAILY_TOKEN_BUDGET - finalTokensUsed),
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
