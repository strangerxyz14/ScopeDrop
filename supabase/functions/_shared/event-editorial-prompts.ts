// ============================================================
// Editorial prompts for the /events/[slug] Highlights and Scope
// blocks. Both are gated behind the INSUFFICIENT_SIGNAL sentinel —
// if the model can't produce editorial-grade prose from the source,
// it returns the exact string INSUFFICIENT_SIGNAL and normalize-events
// treats that as a null field (row won't publish until either
// re-run with better source data or manually filled).
//
// Voice contracts locked in Phase 3 spec: Highlights is concrete +
// energetic + present-tense (what happens, who speaks, what launches);
// Scope is analytical + reserved (what does the event's existence
// signal about the wave/sector). They are DIFFERENT jobs — a row
// that has Highlights but null Scope stays enrichment_failed.
// ============================================================

export const INSUFFICIENT_SIGNAL_SENTINEL = "INSUFFICIENT_SIGNAL";

// ── HIGHLIGHTS ────────────────────────────────────────────────────
export const HIGHLIGHTS_SYSTEM = `You are the Highlights writer for ScopeDrop, a tech intelligence platform positioned as "The Economist of startups."

Voice for Highlights:
- Concrete, energetic, present-tense
- Name what will actually happen — who is speaking, what is being launched, what the room will feel like
- Never generic ("a great event," "amazing lineup" — banned phrases)
- Editor's-eye, energetic but never breathless
- If you cannot name a specific speaker, session, or artifact from the source, respond with the literal string INSUFFICIENT_SIGNAL

Constraints:
- 150-350 characters
- Present tense
- No exclamation marks
- No em dashes at sentence boundaries
- No emoji
- Return plain text only, no markdown, no quotes around the output`;

export function buildHighlightsUser(event: {
  title: string;
  source_description: string;
  organizer_name: string;
  event_type: string;
}): string {
  return `Event: ${event.title}
Organizer: ${event.organizer_name}
Type: ${event.event_type}

Source description:
${event.source_description}

Write the Highlights block now.`;
}

// ── SCOPE ─────────────────────────────────────────────────────────
export const SCOPE_SYSTEM = `You are the "What's the Scope" writer for ScopeDrop.

Voice for Scope:
- The Economist reading a room
- Situate the event in the current cycle — what wave is this riding, who benefits from showing up, what does the lineup signal about where the sector is heading
- Analytical and reserved. Never persuasive. Never a summary of the description.
- If Highlights is "come to this," Scope is "here's what its existence tells us"
- If the source has insufficient signal to write analytically, respond with the literal string INSUFFICIENT_SIGNAL

Constraints:
- 250-500 characters
- Third person, analytical register
- No first person, no direct address to reader
- Return plain text only, no markdown, no quotes`;

export function buildScopeUser(event: {
  title: string;
  source_description: string;
  organizer_name: string;
  event_type: string;
}): string {
  return `Event: ${event.title}
Organizer: ${event.organizer_name}
Type: ${event.event_type}

Source description:
${event.source_description}

Write the Scope block now.`;
}

// ── Hallucination guard ───────────────────────────────────────────
// Extract multi-word Capitalized proper nouns from Highlights output
// (patterns like "Pranav Agarwal", "Bharat Mandapam", "Y Combinator")
// and verify each appears in the source description. Single-word
// capitalized tokens are ignored — too many false positives (city
// names re-cased, article-initial "The", "This", etc.).
//
// Motivation: smoke test on the Ideabaaz row surfaced Groq
// hallucinating "Pranav Agarwal" as the founder — not present anywhere
// in the source. The Highlights prompt's "name specific speakers"
// pressure trades editorial concreteness for fabrication risk. This
// validator catches the obvious cases (fabricated names) while
// tolerating legitimate paraphrase (Y Combinator ↔ YC) that would
// break a stricter equality check.
//
// Common-word denylist keeps things like "Bharat Mandapam" (venue,
// legit) from getting flagged when the source only says "Bharat" or
// omits it. Tune the list as false-positive patterns emerge.
const NER_STOPWORDS = new Set([
  "The", "This", "That", "These", "Those", "Ai", "AI",
  "Startup", "Startups", "Event", "Events", "Founders", "Investors",
  "Demo", "Day", "Days", "Pitch", "Hackathon", "Conference", "Summit",
  "Workshop", "Meetup", "Cohort", "Batch",
]);

export function extractProperNouns(text: string): string[] {
  if (!text) return [];
  // Multi-word capitalized phrases: at least two Capitalized words
  // in a row (with optional connectors like of/the/&).
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+(?:of|the|and|&|von|de)?\s*[A-Z][a-z]+)+\b/g) ?? [];
  return matches
    .map(m => m.trim())
    .filter(m => !NER_STOPWORDS.has(m.split(/\s+/)[0]))
    .filter((m, i, arr) => arr.indexOf(m) === i);
}

function normalizedContains(haystack: string, needle: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  return norm(haystack).includes(norm(needle));
}

/**
 * Verify every multi-word proper noun in the generated Highlights
 * appears in the source description. Returns list of unmatched
 * phrases (empty array = clean).
 */
export function findUnsourcedProperNouns(generated: string, sourceDescription: string): string[] {
  if (!generated || !sourceDescription) return [];
  const nouns = extractProperNouns(generated);
  return nouns.filter(n => !normalizedContains(sourceDescription, n));
}

// ── Result normalization ──────────────────────────────────────────
// Normalize raw LLM output: trim, strip surrounding quotes/backticks
// that models sometimes emit despite instructions, drop markdown
// artefacts. Returns null if the result is the INSUFFICIENT_SIGNAL
// sentinel OR the cleaned string violates the length contract for
// that role. This is the sole publish gate for Layer B — no partial
// credit for out-of-bounds lengths.
export function normalizeEditorialOutput(
  raw: string,
  role: "highlights" | "scope",
): string | null {
  if (!raw) return null;
  let cleaned = raw.trim();
  // Strip wrapping quotes ("..." or '...' or `...`)
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("`") && cleaned.endsWith("`"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  // Strip common markdown emphasis wrappers models sometimes add
  cleaned = cleaned.replace(/^\*+|\*+$/g, "").trim();
  // Sentinel check — INSUFFICIENT_SIGNAL means model deliberately abstained
  if (cleaned === INSUFFICIENT_SIGNAL_SENTINEL) return null;
  // Length gate per role
  const [min, max] = role === "highlights" ? [150, 350] : [250, 500];
  if (cleaned.length < min || cleaned.length > max) return null;
  return cleaned;
}
