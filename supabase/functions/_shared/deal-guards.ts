// ─────────────────────────────────────────────────────────────
// Deterministic guards on capital events extracted by
// extract-structured, run before anything is written to
// capital_events. No LLM calls.
//
// An audit on 2026-10-31 found the extraction misreading headlines:
// commercial deals recorded as acquisitions ("Anthropic strikes $9B
// cloud deal with Riot" → Riot acquires Anthropic), investor packages
// recorded as the partner raising ("…partnering with Nvidia on a $500B
// funding package" → Nvidia raises $500B), IPO valuations stored as
// the amount, rumours ("seeks", "in talks") counted as done, and old
// or cancelled deals resurfacing in lawsuit / rename / unwind stories.
//
// Which part of the text each rule reads:
// - Skip rules (stale, lawsuit/rename, cancelled) read the headline
//   only: article bodies routinely mention prior rounds ("raised $20M
//   in 2024"), founding years and old lawsuits.
// - deal_status reads the headline; the lead (first LEAD_CHARS of the
//   body) only when the headline has no cue. Bodies are full of
//   "could"/"may"/"plans", which would mark every deal as reported.
// - Commercial-deal and package/capex rules read headline + lead.
// - The valuation rule reads the full text: it only fires when the
//   extracted amount equals a figure the text ties to a valuation.
//
// Pure module (no Deno APIs) so it can be bundled and tested offline:
//   scripts/test-deal-guards.mjs
// ─────────────────────────────────────────────────────────────

// Same values as the capital_events.deal_status CHECK
// (migration 20261031150000_capital_event_deal_status.sql).
export type DealStatus = "closed" | "agreed" | "reported";

export type DealKind = "funding" | "acquisition" | "ipo";

export interface DealGuardInput {
  kind: DealKind;
  title: string | null;
  content: string | null;
  // The signal's own date (raw_signals.created_at), ISO or YYYY-MM-DD.
  signalDate: string;
  amountUsd: number | null;
  valuationUsd: number | null;
}

export type DealGuardResult =
  | { ok: false; reason: string }
  | { ok: true; dealStatus: DealStatus; amountUsd: number | null; valuationUsd: number | null; note: string | null };

const LEAD_CHARS = 600;

// Words that make a weak cue ("plans", "could") about the deal itself:
// "eyes IPO" is a rumour, "raises $50M, plans expansion" is not.
const DEAL_WORD = String.raw`(?:(?:rais(?:e|es|ing)|round|funding|financing|invest(?:s|ing|ment)?|ipo|listing|list|float|debut|go(?:es|ing)?\s+public|sale|sell|acqui\w*|buy(?:ing)?|purchase|merger|merge|deal|offering|takeover|bid|stake|valuation)\b|[$₹€£])`;

// ── deal_status cues (priority reported > agreed > closed) ──
const REPORTED_CUES: RegExp[] = [
  /\bseek(?:s|ing)?\b/,
  /\bsought\b/,
  /\blook(?:s|ing)?\s+to\s+(?:raise|buy|acquire|sell|list|go\s+public)\b/,
  /\bin\s+(?:early|advanced|exclusive|late[- ]stage|preliminary|final|serious|initial)?\s*talks\b/,
  /\b(?:early|advanced|exclusive|preliminary)\s+talks\b/,
  /\btalks\s+to\s+(?:raise|buy|acquire|merge|sell|invest)\b/,
  /\breportedly\b/,
  /\b(?:sources|people)\s+(?:say|said|familiar)\b/,
  /\bbids?\b/,
  /\bbidding\b/,
  /\boffer(?:s|ed|ing)?\s+(?:to\s+(?:buy|acquire)|for)\b/,
  /\b(?:takeover|buyout|acquisition|cash|all-cash|all-stock|rival|sweetened|unsolicited)\s+offer\b/,
  new RegExp(String.raw`\b(?:plans?|planning|prepares?|preparing|eyes|eyeing|targets?|targeting|considers?|considering|weighs?|weighing|explores?|exploring|could|may|might|would)\b(?:\W+[\w$₹€£.-]+){0,4}?\W+${DEAL_WORD}`),
];

const AGREED_CUES: RegExp[] = [
  /\bagree(?:s|d)?\s+to\b/,
  /\b(?:to|will)\s+(?:acquire|buy|merge|purchase)\b/,
  /\bacquir(?:es|ing)\b/,
  /\bbuy(?:s|ing)\b/,
  /\bset\s+to\s+close\b/,
  /\bdefinitive\s+agreement\b/,
  /\bsign(?:s|ed)\b/,
  /\bfile[sd]?\s+(?:confidentially\s+)?(?:for|to)\s+(?:an?\s+)?(?:ipo|go\s+public|list)\b/,
];

const CLOSED_CUES: RegExp[] = [
  /\brais(?:es|ed)\b/,
  /\bclos(?:es|ed)\b(?!\s+in\s+on)/,
  /\bcomplet(?:es|ed)\b/,
  /\bacquired\b/,
  /\bbought\b/,
  /\bsecur(?:es|ed)\b/,
  /\bland(?:s|ed)\b/,
  /\b(?:debut(?:s|ed)|priced|prices|went\s+public|goes\s+public|began\s+trading|starts\s+trading)\b/,
];

function statusFrom(text: string): DealStatus | null {
  if (REPORTED_CUES.some((re) => re.test(text))) return "reported";
  if (AGREED_CUES.some((re) => re.test(text))) return "agreed";
  if (CLOSED_CUES.some((re) => re.test(text))) return "closed";
  return null;
}

export function dealStatusFor(kind: DealKind, title: string, lead: string): DealStatus {
  return statusFrom(title) ?? statusFrom(lead) ?? (kind === "funding" ? "closed" : "agreed");
}

// ── Commercial deals aren't acquisitions ──
const COMMERCIAL = new RegExp(
  [
    String.raw`\b(?:cloud|compute|computing|supply|licen[cs]ing|licen[cs]e|commercial|chip|gpu|power|energy|hosting|lease|leasing|distribution|offtake|strategic|data[- ]cent(?:er|re)|infrastructure|services?|hardware|capacity)\s+(?:deal|agreement|contract|pact|partnership)s?\b`,
    String.raw`\bcontracts?\b`,
    String.raw`\bpartner(?:s|ship|ships|ing|ed)?\b`,
    String.raw`\bagreement\s+with\b`,
    String.raw`\bon\s+(?:the\s+)?table\s+for\b`,
    String.raw`\bdata[- ]cent(?:er|re)\s+push\b`,
  ].join("|"),
);

const ACQUISITION_VERB = /\bacqui(?:re|res|red|ring|rer|sitions?)\b|\bacqui-?hires?\b|\bbuy(?:s|ing|out)?\b|\bbought\b|\btakeovers?\b|\btak(?:es|ing)?\s+over\b|\bmerg(?:e|es|ed|er|ers|ing)\b/;

// ── The subject must be the one raising ──
const OTHERS_FUNDING = new RegExp(
  [
    String.raw`\b(?:funding|financing|investment|capital|debt)\s+package\b`,
    String.raw`\bpartner(?:s|ing|ed)?\s+with\b.{0,80}?\bon\s+an?\s+[$₹€£]`,
    String.raw`\bprovid(?:e|es|ed|ing)\b.{0,60}?\b(?:financing|funding)\s+(?:for|to)\b`,
  ].join("|"),
);

const CAPEX = /\bcapex\b|\bcapital\s+expenditures?\b|\b(?:ai\s+)?(?:infrastructure|data[- ]cent(?:er|re)s?)\s+(?:build-?out|build\s+out|spending|spend)\b|\bspending\s+(?:plan|spree|commitment|pledge)\b/;

// ── Stale, lawsuit/rename, cancelled ──
const LAWSUIT_OR_RENAME = /\blawsuits?\b|\bsu(?:es|ed|ing)\b|\bfiles?\s+(?:a\s+)?suit\b|\bchanges?\s+(?:its\s+)?name\b|\brenam(?:es|ed|ing)\b|\brebrand(?:s|ed|ing)?\b|\bnew\s+name\b/;

const CANCELLED = /\bunwind(?:s|ing)?\b|\bunwound\b|\bcall(?:s|ed)?\s+off\b|\bterminat(?:es|ed|ing)\b|\bcancel(?:s|led|ed|ling|ing)?\b|\bscrap(?:s|ped)\b|\babandon(?:s|ed)\b|\bfall(?:s)?\s+through\b|\bfell\s+through\b|\bcollaps(?:es|ed)\b|\bwalks?\s+away\b|\bpulls?\s+out\s+of\b/;

const PAST_RELATIVE = /\blast\s+year\b|\ba\s+year\s+ago\b|\byears\s+ago\b/;
const YEAR_REFS = [
  /\b(?:in|since|during|from|back\s+in)\s+(?:early\s+|late\s+|mid-?)?(20\d\d)\b/g,
  /\b(20\d\d)(?:'s)?\s+(?:deal|acquisition|purchase|round|ipo|investment|merger|buyout|takeover)\b/g,
];

function placesDealInEarlierYear(title: string, signalYear: number): boolean {
  if (PAST_RELATIVE.test(title)) return true;
  for (const re of YEAR_REFS) {
    for (const m of title.matchAll(re)) {
      if (Number(m[1]) < signalYear) return true;
    }
  }
  return false;
}

// ── Valuation isn't an amount ──
const MONEY_RE = /(?:[A-Z]{1,3})?([$₹€£])\s?(\d+(?:[.,]\d+)?)\s*(trillion|tn|billion|bn|b|million|mn|mm|m|crore|cr|k)?\b/gi;

const UNIT: Record<string, number> = {
  trillion: 1e12, tn: 1e12,
  billion: 1e9, bn: 1e9, b: 1e9,
  million: 1e6, mn: 1e6, mm: 1e6, m: 1e6,
  crore: 1e7, cr: 1e7,
  k: 1e3,
};

// Text right after / right before a figure that ties it to a valuation.
// "debut"/"listing" only when attached to the figure ("$43b ASX debut"):
// "raises $100M ahead of its stock market debut" is a real round.
const VALUATION_AFTER = /^(?:(?:\s+[\w-]+){0,4}?\s+(?:valuation|market\s+cap(?:itali[sz]ation)?)|\s+(?:[a-z]{2,5}\s+)?(?:debut|listing|float))\b/i;
const VALUATION_BEFORE = /\b(?:valu(?:ed|es|ing)\s+(?:(?:it|the\s+(?:company|firm|startup|group|business))\s+)?at|valuation\s+of|market\s+cap(?:itali[sz]ation)?\s+of)(?:\s+(?:about|around|roughly|nearly|almost|over|more\s+than|up\s+to|as\s+much\s+as|some|an?|estimated))*\s*$/i;
// "a deal valued at $17B" is the deal's value, not the company's.
const DEAL_VALUED = /\b(?:deal|transaction|acquisition|purchase|offer|bid|merger|takeover|buyout|agreement)\s+(?:\w+\s+)?valued\s+at[^$₹€£]*$/i;

export function valuationFigures(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(MONEY_RE)) {
    const unit = m[3] ? UNIT[m[3].toLowerCase()] : 1;
    const value = Number(m[2].replace(/,(?=\d{3}$)/, "").replace(",", ".")) * unit;
    if (!Number.isFinite(value) || value <= 0) continue;
    const start = m.index ?? 0;
    const before = text.slice(Math.max(0, start - 60), start);
    const after = text.slice(start + m[0].length, start + m[0].length + 60);
    if (VALUATION_AFTER.test(after) || (VALUATION_BEFORE.test(before) && !DEAL_VALUED.test(before))) out.push(value);
  }
  return out;
}

function sameAmount(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(a, b) * 0.01;
}

// ── Entry point ──
export function guardCapitalEvent(input: DealGuardInput): DealGuardResult {
  const title = (input.title ?? "").toLowerCase();
  const content = input.content ?? "";
  const lead = content.slice(0, LEAD_CHARS).toLowerCase();
  const headAndLead = `${title}\n${lead}`;
  const signalYear = Number(String(input.signalDate).slice(0, 4)) || new Date().getUTCFullYear();

  if (CANCELLED.test(title)) return { ok: false, reason: "cancelled_deal" };
  if (LAWSUIT_OR_RENAME.test(title)) return { ok: false, reason: "lawsuit_or_rename" };
  if (placesDealInEarlierYear(title, signalYear)) return { ok: false, reason: "stale_deal" };

  if (input.kind === "acquisition") {
    // Headline decides when it names either; otherwise the lead does.
    const scope = COMMERCIAL.test(title) || ACQUISITION_VERB.test(title) ? title : headAndLead;
    if (COMMERCIAL.test(scope) && !ACQUISITION_VERB.test(scope)) {
      return { ok: false, reason: "commercial_deal" };
    }
  }

  if (input.kind === "funding") {
    if (OTHERS_FUNDING.test(headAndLead)) return { ok: false, reason: "others_funding_package" };
    if (CAPEX.test(headAndLead)) return { ok: false, reason: "capex_not_funding" };
  }

  let amountUsd = input.amountUsd;
  let valuationUsd = input.valuationUsd;
  let note: string | null = null;
  if (amountUsd !== null) {
    const tiedToValuation = (valuationUsd !== null && sameAmount(amountUsd, valuationUsd))
      || valuationFigures(`${input.title ?? ""}\n${content}`).some((v) => sameAmount(v, amountUsd as number));
    if (tiedToValuation) {
      valuationUsd = valuationUsd ?? amountUsd;
      amountUsd = null;
      note = "amount_was_valuation";
    }
  }

  return { ok: true, dealStatus: dealStatusFor(input.kind, title, lead), amountUsd, valuationUsd, note };
}
