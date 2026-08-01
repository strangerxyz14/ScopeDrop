// ============================================================
// seed-fallback-images — one-shot edge function that generates the
// 12 event fallback images via Cloudflare Workers AI and seeds
// event_image_templates. Wraps the same ARCHETYPES + generation
// loop that lives in scripts/generate-fallback-images.ts, but
// executes server-side so it can read CLOUDFLARE_API_KEY and
// SUPABASE_SERVICE_ROLE_KEY from edge-function secrets without
// exposing them to the local shell.
//
// Idempotent: existing archetype rows are skipped unless
// `?force=true` (or POST body { force: true }) is passed. Optional
// `only=<archetype_key>` to target a single archetype.
//
// Runtime: 12 sequential FLUX-Schnell calls at ~5-10s each ≈
// 60-120s total, right at Supabase edge function's default
// timeout. Function processes sequentially and returns partial
// results if the timeout hits — a re-invoke picks up where it
// left off because idempotency is at the DB row level.
//
// Neuron cost: 12 × ~200 neurons ≈ 2,400 total. Cloudflare
// Workers AI free tier is 10,000 neurons/day so a full seed
// leaves ~76% of the daily budget untouched.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ARCHETYPES = [
  { key: "demo-day-startup",     event_type: "demo_day",     prompt: "Editorial photograph of a startup demo day pitch stage, wide angle shot from the audience perspective, warm stage lighting on a single founder mid-presentation, dark cinematic color grade with deep shadows, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E accents on stage LED strips, blurred audience silhouettes in foreground, projector screen glow behind speaker, photorealistic, editorial magazine style, dramatic mood, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "demo-day-yc-style",    event_type: "demo_day",     prompt: "Editorial photograph of a modern startup accelerator demo day, minimalist auditorium with black chairs and a single spotlight on stage, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E highlights along architectural edges, packed room implied by silhouettes, wide angle high-vantage shot, photorealistic, editorial magazine style, quiet tension, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "hackathon-warehouse",  event_type: "hackathon",    prompt: "Editorial photograph of a hackathon inside a converted industrial warehouse, wide shot of long tables with laptops glowing, exposed brick and steel beams overhead, ambient parrot green #3ECF6E accent lighting under tables, dark cinematic color grade, ink navy #0A1628 dominant tone, people concentrated at screens, photorealistic, editorial magazine style, focused mood, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "hackathon-collegiate", event_type: "hackathon",    prompt: "Editorial photograph of a collegiate hackathon in a university atrium, tiered seating filled with students hunched over laptops, glass ceiling with cool blue evening light filtering in, dark cinematic color grade, ink navy #0A1628 dominant tone, warm laptop screen glow, subtle parrot green #3ECF6E accents on signage strips, photorealistic, editorial magazine style, communal focus, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "conference-mainstage", event_type: "conference",   prompt: "Editorial photograph of a tech conference main stage during a keynote, large curved LED backdrop showing abstract data visualisation in muted tones, single speaker silhouetted centre stage, packed audience visible from side angle, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accents in stage lighting rigs, photorealistic, editorial magazine style, cinematic scale, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "conference-panel",     event_type: "conference",   prompt: "Editorial photograph of a conference panel discussion, four figures seated on stools on a low stage, moderator on the left leaning forward, warm stage lighting from above, blurred first row of audience in foreground, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E accent on stage edging, photorealistic, editorial magazine style, engaged conversation, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "meetup-casual",        event_type: "meetup",       prompt: "Editorial photograph of a tech meetup at a casual venue, groups of people standing in conversation with drinks in hand, string lights overhead, dark cinematic color grade with warm tungsten highlights, ink navy #0A1628 dominant tone, ambient parrot green #3ECF6E glow from a projector on a side wall, photorealistic, editorial magazine style, relaxed networking, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "meetup-rooftop",       event_type: "meetup",       prompt: "Editorial photograph of a rooftop tech meetup at dusk, skyline of a major city visible in the background with lit-up towers, people in small clusters holding drinks, string lights across the rooftop, dark cinematic color grade, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E highlights on distant building signage, photorealistic, editorial magazine style, twilight mood, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "workshop-classroom",   event_type: "workshop",     prompt: "Editorial photograph of a technical workshop in a classroom setting, tiered rows of desks with participants at laptops, instructor at the front by a whiteboard, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E accents on floor track lighting, photorealistic, editorial magazine style, studious atmosphere, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "workshop-lab",         event_type: "workshop",     prompt: "Editorial photograph of a maker-space workshop, long benches with laptops and hardware components, cable arrays and monitors overhead, participants collaborating in small pairs, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accents from LED strips under benches, photorealistic, editorial magazine style, hands-on focus, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "pitch-event-formal",   event_type: "pitch_event",  prompt: "Editorial photograph of a formal pitch competition, panel of judges seated at a long table facing a single presenter at a lectern, muted stage lighting, dark cinematic color grade, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E accents on judge desk lamps, blurred audience in soft background, photorealistic, editorial magazine style, high-stakes composure, 16:9 landscape, no text overlays, no visible logos, no branded content" },
  { key: "generic-networking",   event_type: "meetup",       prompt: "Editorial photograph of a generic tech networking event, wide shot of a mid-sized ballroom filled with standing conversation clusters, hanging pendant lights, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accent on a distant welcome banner rail (abstract, no text visible), photorealistic, editorial magazine style, low-key professional buzz, 16:9 landscape, no text overlays, no visible logos, no branded content" },
] as const;

async function generateImage(prompt: string, accountId: string, apiKey: string): Promise<Uint8Array> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, width: 1536, height: 864, num_steps: 8 }),
  });
  if (!res.ok) throw new Error(`FLUX ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  const b64 = json?.result?.image;
  if (typeof b64 !== "string") throw new Error("FLUX response missing result.image");
  // Deno-safe base64 decode (no Buffer in edge runtime)
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

serve(async (req) => {
  try {
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiKey = Deno.env.get("CLOUDFLARE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!accountId || !apiKey) return json({ error: "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_KEY missing" }, 500);
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "SUPABASE_URL / SERVICE_ROLE_KEY missing" }, 500);

    const url = new URL(req.url);
    let force = url.searchParams.get("force") === "true";
    let only: string | null = url.searchParams.get("only");
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.force === true) force = true;
      if (typeof body?.only === "string") only = body.only;
    }

    const targets = only ? ARCHETYPES.filter(a => a.key === only) : ARCHETYPES;
    if (targets.length === 0) return json({ error: `no archetype matches only=${only}` }, 400);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const results: Array<Record<string, unknown>> = [];
    let created = 0, skipped = 0, failed = 0;

    for (const a of targets) {
      const { data: existing } = await supabase
        .from("event_image_templates")
        .select("archetype_key, prompt_version")
        .eq("archetype_key", a.key)
        .maybeSingle();
      if (existing && !force) {
        results.push({ key: a.key, outcome: "skipped", existing_version: existing.prompt_version });
        skipped++;
        continue;
      }
      const nextVersion = (existing?.prompt_version ?? 0) + 1;
      try {
        const bytes = await generateImage(a.prompt, accountId, apiKey);
        const path = `${a.key}-v${nextVersion}.png`;
        const { error: upErr } = await supabase.storage
          .from("event-fallbacks")
          .upload(path, bytes, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error(`upload: ${upErr.message}`);
        const publicUrl = supabase.storage.from("event-fallbacks").getPublicUrl(path).data.publicUrl;
        const { error: upsertErr } = await supabase.from("event_image_templates").upsert({
          archetype_key: a.key,
          event_type: a.event_type,
          category: a.event_type,
          format: "in_person",
          template_url: publicUrl,
          public_url: publicUrl,
          storage_path: path,
          prompt_version: nextVersion,
          generated_at: new Date().toISOString(),
        }, { onConflict: "archetype_key" });
        if (upsertErr) throw new Error(`upsert row: ${upsertErr.message}`);
        results.push({ key: a.key, outcome: "created", version: nextVersion, url: publicUrl });
        created++;
      } catch (err) {
        results.push({ key: a.key, outcome: "failed", reason: err instanceof Error ? err.message : String(err) });
        failed++;
      }
    }

    return json({ total: targets.length, created, skipped, failed, results });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
