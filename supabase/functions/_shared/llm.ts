// ============================================================
// Unified LLM abstraction — Groq + Cerebras, task-class routed.
//
// Every LLM call in ScopeDrop's edge functions goes through callLLM().
// The abstraction owns: model selection per task class, provider
// fallback on 429/5xx, in-memory rate-limit cooldown per provider,
// pre-flight context estimation (Cerebras has an 8k cap), and
// provider-tagged telemetry via increment_llm_stat on the llm_stats
// table.
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
    LLAMA_70B: "llama-3.3-70b-versatile",
    LLAMA_8B: "llama-3.1-8b-instant",
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
const ROUTING: Record<TaskClass, ProviderModel[]> = {
  CLASSIFY: [
    // Gemma 31B is Cerebras's mid-size option — fine for enum classification
    // and cheaper than the 120B. Groq llama-8b remains a known-good fallback.
    { provider: "cerebras", model: MODELS.cerebras.GEMMA_31B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.LLAMA_8B, supportsJsonMode: true },
    { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: true },
  ],
  EXTRACT_JSON: [
    // GPT-OSS-120B is the largest Cerebras option — reasonable pick for
    // structured JSON extraction. Groq 70b as strong fallback.
    { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.LLAMA_70B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.LLAMA_8B, supportsJsonMode: true },
  ],
  EXTRACT_JSON_LONG: [
    // Cerebras skipped — 8k context can't hold long-form sources.
    { provider: "groq", model: MODELS.groq.LLAMA_70B, supportsJsonMode: true },
    { provider: "groq", model: MODELS.groq.LLAMA_8B, supportsJsonMode: true },
  ],
  SHORT_GENERATIVE: [
    // Gemma is cheapest for short bullet/paragraph output; escalate to GPT-OSS
    // if it wobbles, Groq 70b as safety net.
    { provider: "cerebras", model: MODELS.cerebras.GEMMA_31B, supportsJsonMode: false },
    { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: false },
    { provider: "groq", model: MODELS.groq.LLAMA_70B, supportsJsonMode: false },
  ],
  LONG_ANALYTICAL: [
    // Llama-70b on Groq stays primary — proven on the article pipeline.
    // GPT-OSS-120B and GLM-4.7 on Cerebras are unvetted for long-form
    // creative writing; keeping them as fallbacks only until an A/B.
    { provider: "groq", model: MODELS.groq.LLAMA_70B, supportsJsonMode: false },
    { provider: "cerebras", model: MODELS.cerebras.GPT_OSS_120B, supportsJsonMode: false },
    { provider: "cerebras", model: MODELS.cerebras.GLM_47, supportsJsonMode: false },
  ],
};

const CEREBRAS_CONTEXT_CUTOFF_TOKENS = 7_500;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

// ------------------------------------------------------------
// Token estimation and rate-limit tracking
// ------------------------------------------------------------

/** Character-count heuristic. No tokenizer dependency. Overestimates on Latin scripts. */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

// Per-instance rate-limit tracker. Resets on cold start — exactly the
// intended lifetime for a "back off for 60s after we saw a 429".
const rateLimitCooldowns: Map<ProviderName, number> = new Map();

function markRateLimited(provider: ProviderName) {
  rateLimitCooldowns.set(provider, Date.now() + RATE_LIMIT_COOLDOWN_MS);
}

function isProviderCoolingDown(provider: ProviderName): boolean {
  const cooldownUntil = rateLimitCooldowns.get(provider);
  if (!cooldownUntil) return false;
  if (Date.now() >= cooldownUntil) {
    rateLimitCooldowns.delete(provider);
    return false;
  }
  return true;
}

// ------------------------------------------------------------
// Core callLLM
// ------------------------------------------------------------
export interface CallLLMOptions {
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface CallLLMResult {
  content: string;
  provider: ProviderName;
  model: string;
  tokensIn: number;
  tokensOut: number;
  attempts: number;
}

export class LLMError extends Error {
  constructor(message: string, public readonly lastAttempt?: unknown) {
    super(message);
    this.name = "LLMError";
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

    if (isProviderCoolingDown(entry.provider)) {
      errors.push(`${entry.provider}:cooldown`);
      continue;
    }

    const apiKey = Deno.env.get(PROVIDERS[entry.provider].apiKeyEnv);
    if (!apiKey) {
      errors.push(`${entry.provider}:no_api_key`);
      continue;
    }

    try {
      const result = await callProviderEndpoint(entry, system, user, opts, apiKey);
      await recordStat(entry.provider, taskClass, true, result.tokensIn, result.tokensOut);
      return { ...result, attempts: attempt };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${entry.provider}/${entry.model}:${msg}`);
      if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
        markRateLimited(entry.provider);
      }
      await recordStat(entry.provider, taskClass, false, 0, 0, msg.slice(0, 300));
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
  if (opts.jsonMode && entry.supportsJsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(PROVIDERS[entry.provider].baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${res.status} ${errBody.slice(0, 200)}`);
  }

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
    tokensOut: data?.usage?.completion_tokens ?? 0,
  };
}

// ------------------------------------------------------------
// Telemetry — writes to llm_stats via increment_llm_stat RPC.
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "",
    );
    await supabase.rpc("increment_llm_stat", {
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
