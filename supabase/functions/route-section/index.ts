// ─────────────────────────────────────────────────────────────
// route-section — reruns the section router over published articles.
//
// generate-content routes new articles inline (_shared/section-router.ts).
// This function covers everything else:
//   - the backfill: articles routed by an older ROUTER_VERSION, or never
//     routed (the copywriting call picked their category);
//   - retries: articles whose routing fell back because the LLM failed.
// It reads the SOURCE signal's headline, text and classifier verdict, so
// the decision matches what generate-content would make today. Articles
// without a signal fall back to their own headline and summary.
//
// Per article, cheapest first:
//   1. Rule: the signal's classifier_verdict, or a capital_events row with
//      the same source_url (covers signals from before classifier_verdict
//      existed) → funding / acquisitions.
//   2. Legacy: older than LLM_WINDOW_DAYS and the category maps to a
//      section → keep it (source 'legacy'). No LLM call.
//   3. LLM: everything else, including old rows with unmappable categories.
// Groq's free tier allows gpt-oss-20b 8,000 tokens/minute and a router
// call is ~1–1.3k tokens, so LLM calls are spaced LLM_DELAY_MS apart.
// On a rate limit, the batch stops instead of writing fallbacks; the
// unprocessed rows stay stale for the next call.
//
// POST body (all optional):
//   {"dry_run": true}        return decisions without writing
//   {"limit": 25}            articles per call (max 100; time-boxed too)
//   {"mode": "stale"}        router_version is null or older (default)
//   {"mode": "fallback"}     section_source = 'fallback' only
//   {"ids": ["<uuid>", …]}   these articles, whatever their state
//
// Deploy with verify_jwt ON; only the service role may call it. Needs
// migration 20261025130000_section_router_columns.sql applied first.
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
const TIME_BUDGET_MS = 110_000;
const LLM_DELAY_MS = 8_000;
const LLM_WINDOW_DAYS = 30;
const MAX_CHANGES_REPORTED = 100;

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

serve(async (req) => {
  try {
    if (!hasServiceRole(req)) return jsonResp({ error: "service role required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }, 500);

    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch { /* empty body */ }
    const dryRun = body.dry_run === true;
    const mode: "stale" | "fallback" = body.mode === "fallback" ? "fallback" : "stale";
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isInteger(body.limit) ? body.limit : DEFAULT_LIMIT));
    const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let q = supabase
      .from("articles")
      .select("id, headline, summary, content_html, category, source_signal_id, created_at")
      .eq("status", "published");
    if (ids.length > 0) {
      q = q.in("id", ids.slice(0, MAX_LIMIT));
    } else if (mode === "fallback") {
      q = q.eq("section_source", "fallback");
    } else {
      q = q.or(`router_version.is.null,router_version.neq.${ROUTER_VERSION}`);
    }
    const { data: articleData, error: articleErr } = await q
      .order("created_at", { ascending: false })
      .limit(ids.length > 0 ? MAX_LIMIT : limit);
    if (articleErr) throw articleErr;
    const articles = (articleData ?? []) as ArticleRow[];

    const signalIds = [...new Set(articles.map((a) => a.source_signal_id).filter((x): x is string => !!x))];
    const signals = new Map<string, SignalRow>();
    if (signalIds.length > 0) {
      const { data: signalData, error: signalErr } = await supabase
        .from("raw_signals")
        .select("id, title, raw_content, source_url, classifier_verdict")
        .in("id", signalIds);
      if (signalErr) throw signalErr;
      for (const s of (signalData ?? []) as SignalRow[]) signals.set(s.id, s);
    }

    // Recorded funding/M&A/IPO events by source URL, for signals that
    // predate raw_signals.classifier_verdict.
    const sourceUrls = [...new Set([...signals.values()].map((s) => s.source_url).filter((x): x is string => !!x))];
    const eventVerdicts = new Map<string, ClassifierVerdict>();
    if (sourceUrls.length > 0) {
      const { data: eventData, error: eventErr } = await supabase
        .from("capital_events")
        .select("source_url, event_type")
        .in("source_url", sourceUrls);
      if (eventErr) throw eventErr;
      for (const e of (eventData ?? []) as { source_url: string; event_type: string }[]) {
        const verdict = EVENT_VERDICT[e.event_type];
        if (verdict && !eventVerdicts.has(e.source_url)) eventVerdicts.set(e.source_url, verdict);
      }
    }

    const started = Date.now();
    const llmCutoff = started - LLM_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const bySource: Record<SectionDecision["source"], number> = { rule: 0, llm: 0, fallback: 0, legacy: 0 };
    let review = 0;
    let changed = 0;
    let written = 0;
    let processed = 0;
    let stopReason: "time_budget" | "rate_limited" | null = null;
    let lastLlmAt = 0;
    const changes: unknown[] = [];
    const llmDecisions: unknown[] = [];

    for (const article of articles) {
      if (Date.now() - started > TIME_BUDGET_MS) {
        stopReason = "time_budget";
        break;
      }

      const signal = article.source_signal_id ? signals.get(article.source_signal_id) : undefined;
      const signalVerdict = signal?.classifier_verdict ?? null;
      const eventVerdict = signal?.source_url ? eventVerdicts.get(signal.source_url) : undefined;
      const verdict = ruleSection(signalVerdict) ? signalVerdict : (eventVerdict ?? signalVerdict);

      let decision: SectionDecision | null = null;
      if (!ruleSection(verdict) && new Date(article.created_at).getTime() < llmCutoff) {
        decision = legacyDecision(article.category);
      }
      if (!decision) {
        const needsLlm = !ruleSection(verdict);
        if (needsLlm) {
          const wait = Math.max(0, lastLlmAt + LLM_DELAY_MS - Date.now());
          if (Date.now() + wait - started > TIME_BUDGET_MS) {
            stopReason = "time_budget";
            break;
          }
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          lastLlmAt = Date.now();
        }
        const sourceBody = signal?.raw_content?.trim()
          ? signal.raw_content
          : `${article.summary ?? ""} ${article.content_html ?? ""}`;
        decision = await routeSection({
          headline: signal?.title?.trim() || article.headline,
          body: sourceBody,
          verdict,
          fallback: article.category,
        });
      }

      // Don't write a fallback caused by a rate limit: the row stays stale
      // and the next call retries it with the LLM.
      if (decision.rateLimited) {
        stopReason = "rate_limited";
        break;
      }

      processed++;
      bySource[decision.source]++;
      if (decision.status === "review") review++;
      const summary = {
        id: article.id,
        headline: article.headline,
        from: article.category,
        to: decision.section,
        secondary: decision.secondary,
        confidence: decision.confidence,
        source: decision.source,
        reason: decision.reason,
      };
      if (decision.source === "llm" && llmDecisions.length < MAX_CHANGES_REPORTED) llmDecisions.push(summary);
      if (decision.section !== article.category) {
        changed++;
        if (changes.length < MAX_CHANGES_REPORTED) changes.push(summary);
      }

      if (!dryRun) {
        const { error: updErr } = await supabase
          .from("articles")
          .update(decisionColumns(decision))
          .eq("id", article.id);
        if (updErr) throw updErr;
        written++;
      }
    }

    return jsonResp({
      dry_run: dryRun,
      mode: ids.length > 0 ? "ids" : mode,
      router_version: ROUTER_VERSION,
      scanned: articles.length,
      processed,
      by_source: bySource,
      review,
      changed,
      written,
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
