import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSupabaseJwt } from "../_shared/auth.ts";

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

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || supabaseAnonKey);

/** Canonical event shape as returned by this function and written to scheduled_events. */
interface NormalizedEvent {
  slug: string;
  source: 'eventbrite' | 'predicthq';
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
}

const INDIAN_CITY_HINTS = new Set([
  'delhi', 'new delhi', 'gurugram', 'gurgaon', 'noida', 'faridabad', 'ghaziabad',
  'bengaluru', 'bangalore', 'mumbai', 'hyderabad', 'chennai', 'pune', 'kolkata',
]);

function buildLocationString(city: string | null | undefined): string {
  if (!city) return 'San Francisco';
  const lower = city.toLowerCase();
  if (INDIAN_CITY_HINTS.has(lower)) return `${city}, India`;
  return city;
}

/** Map external category strings to our allowed enum. */
function mapEventType(category?: string, title?: string): NormalizedEvent['event_type'] {
  const c = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (c === 'demo-day' || t.includes('demo day')) return 'demo_day';
  if (c === 'pitch' || t.includes('pitch') || t.includes('competition')) return 'pitch_competition';
  return 'conference';
}

async function fetchEventbrite(location: string): Promise<NormalizedEvent[]> {
  const apiKey = Deno.env.get('EVENTBRITE_API_KEY');
  if (!apiKey) return [];
  try {
    const url = `https://www.eventbriteapi.com/v3/events/search/?location.address=${encodeURIComponent(location)}&location.within=50km&categories=102&expand=venue,organizer&sort_by=date`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
    if (!res.ok) {
      console.error('Eventbrite non-ok:', res.status);
      return [];
    }
    const data = await res.json();
    const events = (data.events ?? []) as any[];
    return events.map((e) => ({
      slug: `eventbrite_${e.id}`,
      source: 'eventbrite' as const,
      source_id: String(e.id),
      title: e.name?.text || 'Untitled Event',
      description: e.description?.text ?? e.summary ?? null,
      starts_at: e.start?.utc ?? e.start?.local ?? new Date().toISOString(),
      ends_at: e.end?.utc ?? e.end?.local ?? null,
      city: e.venue?.address?.city ?? null,
      region: null,
      is_virtual: !!e.online_event,
      location: e.venue?.address?.localized_address_display ?? e.venue?.name ?? null,
      registration_url: e.url ?? null,
      image_url: e.logo?.url ?? null,
      event_type: mapEventType(undefined, e.name?.text),
    }));
  } catch (err) {
    console.error('Eventbrite fetch error:', err);
    return [];
  }
}

async function fetchPredictHQ(location: string): Promise<NormalizedEvent[]> {
  const apiKey = Deno.env.get('PREDICT_HQ_API_KEY') ?? Deno.env.get('PREDICTHQ_API_KEY');
  if (!apiKey) return [];
  try {
    const url = `https://api.predicthq.com/v1/events/?category=conferences,expos,community&q=${encodeURIComponent(location)}&limit=30`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
    if (!res.ok) {
      console.error('PredictHQ non-ok:', res.status);
      return [];
    }
    const data = await res.json();
    const events = (data.results ?? []) as any[];
    return events.map((e) => ({
      slug: `predicthq_${e.id}`,
      source: 'predicthq' as const,
      source_id: String(e.id),
      title: e.title ?? 'Untitled Event',
      description: e.description ?? null,
      starts_at: e.start ?? new Date().toISOString(),
      ends_at: e.end ?? null,
      city: e.place_hierarchies?.[0]?.[1] ?? null,
      region: null,
      is_virtual: false,
      location: Array.isArray(e.location) ? null : (e.entities?.find((x: any) => x.type === 'venue')?.name ?? null),
      registration_url: e.predicted_event_url ?? null,
      image_url: null,
      event_type: mapEventType(e.category, e.title),
    }));
  } catch (err) {
    console.error('PredictHQ fetch error:', err);
    return [];
  }
}

async function upsertEvents(events: NormalizedEvent[], overrideCity: string | null, overrideRegion: string | null) {
  if (events.length === 0) return { inserted: 0, updated: 0 };
  // Force city + region on all inserted rows so tab filtering works cleanly.
  const rows = events.map((e) => ({
    ...e,
    city: overrideCity ?? e.city,
    region: overrideRegion ?? e.region,
  }));
  const { data, error } = await supabase
    .from('scheduled_events')
    .upsert(rows, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id, slug');
  if (error) {
    console.error('upsert error:', error);
    return { inserted: 0, updated: 0, error: error.message };
  }
  return { inserted: data?.length ?? 0, updated: 0 };
}

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
      city = url.searchParams.get('city') ?? url.searchParams.get('location');
      region = url.searchParams.get('region');
    }

    const locationString = buildLocationString(city);

    const [eb, phq] = await Promise.all([
      fetchEventbrite(locationString),
      fetchPredictHQ(locationString),
    ]);

    // Dedupe on slug (across sources — shouldn't collide, but defensive)
    const combined = [...eb, ...phq];
    const seen = new Set<string>();
    const unique = combined.filter((e) => {
      if (seen.has(e.slug)) return false;
      seen.add(e.slug);
      return true;
    });

    // Only upsert events with valid future starts_at (past events pollute the feed)
    const now = Date.now();
    const upcoming = unique.filter((e) => {
      const t = new Date(e.starts_at).getTime();
      return isFinite(t) && t > now - 3600_000; // include events that started in the last hour, for edge cases
    });

    const upsertResult = await upsertEvents(upcoming, city, region);

    return new Response(
      JSON.stringify({
        ok: true,
        city,
        region,
        fetched: combined.length,
        upcoming: upcoming.length,
        upserted: upsertResult.inserted,
        upsertError: (upsertResult as { error?: string }).error,
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
