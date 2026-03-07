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

interface RawSignalRow {
  title: string;
  raw_content: string;
  source_url: string;
  source_name: string;
  status: string;
}

// ── GNews fetcher ──────────────────────────────────────────
async function fetchGNews(apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://gnews.io/api/v4/top-headlines?lang=en&max=10&topic=technology&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`GNews HTTP ${res.status}: ${await res.text()}`);
    return [];
  }
  const json = await res.json();
  const articles: any[] = json.articles ?? [];
  return articles.map((a) => ({
    title: a.title ?? "",
    raw_content: a.description ?? a.content ?? "",
    source_url: a.url ?? "",
    source_name: a.source?.name ?? "GNews",
    status: "pending",
  }));
}

// ── Finnhub fetcher ────────────────────────────────────────
async function fetchFinnhub(apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://finnhub.io/api/v1/news?category=technology&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Finnhub HTTP ${res.status}: ${await res.text()}`);
    return [];
  }
  const items: any[] = await res.json();
  return items.slice(0, 10).map((a) => ({
    title: a.headline ?? "",
    raw_content: a.summary ?? "",
    source_url: a.url ?? "",
    source_name: a.source ?? "Finnhub",
    status: "pending",
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
    const gnewsApiKey = Deno.env.get("GNEWS_API_KEY");
    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Collect raw signals from all sources ──
    const allSignals: RawSignalRow[] = [];

    if (gnewsApiKey) {
      try {
        const gnewsSignals = await fetchGNews(gnewsApiKey);
        allSignals.push(...gnewsSignals);
      } catch (e) {
        console.error("GNews fetch error:", e);
      }
    } else {
      console.warn("GNEWS_API_KEY not set — skipping GNews");
    }

    if (finnhubApiKey) {
      try {
        const finnhubSignals = await fetchFinnhub(finnhubApiKey);
        allSignals.push(...finnhubSignals);
      } catch (e) {
        console.error("Finnhub fetch error:", e);
      }
    }

    // ── Deduplicate & insert ──
    let inserted = 0;
    let skipped = 0;

    for (const signal of allSignals) {
      if (!signal.source_url || !signal.title) {
        skipped++;
        continue;
      }

      // Check if source_url already exists
      const { data: existing } = await supabase
        .from("raw_signals")
        .select("id")
        .eq("source_url", signal.source_url)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error: insertError } = await supabase
        .from("raw_signals")
        .insert(signal);

      if (insertError) {
        // Likely a unique constraint violation from a race condition — skip
        console.error(`Insert error for ${signal.source_url}:`, insertError.message);
        skipped++;
      } else {
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({ inserted, skipped }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ingest-signals error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
