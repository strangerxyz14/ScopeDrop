import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";
import type {
  Article,
  BusinessCategory,
  GeminiDisruptorOutput,
  SupabaseWebhookInsertPayload,
} from "../_shared/types.ts";
import { requireSupabaseJwt } from "../_shared/auth.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DISRUPTOR_SYSTEM_PROMPT =
  "You are a contrarian VC. Analyze the news for asymmetric risk and founder playbooks. Do not summarize. Output valid JSON only.";

function safeJsonParse<T>(value: string): T {
  const trimmed = value.trim();
  const cleaned = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
    : trimmed;
  return JSON.parse(cleaned) as T;
}

function isBusinessCategory(value: unknown): value is BusinessCategory {
  return value === "Startup" || value === "Tech" || value === "Business" || value === "Case Study";
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildPrompt(article: Partial<Article>): string {
  const sourceUrls = Array.isArray(article.source_urls) ? article.source_urls : [];
  return [
    "Input article payload:",
    `title: ${article.title ?? ""}`,
    `summary: ${article.summary ?? ""}`,
    `source_urls: ${sourceUrls.join(", ")}`,
    "",
    "Return JSON with this exact schema:",
    "{",
    '  "contrarian_take": "string",',
    '  "asymmetric_risks": ["string"],',
    '  "founder_playbooks": ["string"],',
    '  "disconfirming_signals": ["string"],',
    '  "confidence_score": 0.0,',
    '  "category": "Startup|Tech|Business|Case Study",',
    '  "headline": "string",',
    '  "summary": "string",',
    '  "content_html": "string"',
    "}",
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY.",
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const authContext = await requireSupabaseJwt(req, {
      supabaseUrl,
      serviceRoleKey,
      anonKey,
      corsHeaders: CORS_HEADERS,
    });
    if (authContext instanceof Response) {
      return authContext;
    }

    const rawPayload = await req.json();
    const payload = (typeof rawPayload === "object" && rawPayload !== null)
      ? rawPayload as Partial<SupabaseWebhookInsertPayload<Partial<Article>>>
      : null;
    const record = payload?.record ?? null;

    if (!record?.id || !record.title) {
      return new Response(
        JSON.stringify({ ignored: true, reason: "No record payload found." }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const primarySourceUrl = Array.isArray(record.source_urls) && typeof record.source_urls[0] === "string"
      ? record.source_urls[0]
      : null;

    await supabase
      .from("articles")
      .update({ status: "analyzing" })
      .eq("id", record.id);
    if (primarySourceUrl) {
      await supabase
        .from("raw_signals")
        .update({ status: "analyzing" })
        .eq("source_url", primarySourceUrl);
    }

    const aiClient = new GoogleGenerativeAI(geminiApiKey);
    const model = aiClient.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      systemInstruction: DISRUPTOR_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    });

    const generated = await model.generateContent(buildPrompt(record));
    const rawText = generated.response.text();
    const parsed = safeJsonParse<Partial<GeminiDisruptorOutput>>(rawText);

    const confidenceScore = normalizeConfidence(parsed.confidence_score);
    const nextStatus = confidenceScore > 0.8 ? "published" : "rejected";
    const nextCategory = isBusinessCategory(parsed.category) ? parsed.category : (record.category ?? "Business");

    const metadataBase = record.ai_analysis_metadata &&
        typeof record.ai_analysis_metadata === "object" &&
        !Array.isArray(record.ai_analysis_metadata)
      ? record.ai_analysis_metadata as Record<string, unknown>
      : {};

    const metadata = {
      ...metadataBase,
      disruptor: {
        analyzed_at: new Date().toISOString(),
        confidence_score: confidenceScore,
        contrarian_take: typeof parsed.contrarian_take === "string" ? parsed.contrarian_take : "",
        asymmetric_risks: normalizeStringArray(parsed.asymmetric_risks),
        founder_playbooks: normalizeStringArray(parsed.founder_playbooks),
        disconfirming_signals: normalizeStringArray(parsed.disconfirming_signals),
        model: "gemini-1.5-pro-latest",
      },
    };

    const { error: updateError } = await supabase
      .from("articles")
      .update({
        title: typeof parsed.headline === "string" && parsed.headline.trim().length > 0 ? parsed.headline : record.title,
        summary: typeof parsed.summary === "string" && parsed.summary.trim().length > 0 ? parsed.summary : record.summary,
        content_html: typeof parsed.content_html === "string" ? parsed.content_html : record.content_html,
        category: nextCategory,
        status: nextStatus,
        ai_analysis_metadata: metadata,
      })
      .eq("id", record.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    if (primarySourceUrl) {
      await supabase
        .from("raw_signals")
        .update({
          status: nextStatus,
          signal_score: confidenceScore,
        })
        .eq("source_url", primarySourceUrl);
    }

    await supabase.from("agent_logs").insert({
      agent_name: "disruptor-analysis",
      action: "analyze_article",
      status: nextStatus,
      article_id: record.id,
      payload: {
        confidence_score: confidenceScore,
        category: nextCategory,
        role: authContext.role,
      },
    });

    return new Response(
      JSON.stringify({
        article_id: record.id,
        status: nextStatus,
        confidence_score: confidenceScore,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected disruptor-analysis failure.",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
