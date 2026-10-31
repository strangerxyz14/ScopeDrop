// ─────────────────────────────────────────────────────────────
// Entity enrichment — fills company / investor profiles from free
// structured sources instead of news text, and gives every entity a
// stable identity (domain, Wikidata id, SEC CIK) that later sources
// (SEC filings, YC, logos) can match on.
//
// Sources, cheapest first:
//   registry  company_registry rows loaded weekly from the YC directory
//             (yc-oss) and the SEC company list; matched by normalized
//             name in SQL, no network call per entity.
//   wikidata  wbsearchentities by name, then ONE SPARQL query per batch
//             for the candidates' facts (website, inception, HQ,
//             employees, CIK, ticker, industry).
//   sec       data.sec.gov submissions for entities with a CIK: business
//             address and website when Wikidata has none.
//
// Precision over recall: a profile is only written from a candidate we
// are confident is the same company. Ambiguous names (several businesses
// share the label) are recorded with their candidates and left unfilled.
// Existing values are never overwritten.
//
// No Deno / Supabase imports here, so the logic runs under Node for tests.
// ─────────────────────────────────────────────────────────────

export const ENRICHMENT_VERSION = "2026-10-31.1";

const DEFAULT_CONTACT = "https://scopedrop.itsstranger14.workers.dev";

/** SEC and Wikidata both ask for a descriptive User-Agent with a contact. */
export function userAgent(contact?: string | null): string {
  return `ScopeDrop-entity-enrichment/1.0 (${contact?.trim() || DEFAULT_CONTACT})`;
}

// ── Names and domains ───────────────────────────────────────

const LEGAL_SUFFIX =
  /\b(inc|incorporated|ltd|limited|llc|llp|plc|corp|corporation|co|company|gmbh|ag|sa|sas|bv|nv|oy|ab|pte|pvt|private|pty|holdings?)\b/g;

/**
 * Comparable form of a company name: lowercase ASCII words, legal
 * suffixes dropped, "&" as "and". "Uber Technologies, Inc." → "uber
 * technologies"; "Hadrian Security B.V." → "hadrian security".
 */
export function normalizeCompanyName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b([a-z])\.(?=[a-z]\.)/g, "$1") // b.v. → bv, s.a. → sa
    .replace(/\.(?=\s|$)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/^\s*the\s+/, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_TAIL = /\s(technologies|technology|tech|labs|software|systems|solutions|group|india|global|ai)$/;

/**
 * Company name without generic tails, for a second comparison:
 * "Atomberg Technologies" → "atomberg". Not used for investors, where
 * "Octopus Ventures" must not become "octopus".
 */
export function coreCompanyName(name: string): string {
  let n = normalizeCompanyName(name);
  for (let i = 0; i < 2 && GENERIC_TAIL.test(n); i++) n = n.replace(GENERIC_TAIL, "").trim();
  return n;
}

/** Display name without a trailing legal suffix, for search queries: "Intercontinental Exchange Inc." → "Intercontinental Exchange". */
export function searchName(name: string): string {
  return name
    .trim()
    .replace(/[,\s]+(inc|incorporated|ltd|limited|llc|llp|plc|corp|corporation|co|gmbh|ag|s\.?a|b\.?v|n\.?v|pvt\.? ltd|private limited)\.?$/i, "")
    .trim();
}

/** A company named after its domain: "upliance.ai", "Trade.xyz", "Ascend.io" → that domain. */
export function domainFromName(name: string): string | null {
  const n = name.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9-]{1,40}\.(ai|io|xyz|com|co|app|dev|so|tech|in|me|gg|fm|sh|to|vc|money|fi|finance|health|bio)$/.test(n)
    ? n
    : null;
}

/** Names we should not look up: mojibake, truncations, single letters. */
export function isUsableName(name: string): boolean {
  if (/[ÂÃâ][\u0080-¿ -⃿]|…|\.\.\.$|�/.test(name)) return false;
  const n = normalizeCompanyName(name);
  return n.length >= 2 && /[a-z]/.test(n);
}

/** Bare registrable host for a website URL: "https://www.Freshworks.com/x" → "freshworks.com". */
export function domainFromWebsite(website: string | null | undefined): string | null {
  if (!website) return null;
  const raw = website.trim();
  if (!raw) return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\d?\./, "").replace(/\.$/, "");
    if (!host.includes(".") || /^\d+(\.\d+){3}$/.test(host)) return null;
    // Profiles on shared hosts identify the host, not the company.
    if (/(^|\.)(linkedin|facebook|twitter|x|instagram|crunchbase|github|medium|wikipedia|angel)\.(com|co|org)$/.test(host)) {
      return null;
    }
    return host;
  } catch {
    return null;
  }
}

export function websiteUrl(website: string | null | undefined): string | null {
  const domain = domainFromWebsite(website);
  if (!domain) return null;
  const raw = website!.trim();
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

// ── Registry (YC directory + SEC company list) ──────────────

export interface RegistryRow {
  source: "yc" | "sec";
  external_id: string;
  name: string;
  name_norm: string;
  domain: string | null;
  ticker: string | null;
  payload: Record<string, unknown>;
}

// deno-lint-ignore no-explicit-any
export function parseYcCompanies(json: any[]): RegistryRow[] {
  const rows: RegistryRow[] = [];
  for (const c of json ?? []) {
    if (!c?.name || c.id == null) continue;
    const base = {
      source: "yc" as const,
      external_id: String(c.id),
      domain: domainFromWebsite(c.website),
      ticker: null,
      payload: {
        slug: c.slug ?? null,
        website: c.website ?? null,
        one_liner: c.one_liner ?? null,
        batch: c.batch ?? null,
        status: c.status ?? null,
        industry: c.industry ?? null,
        subindustry: c.subindustry ?? null,
        team_size: typeof c.team_size === "number" ? c.team_size : null,
        launched_at: typeof c.launched_at === "number" ? c.launched_at : null,
        locations: c.all_locations ?? null,
        logo: c.small_logo_thumb_url ?? null,
      },
    };
    const names = [c.name, ...(Array.isArray(c.former_names) ? c.former_names : [])];
    names.forEach((n: unknown, i: number) => {
      if (typeof n !== "string" || !n.trim()) return;
      // Former names get their own row so a renamed company still matches.
      rows.push({ ...base, external_id: i === 0 ? base.external_id : `${base.external_id}~${i}`, name: n.trim(), name_norm: normalizeCompanyName(n) });
    });
  }
  return rows.filter((r) => r.name_norm);
}

/** company_tickers.json: {"0": {"cik_str": 320193, "ticker": "AAPL", "title": "Apple Inc."}, …} */
// deno-lint-ignore no-explicit-any
export function parseSecTickers(json: Record<string, any>): RegistryRow[] {
  const byCik = new Map<string, RegistryRow>();
  for (const v of Object.values(json ?? {})) {
    if (!v?.cik_str || !v?.title) continue;
    const cik = String(v.cik_str).padStart(10, "0");
    // A CIK can list several share classes; the first is the primary ticker.
    if (byCik.has(cik)) continue;
    byCik.set(cik, {
      source: "sec",
      external_id: cik,
      name: String(v.title),
      name_norm: normalizeCompanyName(String(v.title)),
      domain: null,
      ticker: v.ticker ? String(v.ticker) : null,
      payload: {},
    });
  }
  return [...byCik.values()].filter((r) => r.name_norm);
}

// ── Wikidata ────────────────────────────────────────────────

export interface WikidataCandidate {
  id: string;
  label: string;
  description: string | null;
  matchText: string;
}

export interface WikidataFacts {
  id: string;
  isBusiness: boolean;
  isOrganization: boolean;
  isHuman: boolean;
  website: string | null;
  inceptionYear: number | null;
  headquarters: string | null;
  country: string | null;
  employees: number | null;
  cik: string | null;
  ticker: string | null;
  industries: string[];
  sitelinks: number;
}

export async function wikidataSearch(name: string, ua: string, limit = 7): Promise<WikidataCandidate[]> {
  const url = new URL("https://www.wikidata.org/w/api.php");
  url.search = new URLSearchParams({
    action: "wbsearchentities",
    search: name,
    language: "en",
    uselang: "en",
    type: "item",
    limit: String(limit),
    format: "json",
  }).toString();
  const res = await fetch(url, { headers: { "User-Agent": ua } });
  if (!res.ok) throw new Error(`wikidata search HTTP ${res.status}`);
  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  return (body?.search ?? []).map((s: any) => ({
    id: s.id,
    label: s.label ?? s.display?.label?.value ?? "",
    description: s.description ?? s.display?.description?.value ?? null,
    matchText: s.match?.text ?? s.label ?? "",
  }));
}

const ADDRESS_LIKE = /\d|\b(street|st|building|tower|plaza|center|centre|campus|avenue|road|house|square|park)\b/i;

// "company" (Q783794) is not a subclass of "business" (Q4830453) in
// Wikidata, so Freshworks would fail a business-only check.
const BUSINESS_ROOTS = ["wd:Q4830453", "wd:Q783794", "wd:Q6881511", "wd:Q167037"];

/** One SPARQL round trip for every candidate in a batch. */
export async function wikidataFacts(ids: string[], ua: string): Promise<Map<string, WikidataFacts>> {
  const out = new Map<string, WikidataFacts>();
  const clean = [...new Set(ids.filter((id) => /^Q\d+$/.test(id)))];
  if (clean.length === 0) return out;
  const query = `
SELECT ?item (SAMPLE(?biz) AS ?business) (SAMPLE(?org) AS ?organization) (SAMPLE(?hum) AS ?human)
  (SAMPLE(?web) AS ?website) (MIN(?inc) AS ?inception) (SAMPLE(?hqL) AS ?hq) (SAMPLE(?hqPL) AS ?hqParent) (SAMPLE(?hqCL) AS ?hqCountry) (SAMPLE(?cL) AS ?country)
  (MAX(?emp) AS ?employees) (SAMPLE(?cik0) AS ?cik) (SAMPLE(?tick) AS ?ticker)
  (GROUP_CONCAT(DISTINCT ?indL; separator="|") AS ?industries) (SAMPLE(?links) AS ?sitelinks)
WHERE {
  VALUES ?item { ${clean.map((id) => `wd:${id}`).join(" ")} }
  BIND(EXISTS { VALUES ?root { ${BUSINESS_ROOTS.join(" ")} } ?item wdt:P31/wdt:P279* ?root } AS ?biz)
  BIND(EXISTS { ?item wdt:P31/wdt:P279* wd:Q43229 } AS ?org)
  BIND(EXISTS { ?item wdt:P31 wd:Q5 } AS ?hum)
  OPTIONAL { ?item wdt:P856 ?web }
  OPTIONAL { ?item wdt:P571 ?inc }
  OPTIONAL {
    ?item wdt:P159 ?hqI . ?hqI rdfs:label ?hqL FILTER(LANG(?hqL) = "en")
    OPTIONAL { ?hqI wdt:P131 ?hqP . ?hqP rdfs:label ?hqPL FILTER(LANG(?hqPL) = "en") }
    OPTIONAL { ?hqI wdt:P17 ?hqC . ?hqC rdfs:label ?hqCL FILTER(LANG(?hqCL) = "en") }
  }
  OPTIONAL { ?item wdt:P17 ?cI . ?cI rdfs:label ?cL FILTER(LANG(?cL) = "en") }
  OPTIONAL { ?item wdt:P1128 ?emp }
  OPTIONAL { ?item wdt:P5531 ?cik0 }
  OPTIONAL { ?item p:P414 ?ex . ?ex pq:P249 ?tick }
  OPTIONAL { ?item wdt:P452 ?indI . ?indI rdfs:label ?indL FILTER(LANG(?indL) = "en") }
  OPTIONAL { ?item wikibase:sitelinks ?links }
}
GROUP BY ?item`;
  const post = () =>
    fetch("https://query.wikidata.org/sparql", {
      method: "POST",
      headers: {
        "User-Agent": ua,
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ query }).toString(),
    });
  let res = await post();
  // The public endpoint sheds load with 429 / 5xx; one retry after a pause.
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 3000));
    res = await post();
  }
  if (!res.ok) throw new Error(`wikidata sparql HTTP ${res.status}`);
  const body = await res.json();
  // deno-lint-ignore no-explicit-any
  for (const b of body?.results?.bindings ?? []) {
    const id = String(b.item?.value ?? "").split("/").pop() ?? "";
    if (!id) continue;
    const year = b.inception?.value ? Number(String(b.inception.value).match(/^-?(\d{4})/)?.[1]) : NaN;
    const emp = b.employees?.value ? Math.round(Number(b.employees.value)) : NaN;
    out.set(id, {
      id,
      isBusiness: b.business?.value === "true",
      isOrganization: b.organization?.value === "true",
      isHuman: b.human?.value === "true",
      website: b.website?.value ?? null,
      inceptionYear: Number.isFinite(year) && year > 1600 ? year : null,
      // An HQ that is a building or street ("200 West Street") reads
      // better as the place it is in.
      headquarters: (ADDRESS_LIKE.test(b.hq?.value ?? "") ? b.hqParent?.value : b.hq?.value) ?? b.hq?.value ?? null,
      // The HQ's own country: Shein is from China but based in Singapore.
      country: b.hqCountry?.value ?? b.country?.value ?? null,
      employees: Number.isFinite(emp) && emp > 0 ? emp : null,
      cik: b.cik?.value ? String(b.cik.value).replace(/\D/g, "").padStart(10, "0") : null,
      ticker: b.ticker?.value ?? null,
      industries: b.industries?.value ? String(b.industries.value).split("|").filter(Boolean) : [],
      sitelinks: b.sitelinks?.value ? Number(b.sitelinks.value) : 0,
    });
  }
  return out;
}

// ── SEC submissions ─────────────────────────────────────────

export interface SecProfile {
  cik: string;
  name: string | null;
  website: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  sic: string | null;
  tickers: string[];
}

export async function secSubmission(cik: string, ua: string): Promise<SecProfile | null> {
  const padded = cik.replace(/\D/g, "").padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, { headers: { "User-Agent": ua } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`sec submissions HTTP ${res.status}`);
  const s = await res.json();
  const addr = s?.addresses?.business ?? {};
  return {
    cik: padded,
    name: s?.name ?? null,
    website: typeof s?.website === "string" && s.website.trim() ? s.website.trim() : null,
    city: addr.city ? titleCase(String(addr.city)) : null,
    state: addr.stateOrCountryDescription ?? addr.stateOrCountry ?? null,
    country: addr.isForeignLocation === 1 ? (addr.stateOrCountryDescription ?? null) : "United States",
    sic: s?.sicDescription ?? null,
    tickers: Array.isArray(s?.tickers) ? s.tickers : [],
  };
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// ── Choosing a match ────────────────────────────────────────
//
// A name alone is weak evidence: YC has a "Dream", Wikidata has a
// video-game studio called "Inkle". A candidate is accepted only when
// something independent agrees with it:
//   - another source: same domain (YC ↔ Wikidata) or same CIK;
//   - the news that introduced the entity (its capital events' source
//     text) names the candidate's domain, HQ city, an industry word, or
//     for YC, Y Combinator;
//   - the candidate is well known (many Wikipedia sitelinks) and is the
//     only business with that name.
// Otherwise it is recorded as "unconfirmed" and nothing is written.

export interface EntityHint {
  name: string;
  entity_type: string;
  /** Earliest round we have recorded for it (seed, series_a, …), if any. */
  earliestRound: string | null;
  /** Lowercased source text of the news behind the entity's capital events. */
  context: string;
}

export type WikidataPick =
  | { kind: "match"; facts: WikidataFacts; candidate: WikidataCandidate; reason: string }
  | { kind: "unconfirmed"; facts: WikidataFacts; candidate: WikidataCandidate }
  | { kind: "ambiguous"; candidates: { id: string; label: string; description: string | null }[] }
  | { kind: "none"; reason: string };

const EARLY_ROUNDS = new Set(["pre_seed", "seed", "series_a"]);
const WELL_KNOWN_SITELINKS = 20;

export function isEarlyStage(hint: EntityHint): boolean {
  return !!hint.earliestRound && EARLY_ROUNDS.has(hint.earliestRound);
}

/** Whether a Wikidata item can be this entity at all, by type. */
function typeFits(entityType: string, f: WikidataFacts): boolean {
  if (entityType === "company" || entityType === "tool") return f.isBusiness;
  // Investors: firms, funds, family offices, government funds, or people.
  return f.isBusiness || f.isOrganization || f.isHuman;
}

/**
 * A recorded seed / Series A round rules out a century-old conglomerate
 * with the same name.
 */
function stageFits(hint: EntityHint, f: WikidataFacts): boolean {
  if (!isEarlyStage(hint)) return true;
  if (f.inceptionYear != null && f.inceptionYear < 2000) return false;
  if (f.employees != null && f.employees > 5000) return false;
  return true;
}

/** Comparable names for an entity: full, and for companies without generic tails. */
export function nameKeys(name: string, entityType: string): string[] {
  const keys = [normalizeCompanyName(name)];
  if (entityType !== "investor") {
    const core = coreCompanyName(name);
    if (core && core !== keys[0] && core.length >= 3) keys.push(core);
  }
  return keys.filter(Boolean);
}

const STOPWORDS = new Set([
  "company", "companies", "based", "multinational", "technology", "technologies", "services", "service", "business",
  "industry", "private", "public", "startup", "founded", "group", "limited", "corporation", "global", "international",
  "united", "states", "kingdom", "provider", "platform", "products", "firm", "organization", "headquartered",
  "subsidiary",
  // Places and nationalities say where, not what: "betting company in
  // Africa" agreeing with news about Africa proves nothing.
  "africa", "african", "europe", "european", "asian", "america", "american", "americas", "british", "indian", "french",
  "german", "chinese", "china", "japan", "japanese", "india", "korea", "korean", "canada", "canadian", "israel",
  "israeli", "singapore", "brazil", "brazilian", "middle", "eastern", "western", "northern", "southern", "swedish",
  "danish", "norwegian", "finnish", "dutch", "spanish", "italian", "swiss", "irish", "australian", "mexican",
  "california", "californian", "texas", "london", "paris", "berlin",
]);

/** Stems too general to tell two companies apart ("production", "systems"). */
const GENERIC_STEMS = new Set([
  "produ", "manuf", "syste", "servi", "solut", "devel", "resea", "opera", "manag", "inter", "natio", "gener", "compa",
  "indus", "provi", "speci", "corpo", "holdi", "found",
]);

/** 5-letter stems of the meaningful words in a description: "biotechnology company" → ["biote"]. */
function stems(text: string | null | undefined): string[] {
  if (!text) return [];
  return [...new Set(
    text.toLowerCase().split(/[^a-z]+/)
      .filter((w) => w.length >= 5 && !STOPWORDS.has(w))
      .map((w) => w.slice(0, 5))
      .filter((s) => !GENERIC_STEMS.has(s)),
  )];
}

function contextStems(context: string): Set<string> {
  return new Set(context.split(/[^a-z]+/).filter((w) => w.length >= 5).map((w) => w.slice(0, 5)));
}

/**
 * The entity's own name, as words, stems and squashed: its news contains
 * these by definition, so finding them there proves nothing ("Even
 * Healthcare" vs "health", "Toyota" HQ'd in Toyota, "Dodge AI" vs dodge.com).
 */
function nameTokens(name: string): Set<string> {
  const words = normalizeCompanyName(name).split(" ").filter(Boolean);
  const out = new Set<string>([words.join("")]);
  for (const w of words) {
    out.add(w);
    if (w.length >= 5) out.add(w.slice(0, 5));
  }
  return out;
}

/** Domain label without its TLD, if distinctive enough to search for: "huggingface.co" → "huggingface". */
function domainLabel(domain: string | null): string | null {
  if (!domain) return null;
  const label = domain.split(".")[0];
  return label.length >= 5 ? label : null;
}

export interface Evidence {
  why: string;
  /** Domain or HQ city named in the news; stems alone are weak. */
  strong: boolean;
  /** Shared industry stems, for weak evidence. */
  stems: number;
}

/** What in the entity's news, if anything, agrees with a Wikidata candidate. */
export function contextEvidence(hint: EntityHint, f: WikidataFacts, description: string | null): Evidence | null {
  const ctx = hint.context;
  if (!ctx) return null;
  const own = nameTokens(hint.name);
  const domain = domainFromWebsite(f.website);
  if (domain && ctx.includes(domain)) return { why: `news names ${domain}`, strong: true, stems: 0 };
  const label = domainLabel(domain);
  if (label && !own.has(label) && ctx.includes(label)) return { why: `news names ${label}`, strong: true, stems: 0 };
  const city = f.headquarters?.split(",")[0].trim().toLowerCase();
  if (
    city && city.length >= 4 && !own.has(city.replace(/\s/g, "")) &&
    new RegExp(`\\b${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(ctx)
  ) {
    return { why: `news names ${f.headquarters}`, strong: true, stems: 0 };
  }
  const ctxStems = contextStems(ctx);
  const shared = stems([description, ...f.industries].join(" ")).filter((s) => ctxStems.has(s) && !own.has(s));
  if (shared.length > 0) return { why: `news shares "${shared.join(", ")}"`, strong: false, stems: shared.length };
  return null;
}

/** Whether the entity's news agrees with a YC company. */
export function ycEvidence(hint: EntityHint, yc: RegistryRow, wikidataDomain: string | null): string | null {
  if (yc.domain && wikidataDomain && yc.domain === wikidataDomain) return "same domain on Wikidata";
  const ctx = hint.context;
  if (!ctx) return null;
  if (/\by ?combinator\b|\(yc [swfx]\d{2}\)|\byc[- ]backed\b/.test(ctx)) return "news mentions Y Combinator";
  if (yc.domain && ctx.includes(yc.domain)) return `news names ${yc.domain}`;
  const label = domainLabel(yc.domain);
  if (label && !nameTokens(hint.name).has(label) && ctx.includes(label)) return `news names ${label}`;
  return null;
}


export function pickWikidata(
  hint: EntityHint,
  candidates: WikidataCandidate[],
  facts: Map<string, WikidataFacts>,
  corroboration: { domains: string[]; cik: string | null; ticker?: string | null } = { domains: [], cik: null },
): WikidataPick {
  const keys = new Set(nameKeys(hint.name, hint.entity_type));
  const exact = candidates.filter((c) =>
    keys.has(normalizeCompanyName(c.label)) || keys.has(normalizeCompanyName(c.matchText))
  );
  if (exact.length === 0) return { kind: "none", reason: "no exact name match" };

  const fitting = exact
    .map((c) => ({ c, f: facts.get(c.id) }))
    .filter((x): x is { c: WikidataCandidate; f: WikidataFacts } => !!x.f && typeFits(hint.entity_type, x.f))
    .filter((x) => stageFits(hint, x.f));
  if (fitting.length === 0) return { kind: "none", reason: "name matches are not businesses of this kind" };

  // A match that needs the generic tail stripped ("Dodge AI" → "Dodge")
  // is a weaker claim than a full-name match.
  const full = normalizeCompanyName(hint.name);
  const fullName = (x: { c: WikidataCandidate }) =>
    normalizeCompanyName(x.c.label) === full || normalizeCompanyName(x.c.matchText) === full;

  // Another source agreeing settles it outright.
  const known = new Set(corroboration.domains);
  const corroborated = fitting.filter((x) =>
    (x.f.website && known.has(domainFromWebsite(x.f.website) ?? "")) ||
    (corroboration.cik && x.f.cik === corroboration.cik) ||
    (corroboration.ticker && x.f.ticker?.toUpperCase() === corroboration.ticker.toUpperCase())
  );
  if (corroborated.length === 1) {
    return { kind: "match", facts: corroborated[0].f, candidate: corroborated[0].c, reason: "same domain or CIK in another source" };
  }

  // When SEC already names the company, a Wikidata namesake must agree
  // on something specific: "PTC" the software firm (SEC) is not the
  // roller-coaster maker whose description shares "manufacturing".
  // A one-word name ("Luminate", "Gradient") collides easily, so shared
  // industry words must be at least two.
  const needStrong = !!corroboration.cik;
  const distinctive = full.split(" ").length >= 2;
  const evidenced = fitting
    .map((x) => ({ ...x, ev: contextEvidence(hint, x.f, x.c.description) }))
    .filter((x) => x.ev && (x.ev.strong || (!needStrong && fullName(x) && (distinctive || x.ev.stems >= 2))));
  if (evidenced.length === 1) {
    return { kind: "match", facts: evidenced[0].f, candidate: evidenced[0].c, reason: evidenced[0].ev!.why };
  }

  const ranked = [...fitting].sort((a, b) => b.f.sitelinks - a.f.sitelinks);
  const top = ranked[0];
  const runnerUp = ranked[1]?.f.sitelinks ?? 0;
  // Well known and clearly the namesake people mean (Intel, Hugging Face).
  // Not for early-stage entities: a seed-stage "Apple" is not Apple.
  if (!isEarlyStage(hint) && fullName(top) && !top.f.isHuman && top.f.sitelinks >= WELL_KNOWN_SITELINKS && top.f.sitelinks >= 3 * Math.max(1, runnerUp)) {
    return { kind: "match", facts: top.f, candidate: top.c, reason: `well known (${top.f.sitelinks} sitelinks)` };
  }
  // The only business with a multi-word full name ("Sarvam AI", "Varda
  // Space Industries"): its news names it by definition, but two
  // unrelated businesses rarely share a full multi-word name.
  // Not for people: "Yash Mehta" the angel is not "Yash Mehta" the cricketer.
  if (fitting.length === 1 && distinctive && fullName(top) && !needStrong && !top.f.isHuman) {
    return { kind: "match", facts: top.f, candidate: top.c, reason: "only business with this full name" };
  }
  if (fitting.length === 1) return { kind: "unconfirmed", facts: top.f, candidate: top.c };
  return {
    kind: "ambiguous",
    candidates: ranked.slice(0, 5).map((x) => ({ id: x.c.id, label: x.c.label, description: x.c.description })),
  };
}

// ── Merging into an entity row ──────────────────────────────

export interface EntityRow {
  id: string;
  name: string;
  entity_type: string;
  website: string | null;
  founded_year: number | null;
  headquarters: string | null;
  employee_count_estimate: number | null;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  wikidata_id: string | null;
  sec_cik: string | null;
  ticker: string | null;
  yc_id: string | null;
}

export interface Findings {
  /** Accepted YC company (evidence found), and why. */
  yc: RegistryRow | null;
  ycReason?: string | null;
  /** YC namesake we found but could not confirm. */
  ycUnconfirmed?: RegistryRow | null;
  /** Accepted SEC registrant (exact legal-name match, not early stage). */
  sec: RegistryRow | null;
  /** The name is itself a domain ("upliance.ai"). */
  nameDomain?: string | null;
  wikidata: WikidataPick | null;
  secProfile: SecProfile | null;
}

export type EnrichmentStatus = "matched" | "unconfirmed" | "ambiguous" | "no_match" | "skipped";

export interface EnrichmentResult {
  status: EnrichmentStatus;
  sources: string[];
  /** Column updates; only columns that are empty on the row. */
  updates: Record<string, unknown>;
  /** What each source said, kept for review and later passes. */
  raw: Record<string, unknown>;
}

function headquartersFrom(f: Findings): string | null {
  const w = f.wikidata?.kind === "match" ? f.wikidata.facts : null;
  if (w?.headquarters) {
    return w.country && !w.headquarters.includes(w.country) ? `${w.headquarters}, ${w.country}` : w.headquarters;
  }
  if (f.secProfile?.city) {
    return [f.secProfile.city, f.secProfile.state].filter(Boolean).join(", ");
  }
  const loc = f.yc?.payload?.locations;
  if (typeof loc === "string" && loc.trim()) return loc.split(";")[0].trim();
  return null;
}

export function mergeFindings(
  row: EntityRow,
  f: Findings,
  logoUrlFor: (domain: string) => string,
): EnrichmentResult {
  const w = f.wikidata?.kind === "match" ? f.wikidata.facts : null;
  const yc = f.yc?.payload ?? null;
  const sources: string[] = [];
  if (f.nameDomain) sources.push("name");
  if (f.yc) sources.push("yc");
  if (w) sources.push("wikidata");
  if (f.sec || f.secProfile) sources.push("sec");

  const raw: Record<string, unknown> = { version: ENRICHMENT_VERSION };
  if (f.yc) raw.yc = { id: f.yc.external_id, name: f.yc.name, reason: f.ycReason ?? null, ...f.yc.payload };
  else if (f.ycUnconfirmed) {
    raw.yc_unconfirmed = { id: f.ycUnconfirmed.external_id, name: f.ycUnconfirmed.name, ...f.ycUnconfirmed.payload };
  }
  if (f.wikidata) {
    raw.wikidata = f.wikidata.kind === "match" || f.wikidata.kind === "unconfirmed"
      ? {
        kind: f.wikidata.kind,
        ...f.wikidata.facts,
        label: f.wikidata.candidate.label,
        description: f.wikidata.candidate.description,
        reason: f.wikidata.kind === "match" ? f.wikidata.reason : null,
      }
      : f.wikidata;
  }
  if (f.secProfile) raw.sec = f.secProfile;
  else if (f.sec) raw.sec = { cik: f.sec.external_id, name: f.sec.name, ticker: f.sec.ticker };

  if (sources.length === 0) {
    const status: EnrichmentStatus = f.wikidata?.kind === "ambiguous"
      ? "ambiguous"
      : f.wikidata?.kind === "unconfirmed" || f.ycUnconfirmed
      ? "unconfirmed"
      : "no_match";
    return { status, sources, updates: {}, raw };
  }

  // Website: YC lists the live site; Wikidata's is often a legacy URL.
  const website = websiteUrl(yc?.website as string | null) ?? websiteUrl(w?.website) ?? websiteUrl(f.secProfile?.website) ??
    (f.nameDomain ? `https://${f.nameDomain}` : null);
  const domain = domainFromWebsite(website);
  const ycYear = typeof yc?.launched_at === "number" ? new Date((yc.launched_at as number) * 1000).getUTCFullYear() : null;

  const candidates: Record<string, unknown> = {
    website,
    domain,
    founded_year: w?.inceptionYear ?? (ycYear && ycYear > 1990 ? ycYear : null),
    headquarters: headquartersFrom(f),
    employee_count_estimate: w?.employees ?? (typeof yc?.team_size === "number" && yc.team_size > 0 ? yc.team_size : null),
    description: (yc?.one_liner as string | null) ??
      (f.wikidata?.kind === "match" ? f.wikidata.candidate.description : null),
    logo_url: domain ? logoUrlFor(domain) : null,
    wikidata_id: w?.id ?? null,
    sec_cik: f.secProfile?.cik ?? f.sec?.external_id ?? w?.cik ?? null,
    ticker: f.sec?.ticker ?? w?.ticker ?? f.secProfile?.tickers?.[0] ?? null,
    yc_id: f.yc ? f.yc.external_id.split("~")[0] : null,
  };

  const updates: Record<string, unknown> = {};
  for (const [col, value] of Object.entries(candidates)) {
    if (value == null || value === "") continue;
    const current = (row as unknown as Record<string, unknown>)[col];
    if (current == null || current === "") updates[col] = value;
  }
  return { status: "matched", sources, updates, raw };
}

// ── Batch orchestration ─────────────────────────────────────
//
// I/O for the database is passed in, so the edge function and local
// tests run the same steps.

export interface BatchItem {
  row: EntityRow;
  hint: EntityHint;
}

export interface BatchDeps {
  ua: string;
  /** Registry rows whose name_norm is one of these keys. */
  registryByNames: (keys: string[]) => Promise<RegistryRow[]>;
  logoUrlFor: (domain: string) => string;
  /** Pause between Wikidata searches, to stay polite. */
  searchDelayMs?: number;
}

export interface BatchOutcome {
  item: BatchItem;
  result: EnrichmentResult;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FACTS_CHUNK = 40;

export async function enrichBatch(items: BatchItem[], deps: BatchDeps): Promise<BatchOutcome[]> {
  const outcomes: BatchOutcome[] = [];
  const usable = items.filter((it) => isUsableName(it.row.name));
  for (const it of items) {
    if (!isUsableName(it.row.name)) {
      outcomes.push({ item: it, result: { status: "skipped", sources: [], updates: {}, raw: { version: ENRICHMENT_VERSION, reason: "unusable name" } } });
    }
  }

  // Registry candidates, one query for the whole batch.
  const keysOf = new Map(usable.map((it) => [it.row.id, nameKeys(it.row.name, it.row.entity_type)]));
  const registry = await deps.registryByNames([...new Set([...keysOf.values()].flat())]);
  const byKey = new Map<string, RegistryRow[]>();
  for (const r of registry) byKey.set(r.name_norm, [...(byKey.get(r.name_norm) ?? []), r]);

  // Wikidata: search by the suffix-free name, then by the core name if
  // that found no exact label.
  const searches = new Map<string, WikidataCandidate[]>();
  for (const it of usable) {
    const keys = new Set(keysOf.get(it.row.id));
    let found = await wikidataSearch(searchName(it.row.name), deps.ua);
    const hasExact = (cs: WikidataCandidate[]) =>
      cs.some((c) => keys.has(normalizeCompanyName(c.label)) || keys.has(normalizeCompanyName(c.matchText)));
    const core = keysOf.get(it.row.id)![1];
    if (!hasExact(found) && core) {
      await sleep(deps.searchDelayMs ?? 200);
      found = [...found, ...await wikidataSearch(core, deps.ua)];
    }
    // Only exact-name candidates can be picked; facts for the rest would
    // just slow the SPARQL query down.
    searches.set(it.row.id, found.filter((c) => keys.has(normalizeCompanyName(c.label)) || keys.has(normalizeCompanyName(c.matchText))));
    await sleep(deps.searchDelayMs ?? 200);
  }
  const facts = new Map<string, WikidataFacts>();
  const ids = [...new Set([...searches.values()].flat().map((c) => c.id))];
  for (let i = 0; i < ids.length; i += FACTS_CHUNK) {
    for (const [k, v] of await wikidataFacts(ids.slice(i, i + FACTS_CHUNK), deps.ua)) facts.set(k, v);
  }

  for (const it of usable) {
    const keys = keysOf.get(it.row.id)!;
    const hits = keys.flatMap((k) => byKey.get(k) ?? []);
    const ycIds = new Set(hits.filter((r) => r.source === "yc").map((r) => r.external_id.split("~")[0]));
    const ycCandidate = it.row.entity_type !== "investor" && ycIds.size === 1 ? hits.find((r) => r.source === "yc")! : null;
    // SEC: exact legal name only, and never for early-stage startups.
    const secHits = (byKey.get(keys[0]) ?? []).filter((r) => r.source === "sec");
    const secCandidate = secHits.length === 1 && !isEarlyStage(it.hint) ? secHits[0] : null;

    const nameDomain = it.row.entity_type !== "investor" ? domainFromName(it.row.name) : null;
    const pick = pickWikidata(it.hint, searches.get(it.row.id) ?? [], facts, {
      domains: [ycCandidate?.domain, nameDomain].filter((d): d is string => !!d),
      cik: secCandidate?.external_id ?? null,
      ticker: secCandidate?.ticker ?? null,
    });
    const wikidataDomain = pick.kind === "match" || pick.kind === "unconfirmed" ? domainFromWebsite(pick.facts.website) : null;
    const ycReason = ycCandidate ? ycEvidence(it.hint, ycCandidate, wikidataDomain) : null;

    const cik = secCandidate?.external_id ?? (pick.kind === "match" ? pick.facts.cik : null);
    let secProfile: SecProfile | null = null;
    if (cik) {
      try {
        secProfile = await secSubmission(cik, deps.ua);
      } catch (e) {
        console.warn(`sec submissions ${cik}:`, e instanceof Error ? e.message : e);
      }
    }

    outcomes.push({
      item: it,
      result: mergeFindings(it.row, {
        yc: ycReason ? ycCandidate : null,
        ycReason,
        ycUnconfirmed: ycReason ? null : ycCandidate,
        sec: secCandidate,
        nameDomain,
        wikidata: pick,
        secProfile,
      }, deps.logoUrlFor),
    });
  }
  return outcomes;
}
