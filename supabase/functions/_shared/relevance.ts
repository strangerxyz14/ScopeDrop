// ─────────────────────────────────────────────────────────────
// Deterministic off-topic pre-filter for the article pipeline.
//
// ScopeDrop covers startups, funding, M&A, the AI industry and tech
// business/policy. Consumer gadget reviews, game releases, sports,
// medical research, lifestyle and general politics kept leaking onto
// the homepage because the old ingest keyword gate matched substrings
// ("ai" in "said") and nothing downstream rejected them.
//
// A topic hit is rejected unless the text also carries a strong
// business signal (a round, an acquisition, an IPO, a valuation...) —
// "Gaming studio raises $40M" stays, "Wolverine PS5 bundle" goes.
// "founder"/"startup" deliberately don't count as business signals:
// the generator and many feeds sprinkle them over everything.
//
// Pure module (no Deno APIs) so it can be bundled and tested offline.
// Used by ingest-signals, extract-structured and generate-content.
// ─────────────────────────────────────────────────────────────

// raw_signals.error_message tag set by extract-structured on signals the
// classifier accepted. generate-content only writes articles for pending
// signals carrying it, so nothing reaches the homepage unclassified.
// (Status can't carry this: its CHECK allows pending/published/rejected/
// paused only, and the project's migrations are applied by hand.)
export const CLASSIFIED_RELEVANT = "classified_relevant";

interface TopicRule {
  reason: string;
  pattern: RegExp;
  // Optional second condition: the topic only counts when this also
  // matches (consumer devices need a review/launch/spec cue, otherwise
  // "Qualcomm's smartphone chip business" would be caught).
  alsoRequires?: RegExp;
  // Hard rules ignore the business override.
  hard?: boolean;
  // Extra override on top of BUSINESS_SIGNAL (politics → tech policy).
  extraOverride?: RegExp;
}

const BUSINESS_SIGNAL = new RegExp(
  [
    String.raw`\braised\b`,
    String.raw`\braise[sd]?\s+(?:\$|₹|€|£|usd|inr|rs\.?\s?\d|\d)`,
    String.raw`\bsecure[sd]?\s+(?:\$|₹|€|£|usd|inr|rs\.?\s?\d|\d)`,
    String.raw`\bfunding\b`,
    String.raw`\b(?:pre-)?seed\s+round\b`,
    String.raw`\bseries\s+[a-f]\b`,
    String.raw`\bventure\s+(?:capital|fund|firm|round)`,
    String.raw`\bvcs?\b`,
    String.raw`\binvestors?\b`,
    String.raw`\bvaluation\b`,
    String.raw`\bvalued\s+at\b`,
    String.raw`\bacqui(?:re[sd]?|res|ring|sitions?)\b`,
    String.raw`\bmergers?\b`,
    String.raw`\bipo\b`,
    String.raw`\bgo(?:es|ing)?\s+public\b`,
    String.raw`\btender\s+offer\b`,
    String.raw`\bunicorn\b`,
    String.raw`\blayoffs?\b`,
    String.raw`\bantitrust\b`,
    String.raw`\bearnings\b`,
    String.raw`\brevenue\b`,
    String.raw`\bjoint\s+venture\b`,
    String.raw`\bsemiconductors?\b`,
    String.raw`\bchipmakers?\b`,
    String.raw`\bmarket\s+share\b`,
    String.raw`\bshipments\b`,
  ].join("|"),
  "i",
);

const TECH_POLICY_SIGNAL =
  /\b(?:ai|artificial intelligence|tech|technology|chips?|semiconductors?|export controls?|tariffs?|antitrust|regulat\w*|privacy|data protection|crypto\w*|startups?|digital|cyber\w*)\b/i;

const RULES: TopicRule[] = [
  {
    reason: "gaming",
    pattern:
      /\b(?:video ?games?|gaming|gamers?|e-?sports?|playstation|ps[456]|xbox|nintendo|switch 2|steam deck|game pass|minecraft|pok[eé]mon|fortnite|roblox|call of duty|rpgs?|jrpgs?|mmorpgs?|dlc|speedrun\w*|games?(?![- ]?chang)(?! theory))\b/i,
    // Real-money gaming bans/taxes are startup-policy news (Dream11 et al.).
    extraOverride: /\b(?:regulat\w*|bans?|banned|bill|law|gst|tax\w*|policy|ministry)\b/i,
  },
  {
    reason: "consumer_device",
    pattern:
      /\b(?:headphones?|earbuds?|earphones?|airpods|anc|soundbars?|smartphones?|iphones?|ipads?|ipados|macbooks?|galaxy (?:s|z|a|tab|watch|buds)\s?\w*|pixel \d+\w*|oneplus|xiaomi|redmi|realme|oppo|nord \d+|matepad|mate ?x\w*|tablets?|laptops?|chromebooks?|keyboards?|keycaps?|mice|gaming mouse|smartwatch(?:es)?|wearables?|fitbit|garmin|apple watch|oled tvs?|smart tvs?|televisions?|telephoto|ios \d+|macos|android \d+|one ui|e-?readers?|kindle)\b/i,
    alsoRequires:
      /\b(?:reviews?|reviewed|hands-on|unbox\w*|leak(?:s|ed)?|specs?|specifications|benchmarks?|antutu|price[ds]?|pricing|discounts?|sale|on sale|preorders?|pre-orders?|freebies|launch(?:es|ed|ing)?|unveil\w*|release[sd]?|betas?|batter(?:y|ies)|display|soundstage|distortion|refresh rate|\d+\s?hz|colou?rways?|bundles?|upgrades?|premium|rumou?r(?:s|ed)?)\b/i,
    // Component / supply-chain stories about devices are industry news.
    extraOverride: /\b(?:chips?|chipsets?|processors?|socs?|silicon|modems?|foundry|fabs?|supply chain|suppliers?|manufactur\w*)\b/i,
  },
  {
    reason: "sports",
    pattern:
      /\b(?:nfl|nba|wnba|mlb|nhl|fifa|uefa|premier league|la liga|champions league|cricket|ipl|bcci|football|soccer|tennis|wimbledon|golf|pga|olympics?|world cup|super bowl|formula (?:1|one)|grand prix|motogp|nascar|ufc|boxing|wrestling|athletes?|quarterback|playoffs?)\b/i,
  },
  {
    reason: "medical_research",
    pattern:
      /\b(?:cancers?|tumou?rs?|oncology|chemotherapy|clinical trials?|alzheimer'?s|parkinson'?s|dementia|diabetes|vaccines?|antibod(?:y|ies)|gene therapy|crispr|stem cells?|(?:researchers|scientists) (?:found|discover\w*|say|show\w*)|study (?:finds|found|shows|suggests)|peer-reviewed|published in (?:nature|science|the lancet|cell|jama|nejm))\b/i,
  },
  {
    reason: "entertainment_lifestyle",
    pattern:
      /\b(?:celebrit(?:y|ies)|bollywood|hollywood|box office|movies?|films?|tv series|tv shows?|sitcoms?|anime|trailers?|albums?|concerts?|songs?|singers?|rappers?|k-pop|music videos?|musicians?|documentar(?:y|ies)|recipes?|fashion|beauty|skincare|makeup|horoscopes?|wellness|vacations?|gossip|weddings?|royal family|marvel|nostalgi\w*|retro computing|vintage (?:computers?|tech)|hobbyists?|rc cars?)\b/i,
  },
  {
    reason: "general_politics",
    pattern:
      /\b(?:trump|biden|iran|gaza|hamas|hezbollah|kremlin|putin|referendum|elections?|senate race|parliament|marriage equality|immigration|protests?)\b/i,
    extraOverride: TECH_POLICY_SIGNAL,
  },
  {
    reason: "commodities",
    pattern: /\b(?:urea|fertili[sz]ers?|crude oil|gold prices?|commodit(?:y|ies)|wheat|soybeans?)\b/i,
  },
  {
    reason: "stock_tips",
    pattern:
      /\b(?:stocks? to (?:buy|watch)|technical (?:breakouts?|analysis)|price targets?|earnings estimates?|eps estimates?|analysts? (?:upgrade|downgrade)\w*|dividends?|zacks rank|52-week (?:high|low)|overbought|oversold|short interest)\b/i,
    hard: true,
  },
];

function normalize(text: string): string {
  // Generated and scraped text uses non-breaking/unicode hyphens
  // ("Over‑Ear", "EAH‑A1000") that break \b-based matching.
  return text.replace(/[‐-―−]/g, "-").replace(/\s+/g, " ");
}

/**
 * Returns a short reason ("gaming", "consumer_device", ...) when the
 * signal is off-topic for ScopeDrop, or null when it should continue
 * down the pipeline. Conservative by design: anything that isn't
 * clearly off-topic is left for the LLM classifier.
 */
export function offTopicReason(title: string | null | undefined, content: string | null | undefined): string | null {
  const text = normalize(`${title ?? ""} ${content ?? ""}`);
  if (!text.trim()) return null;
  const hasBusiness = BUSINESS_SIGNAL.test(text);

  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    if (rule.alsoRequires && !rule.alsoRequires.test(text)) continue;
    if (!rule.hard) {
      if (hasBusiness) continue;
      if (rule.extraOverride && rule.extraOverride.test(text)) continue;
    }
    return rule.reason;
  }
  return null;
}
