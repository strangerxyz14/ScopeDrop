// ============================================================
// Hero image + organizer logo resolvers for normalize-events.
//
// resolveHeroImage: validates candidate URLs with a HEAD request +
//   content-type check, falls back to an event_image_templates row
//   matched by event_type, then to the universal SVG fallback.
//
// resolveOrganizerLogoFull: JSON-LD organizer.logo hint → Logo.dev
//   by derived domain → SVG monogram data URI. Wraps the existing
//   resolveOrganizerLogo (from event-extraction.ts) for the
//   domain-cache lookup path but layers the JSON-LD hint in front
//   because that's the most trustworthy signal per plan spec.
//
// Both resolvers use an in-memory validation cache scoped to the
// current invocation — HEAD requests are cheap but batches of 20
// events in normalize-events would still add up.
// ============================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  logoDevUrl,
  isUsableImageUrl,
  resolveOrganizerLogo as resolveByName,
} from "./event-extraction.ts";

export type HeroImageSource =
  | "og_image"
  | "json_ld"
  | "page_image"
  | "scopedrop_library"
  | "unresolved";

export type LogoSource =
  | "json_ld"
  | "og_logo"
  | "favicon"
  | "logo_dev"
  | "scopedrop_default"
  | "unresolved";

export interface ResolvedHero {
  url: string;
  source: HeroImageSource;
}

export interface ResolvedLogo {
  url: string;
  source: LogoSource;
}

const UNIVERSAL_FALLBACK = "/images/event-fallback-universal.svg";
const HEAD_TIMEOUT_MS = 5_000;

// Per-invocation cache — URL → is-usable-boolean. Cold-starts wipe
// the map, which is the intended lifetime (we don't want stale HEAD
// results carrying across cron runs).
const validationCache = new Map<string, boolean>();

async function isImageReachable(url: string): Promise<boolean> {
  if (!isUsableImageUrl(url)) return false;
  const cached = validationCache.get(url);
  if (cached !== undefined) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "ScopeDrop-ImageValidator/1.0" },
    });
    const ok = res.ok && (res.headers.get("content-type") ?? "").startsWith("image/");
    validationCache.set(url, ok);
    return ok;
  } catch {
    validationCache.set(url, false);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// Hero image
// ------------------------------------------------------------
// deno-lint-ignore no-explicit-any
export async function resolveHeroImage(
  candidates: string[],
  eventType: string | null,
  supabase: SupabaseClient,
): Promise<ResolvedHero> {
  // 1. Try each candidate URL in order — first reachable image wins
  for (const url of candidates) {
    if (await isImageReachable(url)) {
      // We don't know at this layer whether the candidate came from
      // og:image vs JSON-LD vs page scrape — the cascade tracks that
      // separately in extraction_tier. Default the source to
      // 'page_image' here; normalize-events overrides with a more
      // specific value if it knows the origin.
      return { url, source: "page_image" };
    }
  }

  // 2. Fall back to a matching archetype in event_image_templates
  if (eventType) {
    // deno-lint-ignore no-explicit-any
    const { data: preset } = await (supabase as any)
      .from("event_image_templates")
      .select("public_url, template_url")
      .or(`archetype_key.ilike.%${eventType}%,category.ilike.%${eventType}%`)
      .not("public_url", "is", null)
      .limit(1)
      .maybeSingle();
    const presetUrl = preset?.public_url ?? preset?.template_url ?? null;
    if (presetUrl && await isImageReachable(presetUrl)) {
      return { url: presetUrl, source: "scopedrop_library" };
    }
  }

  // 3. Universal SVG fallback served from /public
  return { url: UNIVERSAL_FALLBACK, source: "unresolved" };
}

// ------------------------------------------------------------
// Organizer logo — richer variant used by normalize-events.
// The plan asks for JSON-LD hint → Logo.dev by domain → monogram.
// ------------------------------------------------------------
export function monogramDataUri(name: string): string {
  const letter = (name?.trim()?.[0] ?? "?").toUpperCase();
  // Compact SVG monogram, parrot on ink — matches the OrganizerLogo
  // component's client-side fallback so a resolved-nothing case looks
  // identical to the "no img" case in the UI.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <rect width='100' height='100' fill='#0F2847'/>
    <text x='50' y='50' text-anchor='middle' dominant-baseline='central'
      font-family='Inter,sans-serif' font-weight='700' font-size='52' fill='#3ECF6E'>${letter}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function domainFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

// deno-lint-ignore no-explicit-any
export async function resolveOrganizerLogoFull(
  supabase: SupabaseClient,
  organizerName: string | null,
  organizerWebsite: string | null,
  jsonLdLogoHint: string | null,
): Promise<ResolvedLogo> {
  // 1. Trust the JSON-LD hint first if it's a real image URL
  if (jsonLdLogoHint && await isImageReachable(jsonLdLogoHint)) {
    return { url: jsonLdLogoHint, source: "json_ld" };
  }

  // 2. Derive domain from organizer_website OR the org name via Logo.dev's
  //    Search API. The Search API path already handles caching + free-plan
  //    fallback in resolveOrganizerLogo (from event-extraction.ts).
  const domain = domainFromUrl(organizerWebsite);
  if (domain) {
    const url = logoDevUrl(domain);
    if (await isImageReachable(url)) {
      return { url, source: "logo_dev" };
    }
  }

  if (organizerName) {
    const resolved = await resolveByName(supabase, organizerName);
    if (resolved.logoUrl && await isImageReachable(resolved.logoUrl)) {
      return { url: resolved.logoUrl, source: "logo_dev" };
    }
  }

  // 3. Monogram data URI — matches OrganizerLogo component's client fallback
  return {
    url: monogramDataUri(organizerName ?? "?"),
    source: "scopedrop_default",
  };
}
