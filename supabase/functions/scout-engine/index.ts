import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function canonicalUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return raw.trim();
  }
}

function slugify(title: string, sourceUrl: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const suffix = Math.abs(Math.random().toString(36).slice(2, 10)).slice(0, 8);
  return `${base}-${suffix}`;
}

async function fetchPolygonNews(apiKey: string): Promise<any[]> {
  const response = await fetch(`https://api.polygon.io/v2/reference/news?limit=5&apiKey=${apiKey}`);
  if (!response.ok) throw new Error(`Polygon API failed: ${response.status}`);
  const data = await response.json();
  return data.results?.slice(0, 5) || [];
}

async function fetchFinnhubNews(apiKey: string): Promise<any[]> {
  const response = await fetch(`https://finnhub.io/api/v1/news?category=general&minId=0&token=${apiKey}`);
  if (!response.ok) throw new Error(`Finnhub API failed: ${response.status}`);
  const data = await response.json();
  return data.slice(0, 5);
}

async function fetchTechCrunchRSS(): Promise<any[]> {
  const response = await fetch("https://techcrunch.com/category/startups/feed/");
  if (!response.ok) throw new Error(`TechCrunch RSS failed: ${response.status}`);

  const xmlText = await response.text();
  const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/g)?.slice(0, 5) ?? [];

  const readTag = (block: string, tag: string): string => {
    const cdataMatch = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
    if (cdataMatch?.[1]) return cdataMatch[1].trim();

    const plainMatch = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return plainMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() ?? "";
  };

  return itemBlocks.map((block) => ({
    title: readTag(block, "title"),
    summary: readTag(block, "description"),
    sourceUrl: readTag(block, "link"),
    publishedAt: readTag(block, "pubDate"),
    category: "Startup",
  }));
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
    const polygonKey = Deno.env.get("POLYGON_API_KEY");
    const finnhubKey = Deno.env.get("FINNHUB_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !polygonKey || !finnhubKey) {
      return new Response(
        JSON.stringify({ error: "Missing required API keys" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch from all sources
    const [polygonNews, finnhubNews, techcrunchNews] = await Promise.all([
      fetchPolygonNews(polygonKey),
      fetchFinnhubNews(finnhubKey),
      fetchTechCrunchRSS()
    ]);

    // Process and insert raw signals
    const now = new Date().toISOString();
    const rawSignalRows = [];

    // Process Polygon news (Funding category)
    polygonNews.forEach((article) => {
      rawSignalRows.push({
        headline: article.title,
        summary: article.description || article.summary || "",
        source_url: canonicalUrl(article.article_url || article.url),
        category: "Business",
        signal_score: 0.8,
        status: "scouted",
        payload: {
          published_at: article.published_at,
          source: "polygon-api",
        },
        scouted_at: now,
      });
    });

    // Process Finnhub news (Business category)
    finnhubNews.forEach((article) => {
      rawSignalRows.push({
        headline: article.headline,
        summary: article.summary || "",
        source_url: canonicalUrl(article.url),
        category: "Business",
        signal_score: 0.7,
        status: "scouted",
        payload: {
          published_at: article.datetime,
          source: "finnhub-api",
        },
        scouted_at: now,
      });
    });

    // Process TechCrunch news (Startup category)
    techcrunchNews.forEach((article) => {
      rawSignalRows.push({
        headline: article.title,
        summary: article.summary,
        source_url: canonicalUrl(article.sourceUrl),
        category: "Startup",
        signal_score: 0.9,
        status: "scouted",
        payload: {
          published_at: article.publishedAt,
          source: "techcrunch-rss",
        },
        scouted_at: now,
      });
    });

    // Insert all raw signals
    const { error: rawSignalError } = await supabase
      .from("raw_signals")
      .upsert(rawSignalRows, { onConflict: "source_url" });

    if (rawSignalError) {
      return new Response(
        JSON.stringify({ error: rawSignalError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: {
          polygon: polygonNews.length,
          finnhub: finnhubNews.length,
          techcrunch: techcrunchNews.length,
          total: rawSignalRows.length
        }
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Scout engine failure",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
