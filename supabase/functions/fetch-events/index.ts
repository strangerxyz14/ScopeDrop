import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSupabaseJwt } from "../_shared/auth.ts";

// ============================================================
// CORS
// ============================================================
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:8080',
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev'))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  };
}

// ============================================================
// Supabase client (service-role — we need to bypass RLS to insert
// approved rows, and future insert of pending self-submissions).
// ============================================================
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

// ============================================================
// Canonical event shape written to scheduled_events.
// ============================================================
interface NormalizedEvent {
  slug: string;
  source: 'serpapi';
  source_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  city: string | null;
  region: string | null;
  is_virtual: boolean;
  location: string | null;
  registration_url: string | null;
  image_url: string | null;
  event_type: 'demo_day' | 'conference' | 'pitch_competition';
  relevance_category: string;
  relevance_reason: string;
}

// ============================================================
// City → SerpAPI location string. `location` is required by SerpAPI's
// Google Events engine for geo-scoped results.
// ============================================================
const CITY_LOCATION_STRING: Record<string, string> = {
  delhi:         'New Delhi, Delhi, India',
  'new delhi':   'New Delhi, Delhi, India',
  gurugram:      'Gurugram, Haryana, India',
  gurgaon:       'Gurugram, Haryana, India',
  noida:         'Noida, Uttar Pradesh, India',
  bengaluru:     'Bengaluru, Karnataka, India',
  bangalore:     'Bengaluru, Karnataka, India',
  mumbai:        'Mumbai, Maharashtra, India',
  hyderabad:     'Hyderabad, Telangana, India',
  chennai:       'Chennai, Tamil Nadu, India',
  pune:          'Pune, Maharashtra, India',
  'san francisco': 'San Francisco, California, United States',
};

function locationForCity(city: string | null | undefined): string {
  if (!city) return 'India';
  return CITY_LOCATION_STRING[city.toLowerCase()] ?? city;
}

// ============================================================
// SerpAPI Google Events fetch. One call = one city.
// See https://serpapi.com/google-events-api
// ============================================================
interface SerpApiEvent {
  title: string;
  description?: string;
  date?: {
    start_date?: string;
    when?: string;
  };
  address?: string[];
  link: string;
  event_location_map?: { link?: string };
  ticket_info?: Array<{ source?: string; link?: string; link_type?: string }>;
  venue?: { name?: string };
  thumbnail?: string;
}

interface SerpApiResponse {
  events_results?: SerpApiEvent[];
  error?: string;
}

async function fetchSerpApiEvents(city: string | null): Promise<{ raw: SerpApiEvent[]; status: number; error: string | null }> {
  const apiKey = Deno.env.get('SERP_API_KEY');
  if (!apiKey) return { raw: [], status: 0, error: 'SERP_API_KEY not set' };

  const location = locationForCity(city);
  const query = 'startup OR tech OR AI OR founder OR hackathon OR demo day OR pitch events';
  const params = new URLSearchParams({
    engine: 'google_events',
    q: query,
    location,
    hl: 'en',
    api_key: apiKey,
  });

  try {
    const url = `https://serpapi.com/search?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      const bodyText = await res.text();
      return { raw: [], status: res.status, error: bodyText.slice(0, 300) };
    }
    const data = (await res.json()) as SerpApiResponse;
    if (data.error) return { raw: [], status: res.status, error: data.error };
    return { raw: data.events_results ?? [], status: res.status, error: null };
  } catch (err) {
    return { raw: [], status: 0, error: String(err) };
  }
}

// ============================================================
// SerpAPI Google Events returns date strings without a year, like
// `start_date: "Aug 15"` and `when: "Tomorrow, 6 – 8 PM"` or
// `"Sat, Aug 8 – Sun, Aug 9"`. V8's Date parser handles these
// wildly (bare "Aug 15" -> year 2001), so we parse explicitly.
// ============================================================
const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/** Extract month index + day-of-month from a "Mon D" or "Mon D, ..." style string. */
function extractMonthDay(raw: string): { month: number; day: number } | null {
  const m = raw.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (month == null) return null;
  const day = parseInt(m[2], 10);
  if (!isFinite(day) || day < 1 || day > 31) return null;
  return { month, day };
}

/** Extract "6 PM", "6:30 AM", or the start of a "6 – 8 PM" range. Returns UTC-ish hours. */
function extractStartHour(raw: string): { hour: number; minute: number } | null {
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(?:–|-|to)?\s*(?:\d{1,2}(?::\d{2})?\s*)?(AM|PM|am|pm)/);
  if (!m) return null;
  let hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  const meridian = m[3].toLowerCase();
  if (meridian === 'pm' && hour < 12) hour += 12;
  if (meridian === 'am' && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;
  return { hour, minute };
}

function parseSerpDate(d: { start_date?: string; when?: string } | undefined, referenceYear: number): string {
  const now = new Date();
  const nowMs = now.getTime();

  // Relative words in `when`
  const when = d?.when?.trim() ?? '';
  if (/^today\b/i.test(when)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0).toISOString();
  }
  if (/^tomorrow\b/i.test(when)) {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0, 0);
    // If there's a time in the string, apply it
    const time = extractStartHour(when);
    if (time) t.setHours(time.hour, time.minute, 0, 0);
    return t.toISOString();
  }

  // Concrete month-day from either field
  const md =
    (d?.start_date ? extractMonthDay(d.start_date) : null) ??
    (when ? extractMonthDay(when) : null);
  if (!md) return now.toISOString();

  const time = when ? extractStartHour(when) : null;
  const hour = time?.hour ?? 12;
  const minute = time?.minute ?? 0;

  // Build a date in reference year; if it's already in the past (>1 day),
  // roll to next year.
  let candidate = new Date(Date.UTC(referenceYear, md.month, md.day, hour, minute, 0));
  if (candidate.getTime() < nowMs - 86400_000) {
    candidate = new Date(Date.UTC(referenceYear + 1, md.month, md.day, hour, minute, 0));
  }
  return candidate.toISOString();
}

function mapEventType(title: string): NormalizedEvent['event_type'] {
  const t = title.toLowerCase();
  if (t.includes('demo day')) return 'demo_day';
  if (t.includes('pitch') || t.includes('competition')) return 'pitch_competition';
  return 'conference';
}

// Deterministic slug from the event link (SerpAPI events don't have a stable id).
async function slugFromLink(link: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(link);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  return `serpapi_${hashHex}`;
}

// ============================================================
// Groq relevance classifier. One call per candidate. Cheap because
// title+description is a fraction of an article's tokens, and event
// volume is tens per day (not thousands).
// ============================================================
interface RelevanceResult {
  relevant: boolean;
  category: string;
  reason: string;
}

const RELEVANCE_SYSTEM_PROMPT = `You are a content curator for ScopeDrop, a platform covering AI, technology, startups, crypto, and emerging tech — specifically founder-relevant and investor-relevant events (demo days, hackathons, tech conferences, startup meetups, crypto/web3 events, AI builder communities). You do NOT cover general business events, unrelated consumer events, concerts, sports, or generic networking with no tech/startup angle.

Given an event's title and description, respond ONLY with JSON:
{"relevant": true|false, "category": "ai"|"startup"|"crypto"|"emerging_tech"|"other", "reason": "one short sentence"}`;

async function classifyRelevance(title: string, description: string): Promise<RelevanceResult> {
  const apiKey = Deno.env.get('GROQ_API_KEY');
  if (!apiKey) {
    // Fail closed — if the classifier can't run, don't publish anything.
    return { relevant: false, category: 'other', reason: 'GROQ_API_KEY not set' };
  }

  const userContent = `Event title: ${title}\nEvent description: ${description || '(no description)'}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: RELEVANCE_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0,
        max_tokens: 120,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const errBody = await res.text();
      console.warn(`Groq classifier non-ok: ${res.status} ${errBody.slice(0, 200)}`);
      return { relevant: false, category: 'other', reason: `classifier http ${res.status}` };
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { relevant: false, category: 'other', reason: 'classifier returned no content' };
    }
    const parsed = JSON.parse(content) as Partial<RelevanceResult>;
    if (typeof parsed.relevant !== 'boolean') {
      return { relevant: false, category: 'other', reason: 'classifier response malformed' };
    }
    return {
      relevant: parsed.relevant,
      category: typeof parsed.category === 'string' ? parsed.category : 'other',
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    };
  } catch (err) {
    console.warn('Groq classifier threw:', err);
    return { relevant: false, category: 'other', reason: 'classifier error' };
  }
}

// ============================================================
// Main handler
// ============================================================
serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authContext = await requireSupabaseJwt(req, {
    supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey || null,
    anonKey: supabaseAnonKey || null,
    corsHeaders,
  });
  if (authContext instanceof Response) return authContext;

  try {
    let city: string | null = null;
    let region: string | null = null;

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      if (typeof body.city === 'string') city = body.city;
      if (typeof body.region === 'string') region = body.region;
    } else {
      const url = new URL(req.url);
      city = url.searchParams.get('city');
      region = url.searchParams.get('region');
    }

    if (!city) {
      return new Response(
        JSON.stringify({ ok: false, error: 'city is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const referenceYear = new Date().getUTCFullYear();
    const { raw, status: serpStatus, error: serpError } = await fetchSerpApiEvents(city);

    if (serpError) {
      console.error('SerpAPI error:', serpError);
    }

    // Dedupe candidates on slug (link-hash) before classification, so we don't
    // waste a Groq call on rows we've already processed.
    const seenSlugs = new Set<string>();
    type Candidate = { serp: SerpApiEvent; slug: string };
    const candidates: Candidate[] = [];
    for (const evt of raw) {
      if (!evt.link) continue;
      const slug = await slugFromLink(evt.link);
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      candidates.push({ serp: evt, slug });
    }

    // Fast-path skip: which slugs are already in the DB? Don't reclassify.
    const slugList = candidates.map(c => c.slug);
    let alreadyPresent = new Set<string>();
    if (slugList.length > 0) {
      const { data: existing } = await supabase
        .from('scheduled_events')
        .select('slug')
        .in('slug', slugList);
      alreadyPresent = new Set((existing ?? []).map(r => r.slug as string));
    }

    let classifiedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    const rejections: Array<{ title: string; reason: string }> = [];
    const toInsert: NormalizedEvent[] = [];

    for (const { serp, slug } of candidates) {
      if (alreadyPresent.has(slug)) continue;

      const title = serp.title ?? '(untitled)';
      const description = serp.description ?? '';
      classifiedCount++;
      const verdict = await classifyRelevance(title, description);

      if (!verdict.relevant) {
        rejectedCount++;
        rejections.push({ title, reason: verdict.reason });
        // Explicitly do NOT insert. Log so spot-checks are possible via function logs.
        console.log(`[classifier reject] "${title}" — ${verdict.reason}`);
        continue;
      }

      const starts_at = parseSerpDate(serp.date, referenceYear);
      const address = serp.address ?? [];
      const venueOrLocation = serp.venue?.name ?? address[0] ?? null;
      const registration = serp.ticket_info?.find(t => t.link)?.link ?? serp.link ?? null;

      toInsert.push({
        slug,
        source: 'serpapi',
        source_id: slug.replace(/^serpapi_/, ''),
        title,
        description: description || null,
        starts_at,
        ends_at: null,
        city,
        region,
        is_virtual: /virtual|online|webinar/i.test(title + ' ' + description),
        location: venueOrLocation,
        registration_url: registration,
        image_url: serp.thumbnail ?? null,
        event_type: mapEventType(title),
        relevance_category: verdict.category,
        relevance_reason: verdict.reason,
      });
      acceptedCount++;
    }

    // Filter: only future events. Anything with a parsed date in the past is dropped.
    const now = Date.now();
    const upcoming = toInsert.filter(e => new Date(e.starts_at).getTime() > now - 3600_000);

    let upserted = 0;
    let upsertError: string | undefined;
    if (upcoming.length > 0) {
      const { data, error } = await supabase
        .from('scheduled_events')
        .upsert(
          upcoming.map(e => ({ ...e, status: 'approved' })),
          { onConflict: 'slug', ignoreDuplicates: false },
        )
        .select('id, slug');
      if (error) upsertError = error.message;
      else upserted = data?.length ?? 0;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        city,
        region,
        serpapi: { status: serpStatus, error: serpError, raw_count: raw.length },
        classifier: {
          candidates: candidates.length,
          already_present: candidates.filter(c => alreadyPresent.has(c.slug)).length,
          classified: classifiedCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
          rejections_sample: rejections.slice(0, 5),
        },
        upserted,
        upsertError,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err) {
    console.error('fetch-events error:', err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
