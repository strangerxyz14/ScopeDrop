// ============================================================
// LLM Tier 3 extraction prompt — used when JSON-LD (Tier 1) and
// Open Graph (Tier 2) leave mandatory fields unfilled. Source-
// agnostic: works on Luma, Eventbrite, Meetup, plain event
// landing pages, blog posts announcing an event. Called via
// callLLM(TASK.EXTRACT_JSON | TASK.EXTRACT_JSON_LONG) — the
// LLM abstraction picks a task class based on estimated tokens.
//
// The prompt is written to hallucinate nothing — every field must
// be traceable to text in the source; missing fields return null
// rather than guesses. This keeps normalize-events' Layer A
// validation honest (missing fields → enrichment_failed).
// ============================================================

export const EVENT_EXTRACTION_SYSTEM = `You extract structured event details from an event landing page or announcement.

Output ONLY a JSON object with exactly this shape (all fields optional; use null when the source does not state it):
{
  "title": "string or null — the event's own name, not the page title",
  "start_at": "ISO 8601 datetime or null — earliest start; assume UTC if timezone unstated",
  "end_at": "ISO 8601 datetime or null",
  "timezone": "IANA name like 'America/Los_Angeles' or null",
  "organizer_name": "string or null — the org or person hosting",
  "organizer_website": "https URL or null",
  "organizer_logo_hint": "https URL or null — direct link to the organizer's logo if visible on the page",
  "location": {
    "is_online": boolean,
    "venue": "string or null",
    "address": "string or null",
    "city": "string or null",
    "country": "string or null"
  },
  "registration_url": "https URL or null — apply/register link if given",
  "price": { "amount": number, "currency": "3-letter code", "is_free": boolean } | null,
  "source_description": "string or null — 2-4 factual sentences from the source about what happens at the event; NOT the page's marketing tagline",
  "image_candidates": ["https URL", ...],
  "event_type": "demo_day|conference|pitch_competition|hackathon|meetup|workshop|pitch_event or null"
}

CRITICAL RULES:
- Do NOT invent facts. If the source does not explicitly state a field, return null (or [] for image_candidates, false for is_online default).
- Do NOT copy the page's marketing tagline into source_description. Prefer paragraphs that describe format, agenda, or attendee experience.
- image_candidates should be actual hero/cover image URLs, not logos or sponsor icons. Include at most 3.
- If the source is not describing a specific dated event (e.g. it's a company homepage, a general product page, a newsletter archive), return null for title and start_at.
- Registration URL should be the direct signup/apply/register link if distinct from the page URL; if the page IS the registration surface, use the canonical URL provided in the user message.`;

export function buildEventExtractionUser(cleanedHtml: string, canonicalUrl: string): string {
  return `Canonical URL: ${canonicalUrl}

Extracted body text (scripts/nav/footer stripped):
${cleanedHtml}

Extract the event now.`;
}
