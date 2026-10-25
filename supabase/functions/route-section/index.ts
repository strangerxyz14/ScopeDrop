// ─────────────────────────────────────────────────────────────
// route-section — routes published articles that were never routed.
//
// generate-content routes new articles inline (_shared/section-router.ts).
// This function covers the rest:
//   - the backfill: articles with router_version NULL, written before
//     the router existed (their category came from the copywriting call);
//   - retries: articles whose routing fell back because the LLM failed.
// A ROUTER_VERSION bump does NOT make routed articles stale any more.
// On 2026-10-24 it did, which put ~1,000 recent articles through the LLM,
// used up Groq's daily tokens on both gpt-oss models and starved live
// article writing. Re-route deliberately with {"ids": [...]}.
//
// Two passes, cheapest first:
//   free: every unrouted row that needs no LLM, in pages of FREE_PAGE with
//         grouped writes. Rule (the signal's classifier_verdict, or a
//         capital_events row with the signal's source_url) → funding /
//         acquisitions. Legacy (older than LLM_WINDOW_DAYS and the category
//         maps to a section) → kept. Anything else is marked
//         section_status 'needs_llm' so later free passes skip it.
//   llm:  'needs_llm' rows, newest first, LLM calls LLM_DELAY_MS apart at
//         budget priority "backfill" (the lowest: it stops once a model's
//         24h usage reaches 45% of its daily limit). A rate limit, cooldown
//         or budget stop ends the batch without writing; the rest waits.
//
// POST body (all optional):
//   {"mode": "auto"}       free pass, then llm with any time left (default)
//   {"mode": "free"}       free pass only; never calls the LLM
//   {"mode": "llm"}        llm pass only
//   {"mode": "fallback"}   retry section_source = 'fallback' rows (llm)
//   {"ids": ["<uuid>", …]} these articles, whatever their state (llm)
//   {"limit": 25}          rows per llm pass (max 100; time-boxed too)
//   {"dry_run": true}      return decisions without writing
//
// Deploy with verify_jwt ON; only the service role may call it. Needs
// migrations 20261025130000 (section columns) and 20261025160000 (budget
// tables; without them the allocator fails open).
// ─────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  decisionColumns,
  legacyDecision,
  ROUTER_VERSION,
  routeSection,
  ruleSection,
  type ClassifierVerdict,
  type SectionDecision,
} from "../_shared/section-router.ts";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const FREE_PAGE = 1000; // PostgREST's max rows per request
const LOOKUP_CHUNK = 150; // ids per .in() filter, keeps request URLs short
const TIME_BUDGET_MS = 110_000;
const LLM_DELAY_MS = 8_000;
const LLM_WINDOW_DAYS = 30;
const MAX_CHANGES_REPORTED = 100;

type Mode = "auto" | "free" | "llm" | "fallback" | "ids";
type Supabase = ReturnType<typeof createClient>;

interface ArticleRow {
  id: string;
  headline: string;
  summary: string | null;
  content_html: string | null;
  category: string | null;
  source_signal_id: string | null;
  created_at: string;
}

interface SignalRow {
  id: string;
  title: string | null;
  raw_content: string | null;
  source_url: string | null;
  classifier_verdict: string | null;
}

interface Context {
  signals: Map<string, SignalRow>;
  eventVerdicts: Map<string, ClassifierVerdict>;
}

const ARTICLE_COLUMNS = "id, headline, summary, content_html, category, source_signal_id, created_at";

const EVENT_VERDICT: Record<string, ClassifierVerdict> = {
  funding: "funding",
  acquisition: "acquisition",
  ipo: "acquisition",
};

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

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Source signals and recorded capital events for a batch of articles. */
async function loadContext(supabase: Supabase, articles: ArticleRow[], withContent: boolean): Promise<Context> {
  const signals = new Map<string, SignalRow>();
  const signalIds = [...new Set(articles.map((a) => a.source_signal_id).filter((x): x is string => !!x))];
  const columns = withContent ? "id, title, raw_content, source_url, classifier_verdict" : "id, title, source_url, classifier_verdict";
  for (const part of chunks(signalIds, LOOKUP_CHUNK)) {
    const { data, error } = await supabase.from("raw_signals").select(columns).in("id", part);
    if (error) throw error;
    for (const s of (data ?? []) as unknown as SignalRow[]) signals.set(s.id, s);
  }

  // Recorded funding/M&A/IPO events by source URL, for signals that
  // predate raw_signals.classifier_verdict.
  const eventVerdicts = new Map<string, ClassifierVerdict>();
  const sourceUrls = [...new Set([...signals.values()].map((s) => s.source_url).filter((x): x is string => !!x))];
  for (const part of chunks(sourceUrls, LOOKUP_CHUNK)) {
    const { data, error } = await supabase.from("capital_events").select("source_url, event_type").in("source_url", part);
    if (error) throw error;
    for (const e of (data ?? []) as { source_url: string; event_type: string }[]) {
      const verdict = EVENT_VERDICT[e.event_type];
      if (verdict && !eventVerdicts.has(e.source_url)) eventVerdicts.set(e.source_url, verdict);
    }
  }
  return { signals, eventVerdicts };
}

function verdictFor(article: ArticleRow, ctx: Context): string | null {
  const signal = article.source_signal_id ? ctx.signals.get(article.source_signal_id) : undefined;
  const signalVerdict = signal?.classifier_verdict ?? null;
  if (ruleSection(signalVerdict)) return signalVerdict;
  const eventVerdict = signal?.source_url ? ctx.eventVerdicts.get(signal.source_url) : undefined;
  return eventVerdict ?? signalVerdict;
}

serve(async (req) => {
  try {
    if (!hasServiceRole(req)) return jsonResp({ error: "service role required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }, 500);

    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch { /* empty body from cron */ }
    const dryRun = body.dry_run === true;
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
    const mode: Mode = ids.length > 0 ? "ids" : (["free", "llm", "fallback"].includes(body.mode) ? body.mode : "auto");
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isInteger(body.limit) ? body.limit : DEFAULT_LIMIT));

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const started = Date.now();
    const llmCutoff = started - LLM_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const bySource: Record<SectionDecision["source"], number> = { rule: 0, llm: 0, fallback: 0, legacy: 0 };
    const free = { scanned: 0, routed: 0, needs_llm: 0, exhausted: false };
    let review = 0;
    let changed = 0;
    let written = 0;
    let stopReason: "time_budget" | "rate_limited" | null = null;
    const changes: unknown[] = [];
    const llmDecisions: unknown[] = [];

    const note = (article: ArticleRow, decision: SectionDecision) => {
      bySource[decision.source]++;
      if (decision.status === "review") review++;
      const summary = {
        id: article.id, headline: article.headline, from: article.category, to: decision.section,
        secondary: decision.secondary, confidence: decision.confidence, source: decision.source, reason: decision.reason,
      };
      if (decision.source === "llm" && llmDecisions.length < MAX_CHANGES_REPORTED) llmDecisions.push(summary);
      if (decision.section !== article.category) {
        changed++;
        if (changes.length < MAX_CHANGES_REPORTED) changes.push(summary);
      }
    };

    // ── Free pass ───────────────────────────────────────────
    if (mode === "auto" || mode === "free") {
      // Dry runs read one page: nothing is written, so later pages would
      // repeat it.
      while (Date.now() - started < TIME_BUDGET_MS) {
        const { data, error } = await supabase.from("articles")
          .select(ARTICLE_COLUMNS)
          .eq("status", "published")
          .is("router_version", null)
          .or("section_status.is.null,section_status.neq.needs_llm")
          .order("created_at", { ascending: false })
          .limit(FREE_PAGE);
        if (error) throw error;
        const page = (data ?? []) as ArticleRow[];
        free.scanned += page.length;
        if (page.length === 0) {
          free.exhausted = true;
          break;
        }

        const ctx = await loadContext(supabase, page, false);
        const groups = new Map<string, { columns: Record<string, unknown>; ids: string[] }>();
        const needsLlm: string[] = [];
        for (const article of page) {
          const verdict = verdictFor(article, ctx);
          let decision: SectionDecision | null = null;
          if (ruleSection(verdict)) {
            // The rule path returns before any LLM call.
            decision = await routeSection({ headline: article.headline, body: "", verdict });
          } else if (new Date(article.created_at).getTime() < llmCutoff) {
            decision = legacyDecision(article.category);
          }
          if (!decision) {
            needsLlm.push(article.id);
            continue;
          }
          note(article, decision);
          const columns = decisionColumns(decision);
          const key = JSON.stringify(columns);
          const group = groups.get(key) ?? { columns, ids: [] as string[] };
          group.ids.push(article.id);
          groups.set(key, group);
        }
        free.routed += page.length - needsLlm.length;
        free.needs_llm += needsLlm.length;

        if (dryRun) break;
        for (const { columns, ids: groupIds } of groups.values()) {
          for (const part of chunks(groupIds, LOOKUP_CHUNK)) {
            const { error: updErr } = await supabase.from("articles").update(columns).in("id", part);
            if (updErr) throw updErr;
            written += part.length;
          }
        }
        for (const part of chunks(needsLlm, LOOKUP_CHUNK)) {
          const { error: updErr } = await supabase.from("articles").update({ section_status: "needs_llm" }).in("id", part);
          if (updErr) throw updErr;
        }
        if (page.length < FREE_PAGE) {
          free.exhausted = true;
          break;
        }
      }
      if (!free.exhausted && !dryRun) stopReason = "time_budget";
    }

    // ── LLM pass ────────────────────────────────────────────
    const runLlm = mode === "llm" || mode === "fallback" || mode === "ids" || (mode === "auto" && free.exhausted);
    if (runLlm && Date.now() - started < TIME_BUDGET_MS) {
      let q = supabase.from("articles").select(ARTICLE_COLUMNS).eq("status", "published");
      if (mode === "ids") q = q.in("id", ids.slice(0, MAX_LIMIT));
      else if (mode === "fallback") q = q.eq("section_source", "fallback");
      else q = q.is("router_version", null).eq("section_status", "needs_llm");
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(mode === "ids" ? MAX_LIMIT : limit);
      if (error) throw error;
      const batch = (data ?? []) as ArticleRow[];
      const ctx = await loadContext(supabase, batch, true);

      let lastLlmAt = 0;
      for (const article of batch) {
        const verdict = verdictFor(article, ctx);
        if (!ruleSection(verdict)) {
          const wait = Math.max(0, lastLlmAt + LLM_DELAY_MS - Date.now());
          if (Date.now() + wait - started > TIME_BUDGET_MS) {
            stopReason = "time_budget";
            break;
          }
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          lastLlmAt = Date.now();
        }
        const signal = article.source_signal_id ? ctx.signals.get(article.source_signal_id) : undefined;
        const decision = await routeSection({
          headline: signal?.title?.trim() || article.headline,
          body: signal?.raw_content?.trim() ? signal.raw_content : `${article.summary ?? ""} ${article.content_html ?? ""}`,
          verdict,
          fallback: article.category,
          priority: "backfill",
        });

        // Rate limited, cooling down or over budget: don't write a fallback;
        // the row stays queued for the next run.
        if (decision.rateLimited) {
          stopReason = "rate_limited";
          break;
        }
        note(article, decision);
        if (!dryRun) {
          const { error: updErr } = await supabase.from("articles").update(decisionColumns(decision)).eq("id", article.id);
          if (updErr) throw updErr;
          written++;
        }
      }
    }

    const { count: unrouted } = await supabase.from("articles")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .is("router_version", null);

    return jsonResp({
      dry_run: dryRun,
      mode,
      router_version: ROUTER_VERSION,
      free,
      by_source: bySource,
      review,
      changed,
      written,
      unrouted_remaining: unrouted,
      stop_reason: stopReason,
      elapsed_ms: Date.now() - started,
      changes,
      llm_decisions: llmDecisions,
    });
  } catch (error) {
    console.error("route-section fatal error:", error);
    const message = error instanceof Error
      ? error.message
      : (error as { message?: string })?.message ?? String(error);
    return jsonResp({ error: message }, 500);
  }
});
