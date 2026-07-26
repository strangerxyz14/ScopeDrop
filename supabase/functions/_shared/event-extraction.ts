// ============================================================
// Shared event-extraction primitives used by both fetch-events
// (SerpAPI path) and extract-structured (editorial-blog path).
//
// - classifyEventRelevance: Groq gate, framed as "What's the Scope"
//   (founder-facing note) rather than a generic classification.
// - geocodeAddress: Nominatim wrapper with permanent cache in
//   public.geocode_cache. Respects 1 req/sec, sends real User-Agent.
// - fetchOrganizerFromHtml: extracts organizer name/logo from
//   schema.org Event JSON-LD or OpenGraph tags.
// - extractAgendaFromHtml: parses explicit time-referenced schedules
//   into the agenda jsonb shape. Returns null if none present.
// - extractSpeakersFromHtml: extracts named individuals from Event
//   JSON-LD `performer` blocks. Returns null if none present.
// - lookupLogoDev: builds the Logo.dev URL for a domain — cheap,
//   no network call from here (the URL itself is the CDN).
// ============================================================
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------------------------------
// Relevance classifier (shared across SerpAPI + editorial-blog paths)
// ------------------------------------------------------------
export interface RelevanceVerdict {
  relevant: boolean;
  category: string;
  scope: string; // "What's the Scope" — founder-facing note on why this event matters
}

const RELEVANCE_SYSTEM_PROMPT = `You are a content curator for ScopeDrop, a platform covering AI, technology, startups, crypto, and emerging tech — specifically founder-relevant and investor-relevant events (demo days, hackathons, tech conferences, startup meetups, crypto/web3 events, AI builder communities). You do NOT cover general business events, unrelated consumer events, concerts, sports, or generic networking with no tech/startup angle.

Given an event's title and description, respond ONLY with JSON:
{"relevant": true|false, "category": "ai"|"startup"|"crypto"|"emerging_tech"|"other", "scope": "one short sentence explaining why a founder or investor should care"}

If relevant is false, "scope" should still be one short sentence explaining WHY it's off-topic — this is useful for spot-audits.`;

export async function classifyEventRelevance(title: string, description: string): Promise<RelevanceVerdict> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) return { relevant: false, category: "other", scope: "GROQ_API_KEY not set" };

  const userContent = `Event title: ${title}\nEvent description: ${description || "(no description)"}`;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: RELEVANCE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        temperature: 0,
        max_tokens: 160,
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`Groq classifier non-ok: ${res.status} ${err.slice(0, 200)}`);
      return { relevant: false, category: "other", scope: `classifier http ${res.status}` };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return { relevant: false, category: "other", scope: "classifier returned no content" };
    }
    const parsed = JSON.parse(content) as Partial<RelevanceVerdict>;
    if (typeof parsed.relevant !== "boolean") {
      return { relevant: false, category: "other", scope: "classifier response malformed" };
    }
    return {
      relevant: parsed.relevant,
      category: typeof parsed.category === "string" ? parsed.category : "other",
      scope: typeof parsed.scope === "string" ? parsed.scope : "",
    };
  } catch (err) {
    console.warn("classifier threw:", err);
    return { relevant: false, category: "other", scope: "classifier error" };
  }
}

// ------------------------------------------------------------
// Geocoding: Nominatim with permanent cache.
// Nominatim requires a valid User-Agent and asks callers to respect
// 1 request/second. We enforce that here with a small in-process
// throttle and cache every result (successful or not) in
// public.geocode_cache so the same address never hits Nominatim
// twice, regardless of which function or invocation triggered it.
// ------------------------------------------------------------
let lastNominatimCallMs = 0;
async function throttleNominatim() {
  const gap = Date.now() - lastNominatimCallMs;
  if (gap < 1100) {
    await new Promise(r => setTimeout(r, 1100 - gap));
  }
  lastNominatimCallMs = Date.now();
}

export function normalizeAddress(address: string, city: string | null): string {
  const raw = [address, city].filter(Boolean).join(", ");
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function geocodeAddress(
  supabase: SupabaseClient,
  address: string | null,
  city: string | null,
): Promise<{ lat: number; lng: number } | null> {
  if (!address && !city) return null;
  const norm = normalizeAddress(address ?? "", city);
  if (!norm) return null;

  // Cache hit?
  const { data: cached } = await supabase
    .from("geocode_cache")
    .select("lat, lng, ok")
    .eq("address_norm", norm)
    .maybeSingle();
  if (cached) {
    if (!cached.ok || cached.lat == null || cached.lng == null) return null;
    return { lat: Number(cached.lat), lng: Number(cached.lng) };
  }

  // Miss — hit Nominatim once, cache the result (positive or negative).
  await throttleNominatim();
  try {
    const q = new URLSearchParams({ q: [address, city].filter(Boolean).join(", "), format: "json", limit: "1" });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${q.toString()}`, {
      headers: {
        // Nominatim policy: identify yourself with a real UA + contact.
        "User-Agent": "ScopeDrop/1.0 (events geocoder; ops@scopedrop)",
        "Accept": "application/json",
      },
    });
    if (!res.ok) {
      await supabase.from("geocode_cache").insert({ address_norm: norm, lat: null, lng: null, ok: false });
      return null;
    }
    const data = await res.json() as Array<{ lat?: string; lon?: string }>;
    if (!Array.isArray(data) || data.length === 0 || !data[0].lat || !data[0].lon) {
      await supabase.from("geocode_cache").insert({ address_norm: norm, lat: null, lng: null, ok: false });
      return null;
    }
    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);
    if (!isFinite(lat) || !isFinite(lng)) {
      await supabase.from("geocode_cache").insert({ address_norm: norm, lat: null, lng: null, ok: false });
      return null;
    }
    await supabase.from("geocode_cache").insert({ address_norm: norm, lat, lng, ok: true });
    return { lat, lng };
  } catch (err) {
    console.warn("geocode threw for:", norm, err);
    // Don't cache network errors — allow retry next time.
    return null;
  }
}

// ------------------------------------------------------------
// Organizer + logo extraction from event page HTML.
// Prefers schema.org Event.organizer.name; falls back to og:site_name.
// ------------------------------------------------------------
interface OrganizerInfo {
  name: string | null;
  domain: string | null;
  logoUrl: string | null;
}

function extractJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else if (parsed && typeof parsed === "object" && "@graph" in parsed && Array.isArray((parsed as { "@graph"?: unknown[] })["@graph"])) {
        blocks.push(...((parsed as { "@graph": unknown[] })["@graph"]));
      } else blocks.push(parsed);
    } catch { /* skip malformed JSON-LD */ }
  }
  return blocks;
}

function isEvent(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== "object") return false;
  const t = (v as { "@type"?: unknown })["@type"];
  if (typeof t === "string") return /event/i.test(t);
  if (Array.isArray(t)) return t.some(x => typeof x === "string" && /event/i.test(x));
  return false;
}

function extractOgTag(html: string, property: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]*content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  return m ? m[1] : null;
}

function domainFromUrl(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** Logo.dev CDN URL for a bare domain. Never called from JS — used as an <img src> at render time. */
export function logoDevUrl(domain: string): string {
  return `https://img.logo.dev/${domain}?token=pk_LtDkNs45SgSK-RyN7Vf7Aw&size=200&format=png`;
}

// Google Maps / Google Image search thumbnail hosts — these leak into
// SerpAPI's `thumbnail` field for events without proper hero art and
// render as blurry tiles or literal map screenshots. Blacklist so we
// fall through to a real og:image scrape.
const BAD_IMAGE_HOSTS = [
  "google.com/maps",
  "maps.googleapis.com",
  "maps.gstatic.com",
  "encrypted-tbn0.gstatic.com",
  "encrypted-tbn1.gstatic.com",
  "encrypted-tbn2.gstatic.com",
  "encrypted-tbn3.gstatic.com",
];

export function isUsableImageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  const low = url.toLowerCase();
  return !BAD_IMAGE_HOSTS.some((host) => low.includes(host));
}

// Prefer schema.org Event.image → og:image → twitter:image. Runs against
// the same HTML we already fetched for organizer/agenda extraction, so
// there's no extra network cost.
export function extractCoverImageFromHtml(html: string): string | null {
  const blocks = extractJsonLdBlocks(html);
  const event = blocks.find(isEvent) as Record<string, unknown> | undefined;
  if (event) {
    const img = event.image;
    if (typeof img === "string" && isUsableImageUrl(img)) return img;
    if (Array.isArray(img) && img.length > 0) {
      const first = img[0];
      if (typeof first === "string" && isUsableImageUrl(first)) return first;
      if (first && typeof first === "object" && typeof (first as Record<string, unknown>).url === "string") {
        const u = (first as Record<string, unknown>).url as string;
        if (isUsableImageUrl(u)) return u;
      }
    }
  }
  const og = extractOgTag(html, "image");
  if (og && isUsableImageUrl(og)) return og;
  const tw = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
  if (tw?.[1] && isUsableImageUrl(tw[1])) return tw[1];
  return null;
}

// Fix descriptions where the source page's HTML sections were concatenated
// without whitespace (e.g. "About the EventMastering Generative and…" →
// "About the Event\n\nMastering Generative and…"). Also collapses runs of
// spaces and trims. Conservative: only inserts a break at lower→Upper
// boundaries longer than 1 char, so acronyms like "AIStack" stay together.
export function cleanConcatenatedText(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  let out = raw
    // Decode common HTML entities first
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    // Break lowercase→Uppercase transitions ("EventMastering" → "Event Mastering")
    .replace(/([a-z]{2,})([A-Z][a-z])/g, "$1\n\n$2")
    // Break all-caps acronym followed by capitalized word ("AIUnderstand" → "AI Understand")
    .replace(/([A-Z]{2,})([A-Z][a-z])/g, "$1 $2")
    // Break sentence-terminator directly against next capital ("action.Advanced")
    .replace(/([.!?])([A-Z])/g, "$1 $2")
    // Break digit-run followed by capital ("2026Introduction" → "2026 Introduction")
    .replace(/(\d)([A-Z][a-z])/g, "$1\n\n$2")
    // Break word directly followed by digit run ≥4 ("Workshop2026" → "Workshop 2026")
    .replace(/([a-z])(\d{4})/g, "$1 $2")
    // Collapse whitespace runs (but keep paragraph breaks)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out || null;
}

export function extractOrganizerFromHtml(html: string, sourceUrl: string | null): OrganizerInfo {
  const blocks = extractJsonLdBlocks(html);
  const event = blocks.find(isEvent);
  let name: string | null = null;
  let siteUrl: string | null = null;
  if (event) {
    const org = (event as Record<string, unknown>).organizer;
    if (typeof org === "string") name = org;
    else if (Array.isArray(org) && org.length > 0 && typeof (org[0] as Record<string, unknown>).name === "string") {
      name = (org[0] as Record<string, unknown>).name as string;
      const u = (org[0] as Record<string, unknown>).url;
      if (typeof u === "string") siteUrl = u;
    } else if (org && typeof org === "object") {
      const rec = org as Record<string, unknown>;
      if (typeof rec.name === "string") name = rec.name;
      if (typeof rec.url === "string") siteUrl = rec.url;
    }
  }
  if (!name) name = extractOgTag(html, "site_name");

  const domain =
    (siteUrl ? domainFromUrl(siteUrl) : null) ??
    (sourceUrl ? domainFromUrl(sourceUrl) : null);
  const logoUrl = domain ? logoDevUrl(domain) : null;

  return { name: name?.trim() || null, domain, logoUrl };
}

// ------------------------------------------------------------
// Agenda extraction. Only populates if the source explicitly lists
// times. Recognizes patterns like:
//   "17:30 — Registration"
//   "6:00 PM — Doors open"
//   "9:00 AM Registration & networking"
// Returns null if no time-labeled entries are found.
// ------------------------------------------------------------
export interface AgendaEntry {
  time: string;
  label: string;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export function extractAgendaFromHtml(html: string): AgendaEntry[] | null {
  const text = stripHtml(html);
  // Look for lines like "17:30 — Registration" or "6:00 PM — Doors open"
  const re = /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*[–—\-:]\s*([A-Z][^.\n]{4,80})/g;
  const found: AgendaEntry[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null && found.length < 20) {
    const time = m[1].trim();
    const label = m[2].trim();
    const key = `${time}::${label}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // Filter obvious false positives (phone numbers, prices)
    if (/\$|\d{4,}/.test(label)) continue;
    found.push({ time, label });
  }
  // Require at least 2 explicit entries — one match is too easy to hallucinate from prose.
  if (found.length < 2) return null;
  return found;
}

// ------------------------------------------------------------
// Speakers extraction from JSON-LD `performer` field only.
// Never scrapes prose — if the source doesn't have structured
// speakers, we return null rather than inventing them.
// ------------------------------------------------------------
export interface Speaker {
  name: string;
  role: string | null;
  bio: string | null;
  photo_url: string | null;
}

export function extractSpeakersFromHtml(html: string): Speaker[] | null {
  const blocks = extractJsonLdBlocks(html);
  const event = blocks.find(isEvent);
  if (!event) return null;
  const perf = (event as Record<string, unknown>).performer;
  const arr: unknown[] = Array.isArray(perf) ? perf : perf ? [perf] : [];
  const speakers: Speaker[] = [];
  for (const p of arr) {
    if (!p || typeof p !== "object") continue;
    const rec = p as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : null;
    if (!name) continue;
    speakers.push({
      name,
      role: typeof rec.jobTitle === "string" ? rec.jobTitle : null,
      bio: typeof rec.description === "string" ? rec.description : null,
      photo_url: typeof rec.image === "string" ? rec.image : null,
    });
  }
  return speakers.length > 0 ? speakers : null;
}
