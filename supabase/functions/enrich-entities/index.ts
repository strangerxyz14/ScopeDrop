// ─────────────────────────────────────────────────────────────
// enrich-entities — fills entity profiles (website, domain, founded
// year, HQ, employees, logo, Wikidata / SEC / YC ids) from structured
// sources. No LLM: Groq's daily tokens stay with article writing.
// Matching rules live in _shared/entity-enrichment.ts.
//
// POST body (all optional):
//   {"mode": "auto"}              enrich the queue: never-enriched rows
//                                 first (newest first), then retries of
//                                 no_match / unconfirmed / ambiguous rows
//                                 older than RETRY_AFTER_DAYS (default;
//                                 what the cron sends). Refreshes the
//                                 registry first when it is empty.
//   {"mode": "refresh_registry"}  reload company_registry from the YC
//                                 directory and the SEC company list
//   {"ids": ["<uuid>", …]}        these entities, whatever their state
//   {"limit": 25}                 entities per run (max 60; time-boxed)
//   {"dry_run": true}             return decisions without writing
//
// A Wikidata 429 ends the batch without writing "no_match" for the rows
// it could not check; they stay queued (stop_reason "rate_limited").
//
// Deploy with verify_jwt ON; only the service role may call it.
// Needs migration 20261031120000_entity_enrichment.sql.
// Optional secret ENRICH_CONTACT: an email or URL for the User-Agent that
// SEC and Wikidata ask API clients to send. Defaults to the site URL.
// ─────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { logoDevUrl } from "../_shared/event-extraction.ts";
import {
  type BatchItem,
  enrichBatch,
  ENRICHMENT_VERSION,
  type EntityRow,
  parseSecTickers,
  parseYcCompanies,
  type RegistryRow,
  userAgent,
} from "../_shared/entity-enrichment.ts";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 60;
const RETRY_AFTER_DAYS = 30;
const REGISTRY_CHUNK = 500;
const LOOKUP_CHUNK = 150;
const CONTEXT_CHARS = 6000;
const YC_URL = "https://yc-oss.github.io/api/companies/all.json";
const SEC_URL = "https://www.sec.gov/files/company_tickers.json";

const ENTITY_COLUMNS =
  "id, name, entity_type, website, founded_year, headquarters, employee_count_estimate, description, logo_url, domain, wikidata_id, sec_cik, ticker, yc_id";
const ROUND_ORDER = ["pre_seed", "seed", "series_a", "series_b", "series_c", "series_d_plus", "growth", "debt"];

type Supabase = ReturnType<typeof createClient>;

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// verify_jwt ON means the gateway already checked the signature; this
// only stops the public anon key (also a valid JWT) from triggering it.
function hasServiceRole(req: Request): boolean {
  const token = (req.headers.get("authorization") ?? "").replace(/^bearer\s+/i, "").trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) return true;
  const segments = token.split(".");
  if (segments.length < 2) return false;
  try {
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded))?.role === "service_role";
  } catch {
    return false;
  }
}

function chunks<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

// ── Registry ────────────────────────────────────────────────

async function refreshRegistry(supabase: Supabase, ua: string): Promise<Record<string, number>> {
  const [ycRes, secRes] = await Promise.all([fetch(YC_URL), fetch(SEC_URL, { headers: { "User-Agent": ua } })]);
  if (!ycRes.ok) throw new Error(`yc directory HTTP ${ycRes.status}`);
  if (!secRes.ok) throw new Error(`sec company list HTTP ${secRes.status}`);
  const rows: RegistryRow[] = [...parseYcCompanies(await ycRes.json()), ...parseSecTickers(await secRes.json())];
  const refreshedAt = new Date().toISOString();
  for (const part of chunks(rows, REGISTRY_CHUNK)) {
    const { error } = await supabase.from("company_registry").upsert(
      part.map((r) => ({ ...r, refreshed_at: refreshedAt })),
      { onConflict: "source,external_id" },
    );
    if (error) throw error;
  }
  // Companies that left either list since the last refresh.
  const { error: delErr } = await supabase.from("company_registry").delete().lt("refreshed_at", refreshedAt);
  if (delErr) throw delErr;
  return {
    yc: rows.filter((r) => r.source === "yc").length,
    sec: rows.filter((r) => r.source === "sec").length,
  };
}

async function registryByNames(supabase: Supabase, keys: string[]): Promise<RegistryRow[]> {
  const out: RegistryRow[] = [];
  for (const part of chunks(keys, LOOKUP_CHUNK)) {
    const { data, error } = await supabase
      .from("company_registry")
      .select("source, external_id, name, name_norm, domain, ticker, payload")
      .in("name_norm", part);
    if (error) throw error;
    out.push(...((data ?? []) as RegistryRow[]));
  }
  return out;
}

// ── Queue and context ───────────────────────────────────────

async function loadQueue(supabase: Supabase, ids: string[], limit: number): Promise<EntityRow[]> {
  if (ids.length > 0) {
    const { data, error } = await supabase.from("entities").select(ENTITY_COLUMNS).in("id", ids.slice(0, MAX_LIMIT));
    if (error) throw error;
    return (data ?? []) as EntityRow[];
  }
  const { data: fresh, error } = await supabase
    .from("entities")
    .select(ENTITY_COLUMNS)
    .is("enriched_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = (fresh ?? []) as EntityRow[];
  if (rows.length < limit) {
    const retryBefore = new Date(Date.now() - RETRY_AFTER_DAYS * 86400_000).toISOString();
    const { data: retry, error: retryErr } = await supabase
      .from("entities")
      .select(ENTITY_COLUMNS)
      .in("enrichment_status", ["no_match", "unconfirmed", "ambiguous"])
      .lt("enriched_at", retryBefore)
      .order("enriched_at", { ascending: true })
      .limit(limit - rows.length);
    if (retryErr) throw retryErr;
    rows.push(...((retry ?? []) as EntityRow[]));
  }
  return rows;
}

/**
 * For each entity: the earliest round it raised, and the text of the news
 * behind its capital events (as company, counterparty or investor). The
 * matcher uses the text to confirm a namesake is the same company.
 */
async function loadHints(supabase: Supabase, rows: EntityRow[]): Promise<BatchItem[]> {
  const ids = rows.map((r) => r.id);
  // deno-lint-ignore no-explicit-any
  const events: any[] = [];
  const eventEntities = new Map<string, Set<string>>();
  const link = (eventId: string, entityId: string) => {
    const set = eventEntities.get(eventId) ?? new Set<string>();
    set.add(entityId);
    eventEntities.set(eventId, set);
  };
  const columns = "id, primary_entity_id, counterparty_entity_id, round_type, one_liner, source_url";
  for (const part of chunks(ids, LOOKUP_CHUNK)) {
    const [asPrimary, asCounterparty, asInvestor] = await Promise.all([
      supabase.from("capital_events").select(columns).in("primary_entity_id", part),
      supabase.from("capital_events").select(columns).in("counterparty_entity_id", part),
      supabase.from("capital_event_investors").select("capital_event_id, investor_entity_id").in("investor_entity_id", part),
    ]);
    if (asPrimary.error) throw asPrimary.error;
    if (asCounterparty.error) throw asCounterparty.error;
    if (asInvestor.error) throw asInvestor.error;
    for (const e of [...(asPrimary.data ?? []), ...(asCounterparty.data ?? [])]) {
      events.push(e);
      if (ids.includes(e.primary_entity_id)) link(e.id, e.primary_entity_id);
      if (e.counterparty_entity_id && ids.includes(e.counterparty_entity_id)) link(e.id, e.counterparty_entity_id);
    }
    const investorLinks = (asInvestor.data ?? []) as { capital_event_id: string; investor_entity_id: string }[];
    const investorEventIds = [...new Set(investorLinks.map((i) => i.capital_event_id))];
    for (const i of investorLinks) link(i.capital_event_id, i.investor_entity_id);
    for (const evPart of chunks(investorEventIds, LOOKUP_CHUNK)) {
      const { data, error } = await supabase.from("capital_events").select(columns).in("id", evPart);
      if (error) throw error;
      events.push(...(data ?? []));
    }
  }

  const sourceUrls = [...new Set(events.map((e) => e.source_url).filter(Boolean))] as string[];
  const signalText = new Map<string, string>();
  for (const part of chunks(sourceUrls, 50)) {
    const { data, error } = await supabase.from("raw_signals").select("source_url, title, raw_content").in("source_url", part);
    if (error) throw error;
    for (const s of data ?? []) {
      signalText.set(s.source_url, `${s.title ?? ""} ${s.raw_content ?? ""}`);
    }
  }

  const context = new Map<string, string[]>();
  const earliest = new Map<string, string>();
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const text = `${e.one_liner ?? ""} ${e.source_url ? signalText.get(e.source_url) ?? "" : ""}`;
    for (const entityId of eventEntities.get(e.id) ?? []) {
      context.set(entityId, [...(context.get(entityId) ?? []), text]);
      if (e.primary_entity_id === entityId && e.round_type && ROUND_ORDER.includes(e.round_type)) {
        const current = earliest.get(entityId);
        if (!current || ROUND_ORDER.indexOf(e.round_type) < ROUND_ORDER.indexOf(current)) earliest.set(entityId, e.round_type);
      }
    }
  }

  return rows.map((row) => ({
    row,
    hint: {
      name: row.name,
      entity_type: row.entity_type,
      earliestRound: earliest.get(row.id) ?? null,
      context: (context.get(row.id) ?? []).join(" ").toLowerCase().slice(0, CONTEXT_CHARS),
    },
  }));
}

// ── Handler ─────────────────────────────────────────────────

serve(async (req) => {
  try {
    if (!hasServiceRole(req)) return jsonResp({ error: "service role required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }, 500);

    // deno-lint-ignore no-explicit-any
    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch { /* empty body from cron */ }
    const dryRun = body.dry_run === true;
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isInteger(body.limit) ? body.limit : DEFAULT_LIMIT));
    const ua = userAgent(Deno.env.get("ENRICH_CONTACT"));

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const started = Date.now();

    if (body.mode === "refresh_registry") {
      const loaded = await refreshRegistry(supabase, ua);
      return jsonResp({ mode: "refresh_registry", loaded, elapsed_ms: Date.now() - started });
    }

    let registryLoaded: Record<string, number> | null = null;
    const { count: registryCount, error: countErr } = await supabase
      .from("company_registry")
      .select("source", { count: "exact", head: true });
    if (countErr) throw countErr;
    if (!registryCount) registryLoaded = await refreshRegistry(supabase, ua);

    const rows = await loadQueue(supabase, ids, limit);
    const items = await loadHints(supabase, rows);
    const { outcomes, rateLimited } = await enrichBatch(items, {
      ua,
      registryByNames: (keys) => registryByNames(supabase, keys),
      logoUrlFor: logoDevUrl,
    });

    const byStatus: Record<string, number> = {};
    const filled: Record<string, number> = {};
    let written = 0;
    const now = new Date().toISOString();
    for (const { item, result } of outcomes) {
      byStatus[result.status] = (byStatus[result.status] ?? 0) + 1;
      for (const col of Object.keys(result.updates)) filled[col] = (filled[col] ?? 0) + 1;
      if (dryRun) continue;
      const { error } = await supabase.from("entities").update({
        ...result.updates,
        enrichment_status: result.status,
        enrichment_sources: result.sources,
        enrichment: result.raw,
        enriched_at: now,
      }).eq("id", item.row.id);
      if (error) throw error;
      written++;
    }

    const { count: remaining } = await supabase.from("entities")
      .select("id", { count: "exact", head: true })
      .is("enriched_at", null);

    return jsonResp({
      dry_run: dryRun,
      version: ENRICHMENT_VERSION,
      registry_loaded: registryLoaded,
      processed: outcomes.length,
      by_status: byStatus,
      filled,
      written,
      never_enriched_remaining: remaining,
      // Wikidata asked us to slow down: the undecided rows wait for the next run.
      stop_reason: rateLimited ? "rate_limited" : null,
      elapsed_ms: Date.now() - started,
      decisions: outcomes.map(({ item, result }) => ({
        id: item.row.id,
        name: item.row.name,
        status: result.status,
        sources: result.sources,
        updates: result.updates,
      })),
    });
  } catch (error) {
    console.error("enrich-entities fatal error:", error);
    const message = error instanceof Error
      ? error.message
      : (error as { message?: string })?.message ?? String(error);
    return jsonResp({ error: message }, 500);
  }
});
