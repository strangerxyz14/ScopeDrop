import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { BusinessCategory, ScoutNewsCandidate } from "../_shared/types.ts";
import { requireSupabaseJwt } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  "https://scopedrop.lovable.app",
  "https://id-preview--4acd3d99-4555-4448-bee8-897d547c57c0.lovable.app",
  ...(Deno.env.get("ENVIRONMENT") === "development" ? ["http://localhost:5173", "http://localhost:8080"] : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const DEFAULT_NEWS_API_URL =
  "https://api.spaceflightnewsapi.net/v4/articles/?limit=40&has_event=false&has_launch=false";

const FLUFF_REGEX =
  /\b(sponsored|advertorial|promotion|promoted|top\s*\d+|best\s+\w+|listicle|roundup|gift\s+guide|coupon|deal|buy\s+now|affiliate)\b/i;
const SIGNAL_REGEX =
  /\b(raise[sd]?|funding|acquir(ed|es|ing)|merger|earnings|layoff|bankrupt|ipo|regulat(or|ion)|antitrust|launch|pricing|margin|profit|churn|burn\s+rate|unit\s+economics|enterprise|strategy)\b/i;

const CATEGORY_RULES: Array<{ category: BusinessCategory; regex: RegExp }> = [
  { category: "Case Study", regex: /\b(case study|playbook|turnaround|post[- ]mortem)\b/i },
  { category: "Startup", regex: /\b(startup|founder|seed|series\s+[a-f]|venture|vc)\b/i },
  { category: "Tech", regex: /\b(ai|chip|software|cloud|cyber|open source|model|platform)\b/i },
];

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) return 25;
  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(Math.floor(parsed), 100);
}

function readString(
  input: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizePayload(payload: unknown): ScoutNewsCandidate[] {
  const asObject = typeof payload === "object" && payload !== null
    ? payload as Record<string, unknown>
    : null;
  const records = Array.isArray(payload)
    ? payload
    : Array.isArray(asObject?.articles)
    ? asObject?.articles
    : Array.isArray(asObject?.results)
    ? asObject?.results
    : Array.isArray(asObject?.data)
    ? asObject?.data
    : [];

  return records
    .map((row) => {
      const item = (typeof row === "object" && row !== null)
        ? row as Record<string, unknown>
        : null;
      if (!item) return null;

      const title = readString(item, ["title", "headline", "name"]);
      const summary = readString(item, ["summary", "description", "excerpt"]) ?? "";
      const sourceUrl = readString(item, ["url", "link", "source_url", "news_url"]);
      const publishedAt = readString(item, ["published_at", "publishedAt", "date"]);

      if (!title || !sourceUrl) return null;

      return {
        title,
        summary,
        sourceUrl,
        publishedAt,
      };
    })
    .filter((candidate): candidate is ScoutNewsCandidate => candidate !== null);
}

function canonicalUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw.trim();
  }
}

function isHighSignal(candidate: ScoutNewsCandidate): boolean {
  const text = `${candidate.title} ${candidate.summary}`.trim();
  if (text.length < 40) return false;
  if (FLUFF_REGEX.test(text)) return false;

  const summaryWordCount = candidate.summary.split(/\s+/).filter(Boolean).length;
  const hasSignalKeywords = SIGNAL_REGEX.test(text);
  const hasNumericSignal = /\$\d+|\b\d+%\b|\bseries\s+[a-f]\b/i.test(text);

  return (hasSignalKeywords || hasNumericSignal) && summaryWordCount >= 8;
}

function scoreSignal(candidate: ScoutNewsCandidate): number {
  const text = `${candidate.title} ${candidate.summary}`;
  let score = 0.3;
  if (SIGNAL_REGEX.test(text)) score += 0.35;
  if (/\$\d+|\b\d+%\b|\bseries\s+[a-f]\b/i.test(text)) score += 0.2;
  if (candidate.summary.split(/\s+/).filter(Boolean).length >= 15) score += 0.15;
  return Math.min(1, score);
}

function classifyCategory(candidate: ScoutNewsCandidate): BusinessCategory {
  const text = `${candidate.title} ${candidate.summary}`;
  for (const rule of CATEGORY_RULES) {
    if (rule.regex.test(text)) return rule.category;
  }
  return "Business";
}

function hashSeed(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function slugify(title: string, sourceUrl: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const suffix = hashSeed(sourceUrl).slice(0, 8);
  return `${base}-${suffix}`;
}

function dedupe(candidates: ScoutNewsCandidate[]): ScoutNewsCandidate[] {
  const seen = new Set<string>();
  const unique: ScoutNewsCandidate[] = [];

  for (const candidate of candidates) {
    const key = `${candidate.title.toLowerCase()}::${canonicalUrl(candidate.sourceUrl).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(candidate);
  }

  return unique;
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." }),
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

    const apiUrl = Deno.env.get("SCOUT_NEWS_API_URL") ?? DEFAULT_NEWS_API_URL;
    const limit = parseLimit(new URL(req.url).searchParams.get("limit"));

    const response = await fetch(apiUrl, { method: "GET" });
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `News source failed with status ${response.status}.` }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const payload = await response.json();
    const normalized = dedupe(normalizePayload(payload)).slice(0, limit * 3);
    const highSignal = normalized.filter(isHighSignal).slice(0, limit);

    if (highSignal.length === 0) {
      return new Response(
        JSON.stringify({
          scanned_count: normalized.length,
          inserted_count: 0,
          message: "No high-signal stories passed Scout filters.",
        }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const now = new Date().toISOString();
    const rows = highSignal.map((candidate) => ({
      title: candidate.title,
      slug: slugify(candidate.title, canonicalUrl(candidate.sourceUrl)),
      content_html: null,
      summary: candidate.summary.slice(0, 600),
      category: classifyCategory(candidate),
      status: "scouted",
      source_urls: [canonicalUrl(candidate.sourceUrl)],
      ai_analysis_metadata: {
        scout: {
          source: "placeholder-news-api",
          fetched_at: now,
          published_at: candidate.publishedAt,
          signal_score: scoreSignal(candidate),
        },
      },
    }));
    const rawSignalRows = highSignal.map((candidate) => ({
      headline: candidate.title,
      summary: candidate.summary.slice(0, 600),
      source_url: canonicalUrl(candidate.sourceUrl),
      category: classifyCategory(candidate),
      signal_score: scoreSignal(candidate),
      status: "scouted",
      payload: {
        published_at: candidate.publishedAt,
        source: "placeholder-news-api",
      },
      scouted_at: now,
    }));

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: rawSignalError } = await supabase
      .from("raw_signals")
      .upsert(rawSignalRows, { onConflict: "source_url" });
    if (rawSignalError) {
      return new Response(
        JSON.stringify({ error: rawSignalError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data, error } = await supabase
      .from("articles")
      .upsert(rows, { onConflict: "slug" })
      .select("id,slug,status");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    await supabase.from("agent_logs").insert({
      agent_name: "scout-engine",
      action: "scout_batch",
      status: "success",
      article_id: null,
      payload: {
        scanned_count: normalized.length,
        inserted_count: data?.length ?? 0,
        authenticated_role: authContext.role,
      },
    });

    return new Response(
      JSON.stringify({
        scanned_count: normalized.length,
        raw_signal_count: rawSignalRows.length,
        inserted_count: data?.length ?? 0,
        records: data ?? [],
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected scout-engine failure.",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
