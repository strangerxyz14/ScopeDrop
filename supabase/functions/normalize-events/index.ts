// ============================================================
// normalize-events edge function.
//
// Reads rows from scheduled_events with status='awaiting_enrichment',
// runs the three-tier extraction cascade if canonical_url is set and
// mandatory fields aren't already filled, validates Layer A (strict
// mandatory-field gate), calls the image + logo resolvers, and
// generates Highlights + Scope via Layer B editorial pass. Publishes
// (status='published') only when BOTH layers succeed.
//
// Cron cadence: intended every 15 min, batches of 20 rows.
// SEE 20260801190000_normalize_events_cron.sql — that migration
// ships the pg_cron schedule but is applied disabled; enable by
// uncommenting the pg_cron.schedule() call once smoke-tested.
//
// Cost gating: every Groq call goes through callLLM which writes a
// per-provider row to llm_stats. Watch the daily counter — worst-case
// a fully-loaded queue is 20 rows × (1 extract + 1 highlights + 1 scope)
// × 96 runs/day ≈ 5,760 Groq calls, which will hit the free daily
// token ceiling on TASK.LONG_ANALYTICAL. Keep batch size at 20 and
// enable the cron only when awaiting_enrichment volume justifies it.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractEventFromUrl, type ExtractedEvent } from "../_shared/event-cascade.ts";
import { resolveHeroImage, resolveOrganizerLogoFull } from "../_shared/event-image-resolver.ts";
import { callLLM, TASK } from "../_shared/llm.ts";
import {
  HIGHLIGHTS_SYSTEM, buildHighlightsUser,
  SCOPE_SYSTEM, buildScopeUser,
  normalizeEditorialOutput,
} from "../_shared/event-editorial-prompts.ts";

const ALLOWED_ORIGINS = [
  ...(Deno.env.get("ENVIRONMENT") === "development"
    ? ["http://localhost:5173", "http://localhost:8080"]
    : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".pages.dev") || origin.endsWith(".workers.dev"))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const MAX_ROWS_PER_RUN = 20;

// deno-lint-ignore no-explicit-any
type EventRow = any;

// ------------------------------------------------------------
// Layer A — mandatory-field validation. Strict per plan spec.
// Rejects the row (status='enrichment_failed') if any field fails.
// ------------------------------------------------------------
function validateMandatoryFields(row: EventRow): string[] {
  const missing: string[] = [];
  if (!row.title || String(row.title).length < 6) missing.push("title");
  const starts = row.starts_at ? new Date(row.starts_at).getTime() : NaN;
  if (!isFinite(starts) || starts < Date.now() - 86_400_000) missing.push("start_at");
  if (!row.organizer_name) missing.push("organizer");
  if (!row.registration_url) missing.push("registration_url");
  if (!row.is_virtual && !row.city) missing.push("location");
  if (!row.description || String(row.description).length < 120) missing.push("source_description");
  return missing;
}

// ------------------------------------------------------------
// Merge extraction results into the row shape. Only fills nulls —
// never overwrites a value the fetcher already set (e.g. serpapi
// having populated organizer_name shouldn't be clobbered by a
// weaker LLM guess).
// ------------------------------------------------------------
function mergeExtractionIntoRow(row: EventRow, e: ExtractedEvent): EventRow {
  const next = { ...row };
  next.title ??= e.title;
  next.starts_at ??= e.start_at;
  next.ends_at ??= e.end_at;
  next.timezone ??= e.timezone;
  next.organizer_name ??= e.organizer_name;
  next.description ??= e.source_description;
  next.registration_url ??= e.registration_url;
  next.is_virtual = next.is_virtual ?? e.location.is_online ?? false;
  next.city ??= e.location.city;
  next.location ??= e.location.venue ?? e.location.address;
  next.extraction_tier ??= e.extraction_tier;
  // image_candidates stays on the extracted object — not persisted per row
  next._image_candidates = e.image_candidates;
  next._organizer_logo_hint = e.organizer_logo_hint;
  next._organizer_website = e.organizer_website;
  return next;
}

// ------------------------------------------------------------
// Layer B — Highlights + Scope. Either failing → publish blocked.
// ------------------------------------------------------------
async function tryGenerateHighlights(row: EventRow): Promise<string | null> {
  try {
    const res = await callLLM(
      TASK.SHORT_GENERATIVE,
      HIGHLIGHTS_SYSTEM,
      buildHighlightsUser({
        title: row.title,
        source_description: row.description,
        organizer_name: row.organizer_name ?? "",
        event_type: row.event_type ?? "conference",
      }),
      { maxTokens: 300, temperature: 0.4 },
    );
    return normalizeEditorialOutput(res.content, "highlights");
  } catch (err) {
    console.warn("highlights gen failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

async function tryGenerateScope(row: EventRow): Promise<string | null> {
  try {
    const res = await callLLM(
      TASK.LONG_ANALYTICAL,
      SCOPE_SYSTEM,
      buildScopeUser({
        title: row.title,
        source_description: row.description,
        organizer_name: row.organizer_name ?? "",
        event_type: row.event_type ?? "conference",
      }),
      { maxTokens: 500, temperature: 0.4 },
    );
    return normalizeEditorialOutput(res.content, "scope");
  } catch (err) {
    console.warn("scope gen failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ------------------------------------------------------------
// Per-row processor. Returns a short outcome tag for the response
// summary so we can grep the response body to see per-row disposition
// without paging through Supabase logs.
// ------------------------------------------------------------
type Outcome =
  | "published" | "enrichment_failed_validation" | "enrichment_failed_editorial"
  | "extraction_failed" | "error";

async function processOne(row: EventRow, supabase: SupabaseClient): Promise<Outcome> {
  try {
    // Run cascade if we have a canonical_url and source_description is thin
    if (row.canonical_url && (!row.description || String(row.description).length < 120)) {
      const extraction = await extractEventFromUrl(row.canonical_url);
      if (!extraction.event) {
        await markRejected(supabase, row.id, `extraction:${extraction.errors.join("|") || "no_event"}`);
        return "extraction_failed";
      }
      row = mergeExtractionIntoRow(row, extraction.event);
    }

    // Layer A — mandatory fields
    const missing = validateMandatoryFields(row);
    if (missing.length) {
      await markRejected(supabase, row.id, `missing:${missing.join(",")}`);
      return "enrichment_failed_validation";
    }

    // Image + logo resolution
    const hero = await resolveHeroImage(
      row._image_candidates ?? (row.image_url ? [row.image_url] : []),
      row.event_type,
      supabase,
    );
    const logo = await resolveOrganizerLogoFull(
      supabase,
      row.organizer_name,
      row._organizer_website ?? null,
      row._organizer_logo_hint ?? row.organizer_logo_url ?? null,
    );

    // Layer B — editorial. Both must succeed for publish.
    const [highlights, scope] = await Promise.all([
      tryGenerateHighlights(row),
      tryGenerateScope(row),
    ]);

    const canPublish = !!(highlights && scope);
    const finalStatus = canPublish ? "published" : "enrichment_failed";
    const failure = canPublish ? null : `editorial:${!highlights ? "highlights " : ""}${!scope ? "scope" : ""}`.trim();

    await supabase.from("scheduled_events").update({
      title: row.title,
      description: row.description,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      timezone: row.timezone,
      is_virtual: row.is_virtual,
      city: row.city,
      location: row.location,
      registration_url: row.registration_url,
      organizer_name: row.organizer_name,
      image_url: hero.url,
      hero_image_source: hero.source,
      organizer_logo_url: logo.url,
      logo_source: logo.source,
      highlights,
      scope_analysis: scope,
      status: finalStatus,
      rejection_reason: failure,
      extraction_tier: row.extraction_tier,
      enriched_at: new Date().toISOString(),
      validated_at: new Date().toISOString(),
    }).eq("id", row.id);

    return canPublish ? "published" : "enrichment_failed_editorial";
  } catch (err) {
    console.error(`normalize-events row ${row.id} failed:`, err instanceof Error ? err.message : err);
    await supabase.from("scheduled_events")
      .update({
        status: "enrichment_failed",
        rejection_reason: `error:${(err instanceof Error ? err.message : String(err)).slice(0, 300)}`,
      })
      .eq("id", row.id);
    return "error";
  }
}

async function markRejected(supabase: SupabaseClient, id: string, reason: string) {
  await supabase.from("scheduled_events")
    .update({ status: "enrichment_failed", rejection_reason: reason, validated_at: new Date().toISOString() })
    .eq("id", id);
}

// ------------------------------------------------------------
// Main handler
// ------------------------------------------------------------
serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: rows, error } = await supabase
      .from("scheduled_events")
      .select("*")
      .eq("status", "awaiting_enrichment")
      .order("created_at", { ascending: true })
      .limit(MAX_ROWS_PER_RUN);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.allSettled(
      (rows ?? []).map(r => processOne(r, supabase)),
    );

    const summary: Record<Outcome, number> = {
      published: 0,
      enrichment_failed_validation: 0,
      enrichment_failed_editorial: 0,
      extraction_failed: 0,
      error: 0,
    };
    for (const r of results) {
      if (r.status === "fulfilled") summary[r.value]++;
      else summary.error++;
    }

    return new Response(
      JSON.stringify({ processed: results.length, ...summary }),
      { headers: { ...cors, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("normalize-events fatal:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
