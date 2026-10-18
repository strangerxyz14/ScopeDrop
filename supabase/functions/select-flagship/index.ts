// ─────────────────────────────────────────────────────────────
// select-flagship — picks today's homepage flagship at 06:00 IST.
//
// The home hero (DailyFlagship) shows the article with is_flagship=true
// published since the start of the IST day. Nothing set that flag, so
// the hero sat on its "publishes at 06:00 IST" placeholder. This job:
//   1. returns early if today (IST) already has a flagship;
//   2. takes the last 24h of published articles (widening to 72h when
//      fewer than 3), dropping off-topic ones and repeated headlines;
//   3. asks the LLM (TASK.EXTRACT_JSON) for the most consequential story
//      for founders/VCs, falling back to a deterministic score;
//   4. sets is_flagship=true and published_at=now() on the pick, so it
//      lands inside today's IST window the hero queries.
//
// Cron: 00:30 UTC daily (migration 20261018130000_select_flagship_cron).
// Deploy with verify_jwt ON — the cron sends the Vault service-role JWT,
// and the role check below relies on the gateway having verified it.
// POST {"dry_run": true} returns the pick without writing.
// ─────────────────────────────────────────────────────────────
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callLLM, TASK } from "../_shared/llm.ts";
import { offTopicReason } from "../_shared/relevance.ts";

const IST_OFFSET_MS = 330 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_CANDIDATES = 40;
const MIN_CANDIDATES = 3;

interface Candidate {
  id: string;
  headline: string;
  summary: string | null;
  category: string | null;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
}

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function startOfIstDay(now: Date): Date {
  const istMidnight = Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS;
  return new Date(istMidnight - IST_OFFSET_MS);
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

const CATEGORY_WEIGHT: Record<string, number> = {
  funding: 3, acquisitions: 3, ai: 3, startups: 2, markets: 2, policy: 2,
};
// Listicles, how-tos and tip pieces don't lead an edition.
const EVERGREEN_RE = /^\s*(?:the\s+)?\d+\s|\bhow to\b|\bguide\b|\btips\b|\bin \d+ (?:moves|steps|ways)\b|\bbest\b/i;

function deterministicScore(c: Candidate): number {
  let score = CATEGORY_WEIGHT[(c.category ?? "").toLowerCase()] ?? 1;
  if (c.image_url) score += 1;
  if ((c.summary ?? "").length > 150) score += 0.5;
  if (/\$\s?\d|₹\s?\d|\b\d+(?:\.\d+)?\s?(?:m|bn|b|million|billion|crore)\b/i.test(c.headline)) score += 1;
  if (EVERGREEN_RE.test(c.headline)) score -= 3;
  return score;
}

const PICK_SYSTEM = `You are the editor-in-chief of ScopeDrop, a daily briefing for startup founders and investors. From the numbered candidate stories, pick the ONE that should lead today's edition as the flagship: the story with the biggest consequence for founders, operators or VCs — large funding rounds, major acquisitions or IPOs, AI-industry shifts, platform or policy changes that affect how startups build, sell or raise.
Prefer concrete news with named companies and numbers over listicles, how-to guides, product tips or opinion pieces. Never pick consumer gadget, gaming, sports, lifestyle or medical-research stories.
Output ONLY a JSON object: {"index": <candidate number>, "reason": "<one sentence>"}.`;

async function pickWithLLM(candidates: Candidate[]): Promise<{ index: number; reason: string } | null> {
  const list = candidates
    .map((c, i) => `[${i + 1}] ${c.headline} (${c.category ?? "uncategorised"}) — ${(c.summary ?? "").slice(0, 280)}`)
    .join("\n");
  try {
    const res = await callLLM(TASK.EXTRACT_JSON, PICK_SYSTEM, `Candidates:\n${list}`, {
      jsonMode: true, maxTokens: 150, temperature: 0,
    });
    const parsed = JSON.parse(res.content.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const index = Number(parsed?.index);
    if (!Number.isInteger(index) || index < 1 || index > candidates.length) return null;
    return { index: index - 1, reason: String(parsed?.reason ?? "").slice(0, 300) };
  } catch (e) {
    console.warn("select-flagship LLM pick failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

serve(async (req) => {
  try {
    if (!hasServiceRole(req)) return jsonResp({ error: "service role required" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }, 500);

    let dryRun = false;
    try {
      dryRun = (await req.json())?.dry_run === true;
    } catch { /* empty body from cron */ }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();
    const startOfToday = startOfIstDay(now);

    const { data: existing, error: existingErr } = await supabase
      .from("articles")
      .select("id, headline")
      .eq("is_flagship", true)
      .eq("status", "published")
      .gte("published_at", startOfToday.toISOString())
      .limit(1);
    if (existingErr) throw existingErr;
    if (existing && existing.length > 0) {
      return jsonResp({ skipped: "flagship_already_set", article: existing[0] });
    }

    let candidates: Candidate[] = [];
    let windowHours = 0;
    for (const hours of [24, 72]) {
      windowHours = hours;
      const { data, error } = await supabase
        .from("articles")
        .select("id, headline, summary, category, tags, image_url, created_at")
        .eq("status", "published")
        .eq("is_flagship", false)
        .gte("created_at", new Date(now.getTime() - hours * HOUR_MS).toISOString())
        .order("created_at", { ascending: false })
        .limit(MAX_CANDIDATES * 2);
      if (error) throw error;

      const seen = new Set<string>();
      candidates = ((data ?? []) as Candidate[]).filter((c) => {
        const key = c.headline.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return !offTopicReason(c.headline, `${c.summary ?? ""} ${(c.tags ?? []).join(", ")}`);
      }).slice(0, MAX_CANDIDATES);
      if (candidates.length >= MIN_CANDIDATES) break;
    }

    if (candidates.length === 0) {
      return jsonResp({ skipped: "no_candidates", window_hours: windowHours });
    }

    let pick: Candidate;
    let method: "llm" | "score" | "single";
    let reason = "";
    if (candidates.length === 1) {
      pick = candidates[0];
      method = "single";
    } else {
      const llmPick = await pickWithLLM(candidates);
      if (llmPick) {
        pick = candidates[llmPick.index];
        method = "llm";
        reason = llmPick.reason;
      } else {
        pick = [...candidates].sort((a, b) => deterministicScore(b) - deterministicScore(a))[0];
        method = "score";
      }
    }

    if (!dryRun) {
      const { error: updErr } = await supabase
        .from("articles")
        .update({ is_flagship: true, published_at: now.toISOString() })
        .eq("id", pick.id);
      if (updErr) throw updErr;
    }

    return jsonResp({
      dry_run: dryRun,
      picked: { id: pick.id, headline: pick.headline, category: pick.category },
      method,
      reason,
      candidates: candidates.length,
      window_hours: windowHours,
    });
  } catch (error) {
    console.error("select-flagship fatal error:", error);
    return jsonResp({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
