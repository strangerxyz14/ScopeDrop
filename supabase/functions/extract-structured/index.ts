import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://scopedrop.lovable.app",
  "https://id-preview--4acd3d99-4555-4448-bee8-897d547c57c0.lovable.app",
  "https://scopedrop1.netlify.app",
  ...(Deno.env.get("ENVIRONMENT") === "development"
    ? ["http://localhost:5173", "http://localhost:8080"]
    : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin =
    origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith(".netlify.app") || origin.endsWith(".lovable.app") || origin.endsWith(".pages.dev"))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// Model fallback chains (same family as generate-content).
// Classifier uses cheapest-first; extractor uses strongest-first.
const CLASSIFY_MODELS = ["llama-3.1-8b-instant", "llama-3.3-70b-versatile"];
const EXTRACT_MODELS = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];

const MAX_SIGNALS_PER_RUN = 5;

// ── Sanitize raw content (same approach as generate-content) ──
function sanitizeContent(raw: string): string {
  let text = raw;
  text = text.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/https?:\/\/[^\s]+/gi, "");
  text = text.replace(/\s+/g, " ").trim();
  return text.slice(0, 1500);
}

// ── Groq call with model fallback on 429 ──
async function callGroq(
  apiKey: string,
  models: string[],
  system: string,
  user: string,
  maxTokens: number
): Promise<string> {
  for (const model of models) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (res.status === 429) {
      console.warn(`429 from ${model}, trying next model...`);
      continue;
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq ${res.status}: ${errText.slice(0, 300)}`);
    }
    const json = await res.json();
    return json.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("429_all_models_exhausted");
}

function safeJsonParse(text: string): any {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  }
  return JSON.parse(cleaned);
}

// ── Prompts ──
const CLASSIFY_SYSTEM = `You are a classifier for a startup news pipeline. Given a headline and article text, output ONLY a JSON object: {"content_type": X} where X is exactly one of: "funding" (a specific company raising a specific round), "acquisition" (a company being acquired, merging, or IPOing), "narrative" (startup/tech news, analysis, trends, profiles), "irrelevant" (not startup/tech related). If the text merely mentions funding in passing but is not primarily announcing a round, classify as "narrative". Never guess "funding" without an explicit company + round.`;

const EXTRACT_FUNDING_SYSTEM = `You extract structured funding data for a startup intelligence platform. Extract ONLY facts explicitly stated in the source text. If a field is not stated, return null. Never estimate or infer amounts, valuations, or investor names.

Output ONLY a JSON object with exactly this shape:
{
  "company_name": "string",
  "company_website": "string|null",
  "sector": "string|null",
  "round_type": "pre_seed|seed|series_a|series_b|series_c|series_d_plus|growth|debt|null",
  "amount_usd": number|null,
  "valuation_usd": number|null,
  "announced_at": "YYYY-MM-DD",
  "lead_investors": ["string"],
  "other_investors": ["string"],
  "one_liner": "string, max 15 words, factual, no hype adjectives"
}
amount_usd and valuation_usd are plain numbers in US dollars (e.g. 50000000 for $50M). If the announcement date is not stated, use today's date provided by the user.`;

const EXTRACT_ACQUISITION_SYSTEM = `You extract structured acquisition/IPO data for a startup intelligence platform. Extract ONLY facts explicitly stated in the source text. If a field is not stated, return null. Never estimate or infer amounts or valuations.

Output ONLY a JSON object with exactly this shape:
{
  "acquirer_name": "string|null",
  "acquired_name": "string",
  "deal_value_usd": number|null,
  "deal_type": "acquisition|ipo",
  "announced_at": "YYYY-MM-DD",
  "one_liner": "string, max 15 words, factual, no hype adjectives"
}
For an IPO, acquirer_name is null and acquired_name is the company going public. If the announcement date is not stated, use today's date provided by the user.`;

// ── Validators ──
const ROUND_TYPES = new Set([
  "pre_seed", "seed", "series_a", "series_b", "series_c",
  "series_d_plus", "growth", "debt",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function asNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  return null;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim().length > 0) : [];
}

// ── Entity helpers ──
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[,.]?\s*(inc|ltd|llc|pvt|corp|co|limited|corporation|incorporated)\.?\s*$/i, "")
    .trim();
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "entity";
}

// deno-lint-ignore no-explicit-any
async function resolveEntity(supabase: any, name: string, entityType: string, extras: Record<string, unknown> = {}): Promise<string> {
  const original = name.trim().replace(/\s+/g, " ");
  const normalized = normalizeName(original);

  // 2. Exact match on lower(name) for this entity_type
  const { data: exact } = await supabase
    .from("entities")
    .select("id")
    .eq("entity_type", entityType)
    .ilike("name", normalized)
    .limit(1);
  if (exact && exact.length > 0) return exact[0].id;

  // Also try exact on the original (with legal suffix)
  if (normalized !== original) {
    const { data: exactOrig } = await supabase
      .from("entities")
      .select("id")
      .eq("entity_type", entityType)
      .ilike("name", original)
      .limit(1);
    if (exactOrig && exactOrig.length > 0) return exactOrig[0].id;
  }

  // 3. Fuzzy match via pg_trgm RPC (similarity > 0.55)
  const { data: fuzzy, error: fuzzyErr } = await supabase.rpc("match_entity", {
    p_name: normalized,
    p_type: entityType,
  });
  if (!fuzzyErr && Array.isArray(fuzzy) && fuzzy.length > 0 && fuzzy[0].id) {
    return fuzzy[0].id;
  }

  // 4. Insert with slug retry on unique violation
  const baseSlug = slugify(normalized);
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data: inserted, error: insErr } = await supabase
      .from("entities")
      .insert({ name: original, slug, entity_type: entityType, ...extras })
      .select("id")
      .single();
    if (!insErr && inserted) return inserted.id;
    if (insErr && !String(insErr.message).includes("duplicate key")) {
      throw new Error(`entity insert failed: ${insErr.message}`);
    }
  }
  throw new Error(`entity slug exhausted for: ${original}`);
}

// ── Dedup guard: same entity + type + round within ±3 days ──
// deno-lint-ignore no-explicit-any
async function isDuplicateEvent(supabase: any, primaryEntityId: string, eventType: string, roundType: string | null, announcedAt: string): Promise<boolean> {
  const d = new Date(announcedAt + "T00:00:00Z");
  const lo = new Date(d.getTime() - 3 * 86400_000).toISOString().slice(0, 10);
  const hi = new Date(d.getTime() + 3 * 86400_000).toISOString().slice(0, 10);

  let q = supabase
    .from("capital_events")
    .select("id")
    .eq("primary_entity_id", primaryEntityId)
    .eq("event_type", eventType)
    .gte("announced_at", lo)
    .lte("announced_at", hi)
    .limit(1);
  q = roundType === null ? q.is("round_type", null) : q.eq("round_type", roundType);

  const { data } = await q;
  return Boolean(data && data.length > 0);
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS_HEADERS = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !groqApiKey) {
      return new Response(
        JSON.stringify({ error: "Missing SUPABASE_URL, SERVICE_ROLE_KEY, or GROQ_API_KEY" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pendingSignals, error: fetchError } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(MAX_SIGNALS_PER_RUN);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const summary = {
      processed: 0,
      classified_funding: 0,
      classified_acquisition: 0,
      classified_narrative: 0,
      classified_irrelevant: 0,
      events_created: 0,
      duplicates: 0,
      errors: 0,
    };
    let tokensUsed = 0;
    let requestsMade = 0;

    for (const signal of pendingSignals ?? []) {
      try {
        const rawText = `${signal.title ?? ""}\n${sanitizeContent(signal.raw_content ?? "")}`.trim();
        if (rawText.length < 30) {
          // Too thin to classify — leave for generate-content's own rejection path
          summary.classified_narrative++;
          continue;
        }

        // ── CALL 1: classify (cheap model) ──
        const classifyRaw = await callGroq(
          groqApiKey, CLASSIFY_MODELS, CLASSIFY_SYSTEM,
          `Headline and text:\n${rawText}`, 60
        );
        requestsMade++;
        tokensUsed += 400;

        let contentType: string;
        try {
          contentType = String(safeJsonParse(classifyRaw)?.content_type ?? "narrative");
        } catch {
          contentType = "narrative"; // unparseable → safest is leave for narrative pipeline
        }

        summary.processed++;

        if (contentType === "narrative") {
          // Leave untouched for generate-content — do NOT change status
          summary.classified_narrative++;
          continue;
        }

        if (contentType === "irrelevant") {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "classified_irrelevant" })
            .eq("id", signal.id);
          summary.classified_irrelevant++;
          continue;
        }

        if (contentType !== "funding" && contentType !== "acquisition") {
          summary.classified_narrative++;
          continue; // unknown label → treat as narrative, leave alone
        }

        // ── CALL 2: extract (strong model) ──
        const extractSystem = contentType === "funding" ? EXTRACT_FUNDING_SYSTEM : EXTRACT_ACQUISITION_SYSTEM;
        const extractRaw = await callGroq(
          groqApiKey, EXTRACT_MODELS, extractSystem,
          `Today's date: ${today}\nSource text:\n${rawText}`, 500
        );
        requestsMade++;
        tokensUsed += 900;

        let parsed: any;
        try {
          parsed = safeJsonParse(extractRaw);
        } catch {
          await supabase
            .from("raw_signals")
            .update({ status: "rejected", error_message: "extract_invalid_json" })
            .eq("id", signal.id);
          summary.errors++;
          continue;
        }

        if (contentType === "funding") {
          summary.classified_funding++;

          // Validate required fields
          const companyName = typeof parsed.company_name === "string" ? parsed.company_name.trim() : "";
          const announcedAt = typeof parsed.announced_at === "string" && DATE_RE.test(parsed.announced_at)
            ? parsed.announced_at : "";
          if (!companyName || !announcedAt) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "extract_missing_required: company_name/announced_at" })
              .eq("id", signal.id);
            summary.errors++;
            continue;
          }

          const roundType = ROUND_TYPES.has(parsed.round_type) ? parsed.round_type : null;

          const companyId = await resolveEntity(supabase, companyName, "company", {
            website: typeof parsed.company_website === "string" ? parsed.company_website : null,
            sector: typeof parsed.sector === "string" ? parsed.sector : null,
          });

          if (await isDuplicateEvent(supabase, companyId, "funding", roundType, announcedAt)) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "duplicate_event" })
              .eq("id", signal.id);
            summary.duplicates++;
            continue;
          }

          const leadNames = asStringArray(parsed.lead_investors);
          const otherNames = asStringArray(parsed.other_investors);

          const { data: eventRow, error: evErr } = await supabase
            .from("capital_events")
            .insert({
              event_type: "funding",
              primary_entity_id: companyId,
              round_type: roundType,
              amount_usd: asNumberOrNull(parsed.amount_usd),
              valuation_usd: asNumberOrNull(parsed.valuation_usd),
              announced_at: announcedAt,
              one_liner: typeof parsed.one_liner === "string" && parsed.one_liner.trim()
                ? parsed.one_liner.trim()
                : `${companyName} raised a funding round.`,
              source_url: signal.source_url ?? null,
            })
            .select("id")
            .single();
          if (evErr || !eventRow) throw new Error(`capital_events insert: ${evErr?.message}`);

          // Investors — resolve and link, lead flag preserved
          const investorRows: Array<{ capital_event_id: string; investor_entity_id: string; is_lead: boolean }> = [];
          for (const nm of leadNames) {
            const invId = await resolveEntity(supabase, nm, "investor");
            investorRows.push({ capital_event_id: eventRow.id, investor_entity_id: invId, is_lead: true });
          }
          for (const nm of otherNames) {
            const invId = await resolveEntity(supabase, nm, "investor");
            if (!investorRows.some((r) => r.investor_entity_id === invId)) {
              investorRows.push({ capital_event_id: eventRow.id, investor_entity_id: invId, is_lead: false });
            }
          }
          if (investorRows.length > 0) {
            await supabase.from("capital_event_investors").upsert(investorRows, { onConflict: "capital_event_id,investor_entity_id" });
          }

          summary.events_created++;
        } else {
          summary.classified_acquisition++;

          const acquiredName = typeof parsed.acquired_name === "string" ? parsed.acquired_name.trim() : "";
          const announcedAt = typeof parsed.announced_at === "string" && DATE_RE.test(parsed.announced_at)
            ? parsed.announced_at : "";
          const dealType = parsed.deal_type === "ipo" ? "ipo" : "acquisition";
          if (!acquiredName || !announcedAt) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "extract_missing_required: acquired_name/announced_at" })
              .eq("id", signal.id);
            summary.errors++;
            continue;
          }

          const acquiredId = await resolveEntity(supabase, acquiredName, "company");
          const acquirerId = typeof parsed.acquirer_name === "string" && parsed.acquirer_name.trim()
            ? await resolveEntity(supabase, parsed.acquirer_name.trim(), "company")
            : null;

          if (await isDuplicateEvent(supabase, acquiredId, dealType, dealType, announcedAt)) {
            await supabase
              .from("raw_signals")
              .update({ status: "rejected", error_message: "duplicate_event" })
              .eq("id", signal.id);
            summary.duplicates++;
            continue;
          }

          const { error: evErr } = await supabase.from("capital_events").insert({
            event_type: dealType,
            primary_entity_id: acquiredId,
            counterparty_entity_id: acquirerId,
            round_type: dealType, // 'acquisition' | 'ipo' are valid round_type values
            amount_usd: asNumberOrNull(parsed.deal_value_usd),
            announced_at: announcedAt,
            one_liner: typeof parsed.one_liner === "string" && parsed.one_liner.trim()
              ? parsed.one_liner.trim()
              : `${acquiredName} ${dealType === "ipo" ? "went public" : "was acquired"}.`,
            source_url: signal.source_url ?? null,
          });
          if (evErr) throw new Error(`capital_events insert: ${evErr.message}`);

          summary.events_created++;
        }

        // Mark signal consumed
        await supabase
          .from("raw_signals")
          .update({ status: "published", processed_at: new Date().toISOString() })
          .eq("id", signal.id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`extract-structured signal ${signal.id} failed:`, msg);
        await supabase
          .from("raw_signals")
          .update({ error_message: `extract: ${msg}`.slice(0, 500) })
          .eq("id", signal.id);
        summary.errors++;
        // continue with the rest — never let one bad signal kill the batch
      }
    }

    // pipeline_stats accounting (same RPC as generate-content)
    if (requestsMade > 0) {
      await supabase.rpc("increment_pipeline_stats_safe", {
        p_date: today,
        p_tokens: tokensUsed,
        p_articles: 0,
        p_requests: requestsMade,
      });
    }

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("extract-structured fatal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "extraction failure" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
