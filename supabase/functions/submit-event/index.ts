// ============================================================
// submit-event: fully functional self-submission endpoint.
// Dormant in the UI (see src/pages/Events.tsx SUBMIT_EVENT_ENABLED),
// but this endpoint is public-facing and callable directly for
// testing. Notification wiring is stubbed pending an admin email
// service — see TODO below.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// ============================================================
// Parsed event shape returned to the caller (preview) and inserted
// into scheduled_events with status='pending'.
// ============================================================
interface ParsedEvent {
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  image_url: string | null;
  organizer: string | null;
  confidence: 'high' | 'medium' | 'low';
  source_url: string;
}

// ============================================================
// Rate limiting: hash the client IP with a session-fixed salt and
// track submissions in event_submission_ledger.
// Limit: 5 submissions / 24h per IP.
// ============================================================
const RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const IP_HASH_SALT = Deno.env.get('SUBMISSION_IP_SALT') ?? 'scopedrop-events-v2';

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${IP_HASH_SALT}::${ip}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

async function withinRateLimit(ipHash: string): Promise<{ ok: boolean; count: number }> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const { count, error } = await supabase
    .from('event_submission_ledger')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('submitted_at', since);
  if (error) {
    console.warn('rate-limit lookup error:', error.message);
    // Fail open on lookup error — don't hard-block legit users on a DB blip.
    return { ok: true, count: 0 };
  }
  return { ok: (count ?? 0) < RATE_LIMIT_MAX, count: count ?? 0 };
}

async function recordSubmission(ipHash: string): Promise<void> {
  const { error } = await supabase
    .from('event_submission_ledger')
    .insert({ ip_hash: ipHash });
  if (error) console.warn('rate-limit record error:', error.message);
}

// ============================================================
// Three-tier parser.
// Tier 1: schema.org Event JSON-LD.
// Tier 2: OpenGraph tags.
// Tier 3: bare <title> + og:image (low confidence).
// ============================================================
function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
}

function extractJsonLdEvents(html: string): unknown[] {
  const matches: unknown[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = regex.exec(html)) !== null) {
    const raw = m[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) matches.push(...parsed);
      else if (parsed && typeof parsed === 'object' && '@graph' in parsed && Array.isArray((parsed as { '@graph'?: unknown[] })['@graph'])) {
        matches.push(...((parsed as { '@graph': unknown[] })['@graph']));
      } else {
        matches.push(parsed);
      }
    } catch {
      // Ignore unparseable JSON-LD blocks
    }
  }
  return matches;
}

function isEventJsonLd(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object') return false;
  const t = (v as { '@type'?: unknown })['@type'];
  if (typeof t === 'string') return /event/i.test(t);
  if (Array.isArray(t)) return t.some(x => typeof x === 'string' && /event/i.test(x));
  return false;
}

function readJsonLdLocation(loc: unknown): string | null {
  if (typeof loc === 'string') return loc;
  if (Array.isArray(loc) && loc.length > 0) return readJsonLdLocation(loc[0]);
  if (loc && typeof loc === 'object') {
    const rec = loc as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name : null;
    const addr = rec.address;
    let addrStr: string | null = null;
    if (typeof addr === 'string') addrStr = addr;
    else if (addr && typeof addr === 'object') {
      const a = addr as Record<string, unknown>;
      addrStr = [a.streetAddress, a.addressLocality, a.addressRegion].filter(x => typeof x === 'string').join(', ') || null;
    }
    return [name, addrStr].filter(Boolean).join(' — ') || null;
  }
  return null;
}

function readJsonLdImage(img: unknown): string | null {
  if (typeof img === 'string') return img;
  if (Array.isArray(img) && img.length > 0) return readJsonLdImage(img[0]);
  if (img && typeof img === 'object') {
    const url = (img as Record<string, unknown>).url;
    if (typeof url === 'string') return url;
  }
  return null;
}

function readJsonLdOrganizer(org: unknown): string | null {
  if (typeof org === 'string') return org;
  if (Array.isArray(org) && org.length > 0) return readJsonLdOrganizer(org[0]);
  if (org && typeof org === 'object') {
    const name = (org as Record<string, unknown>).name;
    if (typeof name === 'string') return name;
  }
  return null;
}

function extractOgMeta(html: string, property: string): string | null {
  // Match og:<property> or twitter:<property>. Value can be in content= attr.
  const re = new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:|twitter:)?${property}["'][^>]*content=["']([^"']+)["']`, 'i');
  const m = html.match(re);
  return m ? decodeHtmlEntities(m[1]) : null;
}

function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeHtmlEntities(m[1].trim()) : null;
}

function normalizeIsoDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  if (!isFinite(d.getTime())) return null;
  return d.toISOString();
}

function parseEvent(html: string, sourceUrl: string): ParsedEvent {
  // Tier 1: JSON-LD Event
  const ldItems = extractJsonLdEvents(html);
  const eventNode = ldItems.find(isEventJsonLd);
  if (eventNode) {
    const e = eventNode as Record<string, unknown>;
    return {
      title: typeof e.name === 'string' ? e.name : (extractHtmlTitle(html) ?? 'Untitled Event'),
      description: typeof e.description === 'string' ? e.description : null,
      starts_at: normalizeIsoDate(e.startDate),
      ends_at: normalizeIsoDate(e.endDate),
      location: readJsonLdLocation(e.location),
      image_url: readJsonLdImage(e.image),
      organizer: readJsonLdOrganizer(e.organizer),
      confidence: 'high',
      source_url: sourceUrl,
    };
  }

  // Tier 2: OpenGraph tags
  const ogTitle = extractOgMeta(html, 'title');
  const ogDescription = extractOgMeta(html, 'description');
  const ogImage = extractOgMeta(html, 'image');
  if (ogTitle || ogDescription) {
    return {
      title: ogTitle ?? extractHtmlTitle(html) ?? 'Untitled Event',
      description: ogDescription,
      starts_at: null,
      ends_at: null,
      location: null,
      image_url: ogImage,
      organizer: null,
      confidence: 'medium',
      source_url: sourceUrl,
    };
  }

  // Tier 3: bare title + og:image (low confidence — reviewer needs to
  // fill in dates before approving)
  return {
    title: extractHtmlTitle(html) ?? 'Untitled Event',
    description: null,
    starts_at: null,
    ends_at: null,
    location: null,
    image_url: ogImage,
    organizer: null,
    confidence: 'low',
    source_url: sourceUrl,
  };
}

// ============================================================
// Handler
// ============================================================
serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'POST required' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ ok: false, error: 'invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const url = typeof body.url === 'string' ? body.url : null;
  const submittedByEmail = typeof body.submitted_by_email === 'string' ? body.submitted_by_email : null;

  if (!url || !/^https?:\/\//.test(url)) {
    return new Response(
      JSON.stringify({ ok: false, error: 'url is required and must start with http:// or https://' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Rate limit by hashed IP
  const ip = clientIp(req);
  const ipHash = await hashIp(ip);
  const rate = await withinRateLimit(ipHash);
  if (!rate.ok) {
    return new Response(
      JSON.stringify({ ok: false, error: `rate limit exceeded (${RATE_LIMIT_MAX}/24h)`, count: rate.count }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Fetch the event page
  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'ScopeDrop-EventSubmitter/1.0 (+https://scopedrop.itsstranger14.workers.dev)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });
    if (!res.ok) {
      return new Response(
        JSON.stringify({ ok: false, error: `source URL returned HTTP ${res.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('html') && !contentType.includes('xml')) {
      return new Response(
        JSON.stringify({ ok: false, error: `unsupported content type: ${contentType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    html = await res.text();
    if (html.length > 2_000_000) html = html.slice(0, 2_000_000); // cap 2MB
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: `could not fetch source URL: ${String(err)}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const parsed = parseEvent(html, url);

  // Slug from source URL hash — stable across resubmissions
  const slugBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
  const slugHex = Array.from(new Uint8Array(slugBuf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  const slug = `self_${slugHex}`;

  // Insert with status='pending'. Falls back for missing required fields:
  // - starts_at is NOT NULL in the schema, so if we couldn't parse one,
  //   default to 30 days out (reviewer will correct).
  const nowIso = new Date().toISOString();
  const starts_at = parsed.starts_at ?? new Date(Date.now() + 30 * 86400_000).toISOString();

  const { data: inserted, error: insertErr } = await supabase
    .from('scheduled_events')
    .upsert(
      {
        slug,
        source: 'self_submitted',
        source_id: slugHex,
        source_url: url,
        title: parsed.title,
        description: parsed.description,
        starts_at,
        ends_at: parsed.ends_at,
        location: parsed.location,
        image_url: parsed.image_url,
        registration_url: url,
        event_type: 'conference',
        is_virtual: false,
        status: 'pending',
        submitted_by_email: submittedByEmail,
        submitted_at: nowIso,
      },
      { onConflict: 'slug', ignoreDuplicates: false },
    )
    .select('id, slug, status, title, starts_at')
    .single();

  if (insertErr) {
    console.error('submit-event insert error:', insertErr);
    return new Response(
      JSON.stringify({ ok: false, error: `insert failed: ${insertErr.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  await recordSubmission(ipHash);

  // TODO (activate once a ScopeDrop email/Resend account exists):
  // await sendEmail({
  //   to: Deno.env.get('ADMIN_EMAIL'),
  //   subject: `New event submitted for review: ${parsed.title}`,
  //   body: `${parsed.title} — ${parsed.starts_at ?? 'date TBD'}\nReview: https://scopedrop.com/admin/events\nSource: ${url}`,
  // });

  return new Response(
    JSON.stringify({ ok: true, submission: inserted, parsed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
  );
});
