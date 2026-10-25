// ============================================================
// Unified LLM abstraction — Groq + Cerebras, task-class routed.
//
// Every LLM call in ScopeDrop's edge functions goes through callLLM().
// The abstraction owns: model selection per task class, provider
// fallback on 429/5xx, a per-model token budget with call priorities and
// shared 429 cooldowns (see "Budget allocator"), request timeouts,
// pre-flight context estimation (Cerebras has an 8k cap), and telemetry
// to llm_stats (per provider) and llm_usage (per model).
//
// See ROUTING below for the primary → fallback → emergency chain per
// task class. Adding a task class is a two-line change: add to TASK
// and add its chain to ROUTING. Adding a provider means an entry in
// PROVIDERS + MODELS + updating the ROUTING chains that should use it.
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ------------------------------------------------------------
// Providers + models
// ------------------------------------------------------------
export type ProviderName = "groq" | "cerebras";

export type TaskClass =
  | "CLASSIFY"            // Class A — short enum output, 8b is enough
  | "EXTRACT_JSON"        // Class B — structured JSON, source <6k tokens
  | "EXTRACT_JSON_LONG"   // Class B' — structured JSON, source ≥6k tokens (Cerebras skipped)
  | "SHORT_GENERATIVE"    // Class C — Highlights, tooltips, summaries
  | "LONG_ANALYTICAL";    // Class D — Scope, full articles

export const TASK: Record<TaskClass, TaskClass> = {
  CLASSIFY: "CLASSIFY",
  EXTRACT_JSON: "EXTRACT_JSON",
  EXTRACT_JSON_LONG: "EXTRACT_JSON_LONG",
  SHORT_GENERATIVE: "SHORT_GENERATIVE",
  LONG_ANALYTICAL: "LONG_ANALYTICAL",
} as const;

interface ProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKeyEnv: string;
  maxContextTokens: number;
}

export const PROVIDERS: Record<ProviderName, ProviderConfig> = {
  groq: {
    name: "groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    apiKeyEnv: "GROQ_API_KEY",
    maxContextTokens: 128_000,
  },
  cerebras: {
    name: "cerebras",
    baseUrl: "https://api.cerebras.ai/v1/chat/completions",
    apiKeyEnv: "CEREBRAS_API_KEY",
    maxContextTokens: 8_192,
  },
};

// Model IDs live here so a provider deprecation is a single-file swap.
export const MODELS = {
  groq: {
    // Groq shut down llama-3.3-70b-versatile and llama-3.1-8b-instant on
    // 2026-08-16 (console.groq.com/docs/deprecations); every call 404'd
    // with model_not_found from 2026-08-17. These are Groq's named
    // replacements. Both are reasoning models — see REASONING_MODELS.
    GPT_OSS_120B: "openai/gpt-oss-120b",
    GPT_OSS_20B: "openai/gpt-oss-20b",
  },
  cerebras: {
    // What our Cerebras account actually exposes (verified via
    // GET /v1/models on 2026-07-29). The plan's assumed Llama and Qwen
    // IDs returned 404 — those models aren't provisioned on this tier.
    // If we upgrade the plan, add the Llama IDs here and update
    // ROUTING to prefer them.
    GPT_OSS_120B: "gpt-oss-120b",  // largest capacity — extraction, long-form
    GEMMA_31B: "gemma-4-31b",       // mid-size — classification, short output
    GLM_47: "zai-glm-4.7",          // alternative — analytical fallback
  },
} as const;

interface ProviderModel {
  provider: ProviderName;
  model: string;
  supportsJsonMode: boolean;
}

// Primary → fallback → emergency chain per task class.
//
// Ordering rationale:
// - CLASSIFY prefers Cerebras 8b (cheapest fast option) then Groq 8b
//   then Cerebras 70b as an emergency (still cheaper than Groq 70b).
// - EXTRACT_JSON prefers Cerebras 70b for speed; Groq 70b as fallback
//   with a bigger context. EXTRACT_JSON_LONG skips Cerebras entirely
//   because sources exceed its 8k context.
// - SHORT_GENERATIVE prefers Cerebras (faster) since Highlights /
//   summaries don't need JSON mode.
// - LONG_ANALYTICAL keeps Llama 70b primary (proven for the narrative
//   article pipeline); Qwen-3 32B and Cerebras 70b are fallbacks
//   pending a proper A/B evaluation.
// Cerebras is currently DROPPED from all routing chains because every model
// on the free tier returns 402 Payment required at the inference endpoint
// (verified 2026-07-29 — GET /v1/models lists gpt-oss-120b / gemma-4-31b /
// zai-glm-4.7 but calling any of them 402s). Every call was paying a
// ~200-500ms Cerebras round-trip for no benefit; Groq handled 100% of
// traffic via the fallback path anyway.
//
// The MODELS.cerebras and PROVIDERS.cerebras scaffolding stays. To
// re-enable, either upgrade the Cerebras plan or paste any of the
// prior entries back into a chain — the shape is preserved below in
// comments as a recipe:
//   { provider: "cerebras", model: MODELS.cerebras.GEMMA_31B, supportsJsonMode: true },        // was CLASSIFY primary
//   { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: true },     // was EXTRACT_JSON primary + CLASSIFY emergency
//   { provider: "cerebras", model: MODELS.cerebras.GEMMA_31B, supportsJsonMode: false },       // was SHORT_GENERATIVE primary
//   { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: false },    // was SHORT_GENERATIVE fallback + LONG_ANALYTICAL fallback
//   { provider: "cerebras", model: MODELS.cerebras.GLM_47, supportsJsonMode: false },          // was LONG_ANALYTICAL emergency
const ROUTING: Record<TaskClass, ProviderModel[]> = {
  CLASSIFY: [
    { provider: "groq", model: MODELS.groq.GPT_OSS_20B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.GPT_OSS_120B, supportsJsonMode: true },
  ],
  EXTRACT_JSON: [
    { provider: "groq", model: MODELS.groq.GPT_OSS_120B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.GPT_OSS_20B, supportsJsonMode: true },
  ],
  EXTRACT_JSON_LONG: [
    { provider: "groq", model: MODELS.groq.GPT_OSS_120B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.GPT_OSS_20B, supportsJsonMode: true },
  ],
  SHORT_GENERATIVE: [
    { provider: "groq", model: MODELS.groq.GPT_OSS_20B, supportsJsonMode: false },
    { provider: "groq", model: MODELS.groq.GPT_OSS_120B, supportsJsonMode: false },
  ],
  LONG_ANALYTICAL: [
    { provider: "groq", model: MODELS.groq.GPT_OSS_120B, supportsJsonMode: false },
    { provider: "groq", model: MODELS.groq.GPT_OSS_20B, supportsJsonMode: false },
  ],
};

const CEREBRAS_CONTEXT_CUTOFF_TOKENS = 7_500;

// gpt-oss spends completion tokens on hidden reasoning before it writes
// `content`. Keep effort low (callers want fast, short outputs) and add
// headroom on top of the caller's maxTokens so reasoning can't starve
// the visible answer.
const REASONING_MODELS = new Set<string>([MODELS.groq.GPT_OSS_120B, MODELS.groq.GPT_OSS_20B]);
const REASONING_TOKEN_HEADROOM = 1024;
// Used when a 429 doesn't say when to retry.
const RATE_LIMIT_COOLDOWN_MS = 60_000;

// A hung provider used to hold an edge function until its wall clock ran out.
const REQUEST_TIMEOUT_MS: Record<TaskClass, number> = {
  CLASSIFY: 30_000,
  EXTRACT_JSON: 60_000,
  EXTRACT_JSON_LONG: 90_000,
  SHORT_GENERATIVE: 45_000,
  LONG_ANALYTICAL: 90_000,
};

// ------------------------------------------------------------
// Budget allocator
//
// Groq's free tier limits each model separately and org-wide: 30 RPM,
// 1K RPD, 8K TPM, 200K TPD; cached prompt tokens don't count. Every
// caller shares those buckets, so on 2026-10-24/25 a low-value backfill
// used up both gpt-oss models and live articles stopped being written.
//
// Each call carries a priority. A model's billable tokens over the last
// ~24h (llm_budget(), from llm_usage) must stay under
// DAILY_TOKEN_LIMIT × PRIORITY_CEILING[priority], so as a bucket fills,
// backfills stop first, then generators, images, the router, and
// extraction; articles may use all of it. A 429 sets a cooldown for
// exactly as long as Groq says ("try again in 7m12s" / retry-after),
// stored in llm_model_state so every edge function respects it.
//
// Fails open: if the budget tables aren't there yet (migration
// 20261025160000 not applied) or the read fails, calls go ahead as
// before, still guarded by the in-memory cooldown.
// ------------------------------------------------------------
export type Priority = "article" | "extraction" | "router" | "images" | "generator" | "backfill";

export const PRIORITY_CEILING: Record<Priority, number> = {
  article: 1.0,
  extraction: 0.95,
  router: 0.85,
  images: 0.7,
  generator: 0.6,
  backfill: 0.45,
};

const DEFAULT_PRIORITY: Record<TaskClass, Priority> = {
  CLASSIFY: "router",
  EXTRACT_JSON: "extraction",
  EXTRACT_JSON_LONG: "extraction",
  SHORT_GENERATIVE: "generator",
  LONG_ANALYTICAL: "article",
};

// Groq free tier, per model, org-wide (console.groq.com/docs/rate-limits,
// checked 2026-10-25). A model missing here has no token budget check.
export const DAILY_TOKEN_LIMIT: Record<string, number> = {
  [MODELS.groq.GPT_OSS_120B]: 200_000,
  [MODELS.groq.GPT_OSS_20B]: 200_000,
};

const BUDGET_CACHE_MS = 30_000;
const HEADER_WRITE_INTERVAL_MS = 60_000;

/** Character-count heuristic. No tokenizer dependency. Overestimates on Latin scripts. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

let client: ReturnType<typeof createClient> | null = null;
function db() {
  client ??= createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}

function modelKey(entry: ProviderModel): string {
  return `${entry.provider}/${entry.model}`;
}

interface ModelBudget {
  used: number;          // billable tokens, last ~24h, all callers
  cooldownUntil: number; // epoch ms; 0 = none
  fetchedAt: number;
}
const budgets = new Map<string, ModelBudget>();
// Per-instance cooldowns, merged with the shared ones from llm_model_state.
const localCooldowns = new Map<string, number>();
const headersWrittenAt = new Map<string, number>();

async function getBudget(entry: ProviderModel): Promise<ModelBudget> {
  const key = modelKey(entry);
  const cached = budgets.get(key);
  if (cached && Date.now() - cached.fetchedAt < BUDGET_CACHE_MS) return cached;
  let fresh: ModelBudget = { used: 0, cooldownUntil: 0, fetchedAt: Date.now() };
  try {
    const { data, error } = await db().rpc("llm_budget", { p_provider: entry.provider, p_model: entry.model });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    fresh = {
      used: Number(row?.used_24h ?? 0),
      cooldownUntil: row?.cooldown_until ? Date.parse(row.cooldown_until) : 0,
      fetchedAt: Date.now(),
    };
  } catch (err) {
    console.warn(`llm budget read failed for ${key} (allowing call):`, err instanceof Error ? err.message : err);
  }
  budgets.set(key, fresh);
  return fresh;
}

export type BudgetVerdict = "ok" | "cooldown" | "budget";

/** Pure decision, exported for tests. */
export function budgetVerdict(
  model: string,
  priority: Priority,
  usedTokens: number,
  estimatedTokens: number,
  cooldownUntil: number,
  now: number,
): BudgetVerdict {
  if (cooldownUntil > now) return "cooldown";
  const limit = DAILY_TOKEN_LIMIT[model];
  if (!limit) return "ok";
  return usedTokens + estimatedTokens > limit * PRIORITY_CEILING[priority] ? "budget" : "ok";
}

async function checkBudget(entry: ProviderModel, priority: Priority, estimatedTokens: number): Promise<BudgetVerdict> {
  const b = await getBudget(entry);
  const cooldownUntil = Math.max(b.cooldownUntil, localCooldowns.get(modelKey(entry)) ?? 0);
  return budgetVerdict(entry.model, priority, b.used, estimatedTokens, cooldownUntil, Date.now());
}

/**
 * Whether a call of this task class at this priority would currently be
 * allowed on any model in its chain. Lets a caller skip a whole batch,
 * leaving its work queued, instead of failing item by item.
 */
export async function hasBudget(taskClass: TaskClass, priority: Priority = DEFAULT_PRIORITY[taskClass], estimatedTokens = 1500): Promise<boolean> {
  for (const entry of ROUTING[taskClass] ?? []) {
    if ((await checkBudget(entry, priority, estimatedTokens)) === "ok") return true;
  }
  return false;
}

/** "7m12.5s", "1h2m", "45.2s", "250ms" (Groq's format) → milliseconds. */
export function parseGroqDuration(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^\s*(?:(\d+(?:\.\d+)?)h)?(?:(\d+(?:\.\d+)?)m(?!s))?(?:(\d+(?:\.\d+)?)s)?(?:(\d+(?:\.\d+)?)ms)?\s*$/.exec(s);
  if (!m || m.slice(1).every((x) => x === undefined)) return null;
  const [h, min, sec, ms] = m.slice(1).map((x) => Number(x ?? 0));
  return Math.round(((h * 60 + min) * 60 + sec) * 1000 + ms);
}

/** How long a 429 asks us to wait, from retry-after or "try again in …". */
export function retryAfterMs(body: string, retryAfterHeader: string | null): number | null {
  const fromHeader = retryAfterHeader && /^\d+(\.\d+)?$/.test(retryAfterHeader.trim())
    ? Math.round(Number(retryAfterHeader) * 1000)
    : null;
  const inBody = /try again in\s+([\d.hms]+)/i.exec(body);
  const fromBody = inBody ? parseGroqDuration(inBody[1].replace(/\.$/, "")) : null;
  if (fromHeader === null && fromBody === null) return null;
  return Math.max(fromHeader ?? 0, fromBody ?? 0);
}

function limitKind(body: string): string {
  if (/tokens per day|\(TPD\)/i.test(body)) return "TPD";
  if (/requests per day|\(RPD\)/i.test(body)) return "RPD";
  if (/tokens per minute|\(TPM\)/i.test(body)) return "TPM";
  if (/requests per minute|\(RPM\)/i.test(body)) return "RPM";
  return "429";
}

async function setCooldown(entry: ProviderModel, ms: number, reason: string) {
  const until = Date.now() + ms;
  const key = modelKey(entry);
  localCooldowns.set(key, Math.max(until, localCooldowns.get(key) ?? 0));
  budgets.delete(key);
  try {
    await db().from("llm_model_state").upsert({
      provider: entry.provider,
      model: entry.model,
      cooldown_until: new Date(until).toISOString(),
      cooldown_reason: reason,
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,model" });
  } catch (err) {
    console.warn("llm cooldown write failed:", err instanceof Error ? err.message : err);
  }
}

// x-ratelimit-*-requests are per day (RPD); x-ratelimit-*-tokens are per
// minute (TPM). Groq sends no TPD header, which is why llm_usage exists.
async function recordHeaders(entry: ProviderModel, headers: Headers) {
  const rpdRemaining = Number(headers.get("x-ratelimit-remaining-requests"));
  if (headers.get("x-ratelimit-remaining-requests") !== null && rpdRemaining <= 0) {
    await setCooldown(entry, parseGroqDuration(headers.get("x-ratelimit-reset-requests")) ?? RATE_LIMIT_COOLDOWN_MS, "RPD (header)");
  }
  const key = modelKey(entry);
  if (Date.now() - (headersWrittenAt.get(key) ?? 0) < HEADER_WRITE_INTERVAL_MS) return;
  headersWrittenAt.set(key, Date.now());
  const num = (h: string) => (headers.get(h) === null ? null : Number(headers.get(h)));
  try {
    await db().from("llm_model_state").upsert({
      provider: entry.provider,
      model: entry.model,
      rpd_limit: num("x-ratelimit-limit-requests"),
      rpd_remaining: num("x-ratelimit-remaining-requests"),
      tpm_limit: num("x-ratelimit-limit-tokens"),
      tpm_remaining: num("x-ratelimit-remaining-tokens"),
      headers_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,model" });
  } catch (err) {
    console.warn("llm header write failed:", err instanceof Error ? err.message : err);
  }
}

// ------------------------------------------------------------
// Core callLLM
// ------------------------------------------------------------
export interface CallLLMOptions {
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  /** Defaults by task class: LONG_ANALYTICAL article, EXTRACT_* extraction, CLASSIFY router, SHORT_GENERATIVE generator. */
  priority?: Priority;
}

export interface CallLLMResult {
  content: string;
  provider: ProviderName;
  model: string;
  tokensIn: number;
  tokensCached: number;
  tokensOut: number;
  attempts: number;
}

export class LLMError extends Error {
  constructor(message: string, public readonly lastAttempt?: unknown) {
    super(message);
    this.name = "LLMError";
  }
}

class ProviderError extends Error {
  constructor(public readonly status: number, body: string, public readonly retryMs: number | null) {
    // "<status> <body>": callers match ":429" in LLMError messages.
    super(`${status} ${body.slice(0, 200)}`);
  }
}

export async function callLLM(
  taskClass: TaskClass,
  system: string,
  user: string,
  opts: CallLLMOptions = {},
): Promise<CallLLMResult> {
  const chain = ROUTING[taskClass];
  if (!chain?.length) throw new LLMError(`No routing chain for task class ${taskClass}`);
  const priority = opts.priority ?? DEFAULT_PRIORITY[taskClass];

  const estInput = estimateTokens(system) + estimateTokens(user);
  const estMaxOut = opts.maxTokens ?? 1024;

  const errors: string[] = [];
  let attempt = 0;

  for (const entry of chain) {
    attempt += 1;

    // Pre-flight cutoff for Cerebras — 8k context is easy to blow past
    // with a long article + a large max_tokens ask.
    if (
      entry.provider === "cerebras" &&
      estInput + estMaxOut > CEREBRAS_CONTEXT_CUTOFF_TOKENS
    ) {
      errors.push(
        `${entry.provider}:skipped (context estimate ${estInput + estMaxOut} > cutoff)`,
      );
      continue;
    }

    const verdict = await checkBudget(entry, priority, estInput + estMaxOut);
    if (verdict !== "ok") {
      errors.push(`${modelKey(entry)}:${verdict}`);
      await recordUsage(entry, taskClass, priority, "skipped", 0, 0, 0);
      continue;
    }

    const apiKey = Deno.env.get(PROVIDERS[entry.provider].apiKeyEnv);
    if (!apiKey) {
      errors.push(`${entry.provider}:no_api_key`);
      continue;
    }

    try {
      const result = await callProviderEndpoint(entry, system, user, opts, apiKey, REQUEST_TIMEOUT_MS[taskClass]);
      const billable = result.tokensIn - Math.min(result.tokensCached, result.tokensIn) + result.tokensOut;
      const b = budgets.get(modelKey(entry));
      if (b) b.used += billable; // keep the cached figure honest between reads
      await recordStat(entry.provider, taskClass, true, result.tokensIn, result.tokensOut);
      await recordUsage(entry, taskClass, priority, "ok", result.tokensIn, result.tokensCached, result.tokensOut);
      return { ...result, attempts: attempt };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${modelKey(entry)}:${msg}`);
      if (err instanceof ProviderError && err.status === 429) {
        await setCooldown(entry, err.retryMs ?? RATE_LIMIT_COOLDOWN_MS, limitKind(msg));
      }
      await recordStat(entry.provider, taskClass, false, 0, 0, msg.slice(0, 300));
      await recordUsage(entry, taskClass, priority, "error", 0, 0, 0, msg.slice(0, 300));
      // fall through to next chain entry
    }
  }

  throw new LLMError(
    `All providers exhausted for ${taskClass}. Errors: ${errors.join(" | ")}`,
    errors,
  );
}

async function callProviderEndpoint(
  entry: ProviderModel,
  system: string,
  user: string,
  opts: CallLLMOptions,
  apiKey: string,
  timeoutMs: number,
): Promise<Omit<CallLLMResult, "attempts">> {
  const body: Record<string, unknown> = {
    model: entry.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (REASONING_MODELS.has(entry.model)) {
    body.reasoning_effort = "low";
    body.max_tokens = (opts.maxTokens ?? 1024) + REASONING_TOKEN_HEADROOM;
  }
  if (opts.jsonMode && entry.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(PROVIDERS[entry.provider].baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (ctrl.signal.aborted) throw new Error(`timeout after ${timeoutMs}ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errBody = await res.text();
    throw new ProviderError(res.status, errBody, res.status === 429 ? retryAfterMs(errBody, res.headers.get("retry-after")) : null);
  }
  await recordHeaders(entry, res.headers);

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`malformed response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return {
    content,
    provider: entry.provider,
    model: entry.model,
    tokensIn: data?.usage?.prompt_tokens ?? 0,
    tokensCached: data?.usage?.prompt_tokens_details?.cached_tokens ?? 0,
    tokensOut: data?.usage?.completion_tokens ?? 0,
  };
}

// ------------------------------------------------------------
// Telemetry: llm_stats (per provider + task class, kept for continuity)
// and llm_usage (per model + priority, read by the allocator).
// Telemetry failures NEVER block LLM calls: if Supabase is down or the
// RPC isn't deployed yet, we log a warning and return normally.
// ------------------------------------------------------------
async function recordStat(
  provider: ProviderName,
  taskClass: TaskClass,
  success: boolean,
  tokensIn: number,
  tokensOut: number,
  errorSample?: string,
) {
  try {
    await db().rpc("increment_llm_stat", {
      p_date: new Date().toISOString().slice(0, 10),
      p_provider: provider,
      p_task_class: taskClass,
      p_success: success,
      p_tokens_in: tokensIn,
      p_tokens_out: tokensOut,
      p_error: errorSample ?? null,
    });
  } catch (err) {
    console.warn("recordStat failed:", err instanceof Error ? err.message : err);
  }
}

async function recordUsage(
  entry: ProviderModel,
  taskClass: TaskClass,
  priority: Priority,
  outcome: "ok" | "error" | "skipped",
  tokensIn: number,
  tokensCached: number,
  tokensOut: number,
  errorSample?: string,
) {
  try {
    const { error } = await db().rpc("increment_llm_usage", {
      p_date: new Date().toISOString().slice(0, 10),
      p_provider: entry.provider,
      p_model: entry.model,
      p_task_class: taskClass,
      p_priority: priority,
      p_outcome: outcome,
      p_tokens_in: tokensIn,
      p_tokens_cached: tokensCached,
      p_tokens_out: tokensOut,
      p_error: errorSample ?? null,
    });
    if (error) throw error;
  } catch (err) {
    console.warn("recordUsage failed:", err instanceof Error ? err.message : err);
  }
}
