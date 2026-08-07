// ============================================================
// ingest-techmeme-events — daily HTML scrape of Techmeme's events
// calendar, two-stage filter (regex reject + Groq classify), stub-
// insert survivors as awaiting_enrichment. The normalize-events cron
// picks them up on its next 15-min tick and runs the full extraction
// cascade against each row's canonical_url.
//
// Design: this function does NOT run the extraction cascade itself.
// Its job is discovery + stubs. Keeping the two responsibilities
// split means normalize-events remains the single publish gate and
// Techmeme-specific bugs can't accidentally publish half-enriched
// rows.
//
// Cron: daily 06:00 UTC — see 20260802060500_techmeme_cron.sql.
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { DOMParser, type Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import { callLLM, TASK } from "../_shared/llm.ts";

const USER_AGENT = "ScopeDrop-EventsBot/1.0 (+https://scopedrop.itsstranger14.workers.dev)";
const TECHMEME_URL = "https://www.techmeme.com/events";
const MAX_CANDIDATES = 40;   // hard cap per run; Techmeme normally lists 30-60
// 0.6 not 0.7 — smoke test showed llama-3.1-8b-instant is conservative
// on genuinely-startup rows like "Agentic AI Summit" and "GopherCon".
// 0.6 keeps rejects for the ambiguous cases while letting the clear
// technical/AI/startup conferences through.
const CLASSIFIER_MIN_CONFIDENCE = 0.6;

// ── Stage 1: deterministic reject ─────────────────────────────────
// Every Techmeme row that trips one of these regex patterns is
// discarded before we spend a Groq call. Costs nothing, catches the
// biggest noise categories (earnings, product ships, holidays).
// Techmeme uses "Earnings: TICKER, TICKER" as the title convention —
// broader `^Earnings:` catch is deliberate.
const REJECT_PATTERNS: RegExp[] = [
  /^earnings\s*:/i,
  /\b(Q[1-4]\s+(FY\d+\s+)?earnings|earnings\s+(call|report|release)|quarterly\s+results|reports\s+earnings)\b/i,
  /\b(GA release|general availability|ships|rollout|rolls out|patch tuesday)\b/i,
  /\b(market\s+(holiday|closed)|new year'?s day|thanksgiving|christmas)\b/i,
  /\b(analyst\s+day|investor\s+day|shareholder\s+meeting)\b/i,
];

function passesStage1(title: string): boolean {
  return !REJECT_PATTERNS.some((re) => re.test(title));
}

// ── Stage 2: Groq classifier ──────────────────────────────────────
const STARTUP_EVENT_CLASSIFIER_SYSTEM = `You classify tech-industry calendar entries for a startup-focused events directory.

Output ONLY a JSON object:
{
  "is_startup_event": boolean,
  "event_type": "demo_day|hackathon|conference|meetup|workshop|pitch_event|null",
  "confidence": number between 0 and 1,
  "reason": "short string, explain the call"
}

ACCEPT (is_startup_event=true) when the row describes any of:
- Demo days, pitch competitions, accelerator showcases
- Hackathons open to independent builders
- Startup-focused or investor-focused conferences (YC-adjacent, VC summits, founder summits)
- AI/ML/technical meetups with a builder/founder angle
- Workshops for founders (fundraising, product, growth)

REJECT (is_startup_event=false) when the row describes any of:
- Corporate earnings calls, analyst/investor days, shareholder meetings
- Product GA releases, feature rollouts, ship dates
- Public/market holidays or exchange closures
- Sports events, concerts, celebrity appearances
- Enterprise trade shows with no startup/builder angle (large B2B expos primarily selling to Fortune 500)
- Vendor user conferences (Salesforce Dreamforce-style customer events)

confidence 0.9+ = clear-cut. 0.7-0.9 = probable. Below 0.7 = the caller
will reject the row regardless.`;

interface ClassifyResult {
  is_startup_event: boolean;
  event_type: string | null;
  confidence: number;
  reason: string;
}

// Robust confidence parser: models sometimes emit strings ("high"),
// numeric strings ("0.85"), or omit the field entirely. Defaulting a
// missing confidence to 0.8 (rather than 0) means we honor is_startup_event
// = true even when the model didn't attach a numeric self-score — the
// filter still bites on is_startup_event = false, which is the primary
// signal we care about.
function coerceConfidence(v: unknown): number {
  if (typeof v === "number" && isFinite(v)) return v > 1 ? v / 100 : v;
  if (typeof v === "string") {
    const parsed = parseFloat(v);
    if (isFinite(parsed)) return parsed > 1 ? parsed / 100 : parsed;
    const s = v.toLowerCase();
    if (/^(very high|high)/.test(s)) return 0.9;
    if (/^(medium|moderate)/.test(s)) return 0.7;
    if (/^(low)/.test(s)) return 0.4;
  }
  return 0.8;
}

async function classifyStartupEvent(title: string, location: string): Promise<ClassifyResult | null> {
  try {
    const contextLine = location ? `Location hint: ${location}` : "(no location context)";
    const res = await callLLM(
      TASK.CLASSIFY,
      STARTUP_EVENT_CLASSIFIER_SYSTEM,
      `Title: ${title}\n${contextLine}\n\nReturn JSON now.`,
      { jsonMode: true, maxTokens: 200, temperature: 0 },
    );
    const parsed = JSON.parse(res.content) as Partial<ClassifyResult>;
    if (typeof parsed.is_startup_event !== "boolean") return null;
    return {
      is_startup_event: parsed.is_startup_event,
      event_type: typeof parsed.event_type === "string" ? parsed.event_type : null,
      confidence: coerceConfidence(parsed.confidence),
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch (err) {
    console.warn("classifier failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ── HTML parsing ──────────────────────────────────────────────────
// Techmeme's events page uses div-based rows under #events, each an
// <a class="rhov"> wrapping three column divs: date | title | venue.
// Structure verified 2026-08-01; write defensively so a small markup
// tweak doesn't take the whole ingest down.
interface TechmemeRow {
  title: string;
  dateRaw: string;
  location: string;
  href: string;
}

function parseTechmemeRows(html: string): TechmemeRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];
  const rows: TechmemeRow[] = [];
  // Actual DOM: <div class="rhov"><a href="/r2/..."><div>date</div><div>title</div><div>location</div></a></div>
  // `.rhov` is a wrapper div (not on the anchor as an earlier read of
  // the CSS suggested). Selecting `div.rhov > a` targets the event
  // row anchor directly and ignores non-event anchors on the page.
  const rhovs = doc.querySelectorAll("div.rhov");
  for (const rhov of Array.from(rhovs) as Element[]) {
    const a = rhov.querySelector("a");
    if (!a) continue;
    const href = a.getAttribute("href") ?? "";
    if (!href) continue;
    const cols = Array.from(a.querySelectorAll("div")) as Element[];
    if (cols.length < 2) continue;
    const dateRaw = cols[0]?.textContent?.trim() ?? "";
    const title = cols[1]?.textContent?.trim() ?? "";
    const location = cols[2]?.textContent?.trim() ?? "";
    if (!title) continue;
    rows.push({ title, dateRaw, location, href });
    if (rows.length >= MAX_CANDIDATES) break;
  }
  return rows;
}

// ── Date parsing ──────────────────────────────────────────────────
// Techmeme's date column is human-friendly: "Aug 3", "Aug 1-2",
// "Jul 31-Aug 3", "Sep 10-12, 2026". We only need enough to pass
// the "start_at ≥ today - 24h" Layer A gate; the extraction cascade
// running on canonical_url will overwrite with the accurate value.
const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseStartsAt(dateRaw: string, referenceYear: number): string | null {
  if (!dateRaw) return null;
  // Match first "Mon D" occurrence; ignore range end
  const m = dateRaw.match(/([A-Za-z]{3,})\s+(\d{1,2})/);
  if (!m) return null;
  const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
  if (month == null) return null;
  const day = parseInt(m[2], 10);
  if (!isFinite(day) || day < 1 || day > 31) return null;
  // Optional explicit year: "Sep 10-12, 2026"
  const yearMatch = dateRaw.match(/,\s*(20\d{2})/);
  let year = yearMatch ? parseInt(yearMatch[1], 10) : referenceYear;
  // Roll to next year if the parsed date sits in the past
  let candidate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  if (candidate.getTime() < Date.now() - 86_400_000) {
    year += 1;
    candidate = new Date(Date.UTC(year, month, day, 12, 0, 0));
  }
  return candidate.toISOString();
}

// ── Follow /r2/ redirect to canonical URL ────────────────────────
// Techmeme's link column uses /r2/<slug> as a 301 shortener. Fetch
// with redirect follow to resolve; on any error, fall back to the
// original href so we don't strand the row.
async function resolveCanonicalUrl(href: string): Promise<string> {
  const absolute = href.startsWith("http") ? href : `https://www.techmeme.com${href}`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    // HEAD is preferred but many hosts reject it — GET with body ignored is safer
    const res = await fetch(absolute, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html" },
    });
    clearTimeout(timer);
    // res.url reflects the final URL post-redirects
    return res.url || absolute;
  } catch {
    return absolute;
  }
}

// ── Slug generation ──────────────────────────────────────────────
async function slugFromRow(title: string, startsAtIso: string): Promise<string> {
  const startsDate = startsAtIso.slice(0, 10);
  const norm = title.toLowerCase().replace(/\s+/g, " ").trim();
  const key = `${norm}|${startsDate}`;
  const data = new TextEncoder().encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
  return `techmeme_${hashHex}`;
}

// ── Handler ──────────────────────────────────────────────────────
serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return jsonResp({ error: "missing SUPABASE_URL / SERVICE_ROLE_KEY" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch + parse
    const htmlRes = await fetch(TECHMEME_URL, { headers: { "User-Agent": USER_AGENT } });
    if (!htmlRes.ok) return jsonResp({ error: `techmeme fetch ${htmlRes.status}` }, 502);
    const html = await htmlRes.text();
    const rows = parseTechmemeRows(html);

    const summary = {
      total_rows: rows.length,
      stage1_rejected: 0,
      classified: 0,
      stage2_rejected: 0,
      inserted: 0,
      duplicates: 0,
      errors: 0,
      classifier_calls: 0,
      rejections_sample: [] as Array<{ title: string; reason: string; confidence?: number }>,
    };

    const referenceYear = new Date().getUTCFullYear();

    for (const row of rows) {
      // Stage 1 — regex reject
      if (!passesStage1(row.title)) {
        summary.stage1_rejected++;
        if (summary.rejections_sample.length < 5) {
          summary.rejections_sample.push({ title: row.title, reason: "stage1_regex" });
        }
        continue;
      }

      // Stage 2 — LLM classify
      summary.classifier_calls++;
      const verdict = await classifyStartupEvent(row.title, row.location);
      summary.classified++;
      if (!verdict || !verdict.is_startup_event || verdict.confidence < CLASSIFIER_MIN_CONFIDENCE) {
        summary.stage2_rejected++;
        if (summary.rejections_sample.length < 5) {
          summary.rejections_sample.push({
            title: row.title,
            reason: verdict ? `classifier:${verdict.reason ?? "low_confidence"}` : "classifier_no_response",
            confidence: verdict?.confidence,
          });
        }
        continue;
      }

      // Parse date — required for Layer A gate downstream
      const startsAt = parseStartsAt(row.dateRaw, referenceYear);
      if (!startsAt) {
        summary.errors++;
        continue;
      }

      // Resolve canonical URL (follow /r2/ shortener)
      const canonicalUrl = await resolveCanonicalUrl(row.href);
      const slug = await slugFromRow(row.title, startsAt);

      const insertPayload = {
        slug,
        source: "techmeme",
        source_id: slug.replace(/^techmeme_/, ""),
        source_url: TECHMEME_URL,
        canonical_url: canonicalUrl,
        title: row.title,
        starts_at: startsAt,
        location: row.location || null,
        is_virtual: /online|virtual|zoom|meet/i.test(row.location ?? ""),
        event_type: verdict.event_type ?? "conference",
        status: "awaiting_enrichment",
      };

      const { error } = await supabase
        .from("scheduled_events")
        .upsert(insertPayload, { onConflict: "slug", ignoreDuplicates: true });

      if (error) {
        if (String(error.message).toLowerCase().includes("duplicate")) {
          summary.duplicates++;
        } else {
          console.warn(`insert failed for "${row.title}": ${error.message}`);
          summary.errors++;
        }
      } else {
        summary.inserted++;
      }
    }

    return jsonResp(summary);
  } catch (err) {
    console.error("ingest-techmeme-events fatal:", err);
    return jsonResp({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
