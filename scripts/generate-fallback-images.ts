#!/usr/bin/env tsx
/**
 * ScopeDrop event fallback image generation script.
 *
 * For each entry in ARCHETYPES:
 *   1. Generate a 1536×864 image via Cloudflare Workers AI
 *      (@cf/black-forest-labs/flux-1-schnell).
 *   2. Upload the PNG to Supabase Storage bucket `event-fallbacks`
 *      at `<archetype_key>-v<prompt_version>.png`.
 *   3. Upsert a row in `event_image_templates` keyed on
 *      `archetype_key`, bumping `prompt_version` on regeneration.
 *
 * Idempotent: re-runs are no-ops unless `--force` is passed OR the
 * archetype's prompt has been edited since the last run (heuristic:
 * always regenerate when the DB has no row for archetype_key, always
 * skip when a row already exists — --force overrides both).
 *
 * Env required:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_KEY           — matches the Supabase secret name
 *                                  (plan's CLOUDFLARE_API_TOKEN doesn't
 *                                  exist here; we normalized on _KEY).
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npx tsx scripts/generate-fallback-images.ts           # skip if row exists
 *   npx tsx scripts/generate-fallback-images.ts --force   # regenerate all
 *   npx tsx scripts/generate-fallback-images.ts --only=demo-day-startup
 */

import { createClient } from "@supabase/supabase-js";

// ── Locked FLUX prompt language ────────────────────────────────────
// All prompts follow the same recipe: dark cinematic grade, ink
// #0A1628 base, parrot #3ECF6E accent, IBM Plex Mono for any typographic
// elements, photorealistic editorial magazine style, 1536x864,
// explicit "no text overlays, no visible logos, no branded content"
// to keep outputs safe as neutral fallbacks under any event.
const ARCHETYPES = [
  {
    key: "demo-day-startup",
    event_type: "demo_day",
    prompt: "Editorial photograph of a startup demo day pitch stage, wide angle shot from the audience perspective, warm stage lighting on a single founder mid-presentation, dark cinematic color grade with deep shadows, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E accents on stage LED strips, blurred audience silhouettes in foreground, projector screen glow behind speaker, photorealistic, editorial magazine style, dramatic mood, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "demo-day-yc-style",
    event_type: "demo_day",
    prompt: "Editorial photograph of a modern startup accelerator demo day, minimalist auditorium with black chairs and a single spotlight on stage, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E highlights along architectural edges, packed room implied by silhouettes, wide angle high-vantage shot, photorealistic, editorial magazine style, quiet tension, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "hackathon-warehouse",
    event_type: "hackathon",
    prompt: "Editorial photograph of a hackathon inside a converted industrial warehouse, wide shot of long tables with laptops glowing, exposed brick and steel beams overhead, ambient parrot green #3ECF6E accent lighting under tables, dark cinematic color grade, ink navy #0A1628 dominant tone, people concentrated at screens, photorealistic, editorial magazine style, focused mood, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "hackathon-collegiate",
    event_type: "hackathon",
    prompt: "Editorial photograph of a collegiate hackathon in a university atrium, tiered seating filled with students hunched over laptops, glass ceiling with cool blue evening light filtering in, dark cinematic color grade, ink navy #0A1628 dominant tone, warm laptop screen glow, subtle parrot green #3ECF6E accents on signage strips, photorealistic, editorial magazine style, communal focus, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "conference-mainstage",
    event_type: "conference",
    prompt: "Editorial photograph of a tech conference main stage during a keynote, large curved LED backdrop showing abstract data visualisation in muted tones, single speaker silhouetted centre stage, packed audience visible from side angle, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accents in stage lighting rigs, photorealistic, editorial magazine style, cinematic scale, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "conference-panel",
    event_type: "conference",
    prompt: "Editorial photograph of a conference panel discussion, four figures seated on stools on a low stage, moderator on the left leaning forward, warm stage lighting from above, blurred first row of audience in foreground, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E accent on stage edging, photorealistic, editorial magazine style, engaged conversation, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "meetup-casual",
    event_type: "meetup",
    prompt: "Editorial photograph of a tech meetup at a casual venue, groups of people standing in conversation with drinks in hand, string lights overhead, dark cinematic color grade with warm tungsten highlights, ink navy #0A1628 dominant tone, ambient parrot green #3ECF6E glow from a projector on a side wall, photorealistic, editorial magazine style, relaxed networking, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "meetup-rooftop",
    event_type: "meetup",
    prompt: "Editorial photograph of a rooftop tech meetup at dusk, skyline of a major city visible in the background with lit-up towers, people in small clusters holding drinks, string lights across the rooftop, dark cinematic color grade, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E highlights on distant building signage, photorealistic, editorial magazine style, twilight mood, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "workshop-classroom",
    event_type: "workshop",
    prompt: "Editorial photograph of a technical workshop in a classroom setting, tiered rows of desks with participants at laptops, instructor at the front by a whiteboard, dark cinematic color grade, ink navy #0A1628 dominant tone, restrained parrot green #3ECF6E accents on floor track lighting, photorealistic, editorial magazine style, studious atmosphere, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "workshop-lab",
    event_type: "workshop",
    prompt: "Editorial photograph of a maker-space workshop, long benches with laptops and hardware components, cable arrays and monitors overhead, participants collaborating in small pairs, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accents from LED strips under benches, photorealistic, editorial magazine style, hands-on focus, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "pitch-event-formal",
    event_type: "pitch_event",
    prompt: "Editorial photograph of a formal pitch competition, panel of judges seated at a long table facing a single presenter at a lectern, muted stage lighting, dark cinematic color grade, ink navy #0A1628 dominant tone, subtle parrot green #3ECF6E accents on judge desk lamps, blurred audience in soft background, photorealistic, editorial magazine style, high-stakes composure, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
  {
    key: "generic-networking",
    event_type: "meetup",
    prompt: "Editorial photograph of a generic tech networking event, wide shot of a mid-sized ballroom filled with standing conversation clusters, hanging pendant lights, dark cinematic color grade, ink navy #0A1628 dominant tone, parrot green #3ECF6E accent on a distant welcome banner rail (abstract, no text visible), photorealistic, editorial magazine style, low-key professional buzz, 16:9 landscape, no text overlays, no visible logos, no branded content",
  },
] as const;

// ── Env + CLI parsing ─────────────────────────────────────────────
const FORCE = process.argv.includes("--force");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;

const requireEnv = (k: string): string => {
  const v = process.env[k];
  if (!v) throw new Error(`${k} required`);
  return v;
};

const CF_ACCOUNT = requireEnv("CLOUDFLARE_ACCOUNT_ID");
const CF_KEY = requireEnv("CLOUDFLARE_API_KEY");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── FLUX call ─────────────────────────────────────────────────────
async function generateImage(prompt: string): Promise<Uint8Array> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      width: 1536,
      height: 864,
      num_steps: 8,
    }),
  });
  if (!res.ok) throw new Error(`FLUX ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  const b64 = json?.result?.image;
  if (typeof b64 !== "string") throw new Error(`FLUX response missing result.image: ${JSON.stringify(json).slice(0, 200)}`);
  return Uint8Array.from(Buffer.from(b64, "base64"));
}

// ── Storage upload ────────────────────────────────────────────────
async function upload(archetypeKey: string, promptVersion: number, bytes: Uint8Array): Promise<string> {
  const path = `${archetypeKey}-v${promptVersion}.png`;
  const { error } = await supabase.storage
    .from("event-fallbacks")
    .upload(path, bytes, { contentType: "image/png", upsert: true });
  if (error) throw new Error(`storage upload ${path}: ${error.message}`);
  const { data } = supabase.storage.from("event-fallbacks").getPublicUrl(path);
  return data.publicUrl;
}

// ── Main ──────────────────────────────────────────────────────────
async function run() {
  const targets = ONLY ? ARCHETYPES.filter((a) => a.key === ONLY) : ARCHETYPES;
  if (targets.length === 0) {
    console.error(`No archetypes match --only=${ONLY}`);
    process.exit(1);
  }

  console.log(`Generating ${targets.length} archetype(s) (force=${FORCE})`);
  let created = 0, skipped = 0, failed = 0;

  for (const a of targets) {
    const { data: existing } = await supabase
      .from("event_image_templates")
      .select("archetype_key, prompt_version, public_url")
      .eq("archetype_key", a.key)
      .maybeSingle();

    if (existing && !FORCE) {
      console.log(`✓ skip ${a.key} — already present (v${existing.prompt_version})`);
      skipped++;
      continue;
    }

    const nextVersion = (existing?.prompt_version ?? 0) + 1;
    console.log(`→ generate ${a.key} v${nextVersion}`);

    try {
      const bytes = await generateImage(a.prompt);
      const publicUrl = await upload(a.key, nextVersion, bytes);

      const { error: upsertErr } = await supabase
        .from("event_image_templates")
        .upsert({
          archetype_key: a.key,
          event_type: a.event_type,
          category: a.event_type,
          format: "in_person",
          template_url: publicUrl,
          public_url: publicUrl,
          storage_path: `${a.key}-v${nextVersion}.png`,
          prompt_version: nextVersion,
          generated_at: new Date().toISOString(),
        }, { onConflict: "archetype_key" });
      if (upsertErr) throw new Error(`upsert row: ${upsertErr.message}`);

      console.log(`  ✓ ${publicUrl}`);
      created++;
    } catch (err) {
      console.error(`  ✗ ${a.key} failed:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nSummary: ${created} created, ${skipped} skipped, ${failed} failed`);
  if (failed) process.exit(1);
}

run().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
