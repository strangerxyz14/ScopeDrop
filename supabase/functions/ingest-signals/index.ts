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
  suggested_category?: string;
  suggested_tags?: string[];
}

// ─────────────────────────────────────────────────────────────
// RELEVANCE FILTER
// ─────────────────────────────────────────────────────────────
const REJECT_TITLE_WORDS = [
  "celebrity","music","artist","travel","food","sport","sports",
  "entertainment","movie","film","recipe","fashion","beauty",
  "lifestyle","gossip","bollywood","box office","nfl","nba","cricket",
];

const REJECT_DOMAINS = [
  "tmz.com","billboard.com","espn.com","buzzfeed.com",
  "dailymail.co.uk","people.com","eonline.com",
];

const REQUIRE_ONE_OF = [
  "startup","founder","funding","investment","venture","capital",
  "acquisition","ipo","valuation","saas","ai","tech","developer",
  "product","launch","series a","series b","series c","raise","raised",
  "billion","million","platform","enterprise","infrastructure","cloud",
  "fintech","deeptech","b2b",
];

function isRelevant(title: string, rawContent: string, sourceUrl: string): boolean {
  const titleLow = title.toLowerCase();
  const combined = (titleLow + " " + rawContent.toLowerCase());

  // Reject by title keywords
  if (REJECT_TITLE_WORDS.some((w) => titleLow.includes(w))) return false;

  // Reject by domain
  try {
    const domain = new URL(sourceUrl).hostname.replace(/^www\./, "");
    if (REJECT_DOMAINS.includes(domain)) return false;
  } catch { /* invalid URL — let it through */ }

  // Must contain at least one relevant keyword
  return REQUIRE_ONE_OF.some((w) => combined.includes(w));
}

// ─────────────────────────────────────────────────────────────
// CATEGORY DETECTION (Hacker News + general)
// ─────────────────────────────────────────────────────────────
function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (/raise|funding|series|vc|capital/.test(t)) return "funding";
  if (/ai|gpt|llm|model|neural/.test(t)) return "ai";
  if (/acquire|acquisition|merger/.test(t)) return "acquisitions";
  if (/market|ipo|valuation|revenue/.test(t)) return "markets";
  return "tech";
}

// ─────────────────────────────────────────────────────────────
// SOURCE 1 — GNews (existing, kept as-is)
// ─────────────────────────────────────────────────────────────
async function fetchGNews(apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://gnews.io/api/v4/top-headlines?lang=en&max=10&topic=technology&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews HTTP ${res.status}`);
  const json = await res.json();
  return (json.articles ?? []).map((a: any) => ({
    title: a.title ?? "",
    raw_content: a.description ?? a.content ?? "",
    source_url: a.url ?? "",
    source_name: a.source?.name ?? "GNews",
    status: "pending",
  }));
}

// ─────────────────────────────────────────────────────────────
// SOURCE 2 — Finnhub (existing, kept as-is)
// ─────────────────────────────────────────────────────────────
async function fetchFinnhub(apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://finnhub.io/api/v1/news?category=technology&token=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const items: any[] = await res.json();
  return items.slice(0, 10).map((a) => ({
    title: a.headline ?? "",
    raw_content: a.summary ?? "",
    source_url: a.url ?? "",
    source_name: a.source ?? "Finnhub",
    status: "pending",
  }));
}

// ─────────────────────────────────────────────────────────────
// SOURCE 3 — Hacker News
// ─────────────────────────────────────────────────────────────
async function fetchHNList(
  endpoint: string,
  limit: number,
  defaultTags: string[]
): Promise<RawSignalRow[]> {
  const res = await fetch(endpoint);
  if (!res.ok) throw new Error(`HN list HTTP ${res.status}`);
  const ids: number[] = await res.json();
  const top = ids.slice(0, limit);

  const items = await Promise.all(
    top.map((id) =>
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then((r) => r.json())
        .catch(() => null)
    )
  );

  return items
    .filter((s: any) => s && s.type === "story" && s.url && (s.score ?? 0) >= 50)
    .map((s: any) => ({
      title: s.title ?? "",
      raw_content: (s.title ?? "") + " " + (s.text ?? ""),
      source_url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`,
      source_name: "Hacker News",
      status: "pending",
      suggested_category: detectCategory(s.title ?? ""),
      suggested_tags: defaultTags,
    }));
}

async function fetchHackerNews(): Promise<RawSignalRow[]> {
  const [top, show, jobs] = await Promise.all([
    fetchHNList("https://hacker-news.firebaseio.com/v0/topstories.json", 15, []),
    fetchHNList("https://hacker-news.firebaseio.com/v0/showstories.json", 10, ["launch","product","saas"]),
    fetchHNList("https://hacker-news.firebaseio.com/v0/jobstories.json", 5, ["hiring","startups","growth"]),
  ]);
  return [...top, ...show, ...jobs];
}

// ─────────────────────────────────────────────────────────────
// SOURCE 4 — RSS Feeds
// ─────────────────────────────────────────────────────────────
interface RSSFeedConfig {
  url: string;
  source_name: string;
  suggested_category: string;
  suggested_tags: string[];
}

function parseRSSItems(xml: string, maxItems: number): Array<{ title: string; description: string; link: string }> {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];

  function readTag(block: string, tag: string): string {
    const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"));
    if (cdata?.[1]) return cdata[1].trim();
    const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return plain?.[1]?.replace(/<[^>]+>/g, "").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&").trim() ?? "";
  }

  return items.slice(0, maxItems).map((block) => ({
    title: readTag(block, "title"),
    description: readTag(block, "description"),
    link: readTag(block, "link"),
  })).filter((i) => i.title && i.link);
}

async function fetchRSSFeed(config: RSSFeedConfig): Promise<RawSignalRow[]> {
  const res = await fetch(config.url, { headers: { "User-Agent": "ScopeDrop/1.0" } });
  if (!res.ok) throw new Error(`RSS ${config.url} HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseRSSItems(xml, 8);
  return items.map((item) => ({
    title: item.title,
    raw_content: item.title + " " + item.description,
    source_url: item.link,
    source_name: config.source_name,
    status: "pending",
    suggested_category: config.suggested_category,
    suggested_tags: config.suggested_tags,
  }));
}

async function fetchRSSFeeds(): Promise<RawSignalRow[]> {
  const feeds: RSSFeedConfig[] = [
    { url: "https://techcrunch.com/startups/feed/", source_name: "TechCrunch Startups", suggested_category: "startups", suggested_tags: ["startups","funding"] },
    { url: "https://techcrunch.com/category/venture/feed/", source_name: "TechCrunch Venture", suggested_category: "funding", suggested_tags: ["funding","vc","venture"] },
    { url: "https://techcrunch.com/category/artificial-intelligence/feed/", source_name: "TechCrunch AI", suggested_category: "ai", suggested_tags: ["ai","deeptech"] },
    { url: "https://www.producthunt.com/feed", source_name: "Product Hunt", suggested_category: "tech", suggested_tags: ["launch","product","saas"] },
    { url: "https://hnrss.org/launches", source_name: "HN Launches", suggested_category: "tech", suggested_tags: ["launch","developer","saas"] },
  ];

  const results = await Promise.all(
    feeds.map((f) => fetchRSSFeed(f).catch((e) => {
      console.error(`RSS feed ${f.source_name} error:`, e instanceof Error ? e.message : e);
      return [] as RawSignalRow[];
    }))
  );
  return results.flat();
}

// ─────────────────────────────────────────────────────────────
// SOURCE 5 — DEV.to
// ─────────────────────────────────────────────────────────────
interface DevToConfig {
  tag: string;
  suggested_category: string;
  suggested_tags: string[];
}

async function fetchDevToTag(config: DevToConfig, apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://dev.to/api/articles?tag=${config.tag}&per_page=8`;
  const res = await fetch(url, { headers: { "api-key": apiKey } });
  if (!res.ok) throw new Error(`DEV.to tag=${config.tag} HTTP ${res.status}`);
  const articles: any[] = await res.json();
  return articles
    .filter((a) => (a.positive_reactions_count ?? 0) >= 10)
    .map((a) => ({
      title: a.title ?? "",
      raw_content: a.title + " " + (a.description ?? (Array.isArray(a.tag_list) ? a.tag_list.join(" ") : "")),
      source_url: a.url ?? "",
      source_name: "DEV.to",
      status: "pending",
      suggested_category: config.suggested_category,
      suggested_tags: config.suggested_tags,
    }));
}

async function fetchDevTo(apiKey: string): Promise<RawSignalRow[]> {
  const configs: DevToConfig[] = [
    { tag: "startup", suggested_category: "startups", suggested_tags: ["startups","developer"] },
    { tag: "techstack", suggested_category: "tech", suggested_tags: ["tech","developer","infrastructure"] },
    { tag: "ai", suggested_category: "ai", suggested_tags: ["ai","developer","saas"] },
  ];
  const results = await Promise.all(
    configs.map((c) => fetchDevToTag(c, apiKey).catch((e) => {
      console.error(`DEV.to tag=${c.tag} error:`, e instanceof Error ? e.message : e);
      return [] as RawSignalRow[];
    }))
  );
  return results.flat();
}

// ─────────────────────────────────────────────────────────────
// SOURCE 6 — NewsData.io
// ─────────────────────────────────────────────────────────────
interface NewsDataConfig {
  params: string;
  suggested_category: string;
  suggested_tags: string[];
}

async function fetchNewsDataQuery(config: NewsDataConfig, apiKey: string): Promise<RawSignalRow[]> {
  const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&language=en&${config.params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsData.io HTTP ${res.status}`);
  const json = await res.json();
  const articles: any[] = (json.results ?? []).slice(0, 5);
  return articles.map((a) => ({
    title: a.title ?? "",
    raw_content: a.title + " " + (a.description ?? ""),
    source_url: a.link ?? "",
    source_name: "NewsData.io",
    status: "pending",
    suggested_category: config.suggested_category,
    suggested_tags: config.suggested_tags,
  }));
}

async function fetchNewsData(apiKey: string): Promise<RawSignalRow[]> {
  const configs: NewsDataConfig[] = [
    { params: "category=technology&q=startup+funding", suggested_category: "funding", suggested_tags: ["funding","startups"] },
    { params: "category=business&q=acquisition+tech+company", suggested_category: "acquisitions", suggested_tags: ["acquisition","enterprise"] },
    { params: "category=technology&q=AI+startup", suggested_category: "ai", suggested_tags: ["ai","deeptech"] },
    { params: "category=business&q=IPO+valuation+tech", suggested_category: "markets", suggested_tags: ["ipo","markets"] },
  ];
  const results = await Promise.all(
    configs.map((c) => fetchNewsDataQuery(c, apiKey).catch((e) => {
      console.error(`NewsData.io query error:`, e instanceof Error ? e.message : e);
      return [] as RawSignalRow[];
    }))
  );
  return results.flat();
}

// ─────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────
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
    const devtoApiKey = Deno.env.get("DEVTO_API_KEY");
    const newsdataApiKey = Deno.env.get("NEWSDATA_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Run all 6 sources in parallel ──
    const [gnewsRaw, finnhubRaw, hnRaw, rssRaw, devtoRaw, newsdataRaw] = await Promise.all([
      gnewsApiKey
        ? fetchGNews(gnewsApiKey).catch((e) => { console.error("GNews error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; })
        : Promise.resolve([] as RawSignalRow[]),
      finnhubApiKey
        ? fetchFinnhub(finnhubApiKey).catch((e) => { console.error("Finnhub error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; })
        : Promise.resolve([] as RawSignalRow[]),
      fetchHackerNews().catch((e) => { console.error("HackerNews error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; }),
      fetchRSSFeeds().catch((e) => { console.error("RSS error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; }),
      devtoApiKey
        ? fetchDevTo(devtoApiKey).catch((e) => { console.error("DEV.to error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; })
        : Promise.resolve([] as RawSignalRow[]),
      newsdataApiKey
        ? fetchNewsData(newsdataApiKey).catch((e) => { console.error("NewsData error:", e instanceof Error ? e.message : e); return [] as RawSignalRow[]; })
        : Promise.resolve([] as RawSignalRow[]),
    ]);

    const sourceGroups = {
      gnews: gnewsRaw,
      finnhub: finnhubRaw,
      hacker_news: hnRaw,
      rss_feeds: rssRaw,
      devto: devtoRaw,
      newsdata: newsdataRaw,
    };

    // ── Per-source counters ──
    const stats: Record<string, { fetched: number; inserted: number }> = {};
    for (const key of Object.keys(sourceGroups)) {
      stats[key] = { fetched: 0, inserted: 0 };
    }

    let totalFetched = 0;
    let totalInserted = 0;
    let skippedDuplicate = 0;
    let skippedRelevance = 0;

    // ── Collect all existing URLs in one query for dedup ──
    const allRaw = Object.entries(sourceGroups).flatMap(([k, rows]) => rows.map((r) => ({ ...r, _src: k })));
    const candidateUrls = allRaw.map((r) => r.source_url).filter(Boolean);

    const { data: existingRows } = await supabase
      .from("raw_signals")
      .select("source_url")
      .in("source_url", candidateUrls);

    const existingUrls = new Set((existingRows ?? []).map((r: any) => r.source_url));

    // ── Insert loop ──
    for (const [srcKey, rows] of Object.entries(sourceGroups)) {
      stats[srcKey].fetched = rows.length;
      totalFetched += rows.length;

      for (const signal of rows) {
        if (!signal.source_url || !signal.title) { skippedRelevance++; continue; }

        // Relevance filter
        if (!isRelevant(signal.title, signal.raw_content, signal.source_url)) {
          skippedRelevance++;
          continue;
        }

        // Dedup
        if (existingUrls.has(signal.source_url)) { skippedDuplicate++; continue; }
        existingUrls.add(signal.source_url); // prevent duplicate within this batch

        const { _src: _, ...row } = signal as any;
        const { error: insertError } = await supabase.from("raw_signals").insert(row);

        if (insertError) {
          console.error(`Insert error (${srcKey}):`, insertError.message);
          skippedDuplicate++;
        } else {
          stats[srcKey].inserted++;
          totalInserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        sources: stats,
        total_fetched: totalFetched,
        total_inserted: totalInserted,
        skipped_duplicate: skippedDuplicate,
        skipped_relevance: skippedRelevance,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ingest-signals fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
