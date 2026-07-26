// ============================================================
// Fallback image template lookup for events without a real image.
// Real image_url ALWAYS takes priority — this is only invoked when
// image_url is null. Uses stable hash-mod so the same event always
// gets the same template.
//
// HALT: the event_image_templates table intentionally starts empty.
// Templates are populated by the user only, via Nano Banana Pro
// (Google's Gemini app). This module returns null until real
// template rows exist — never auto-generates, never picks a random
// stock image.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

/** Sum the character codes of a UUID string. Stable, low-cost, good-enough hash for mod-N assignment. */
function stableHash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

interface LookupArgs {
  eventId: string;
  category?: string | null;
  format?: string | null;
}

/**
 * Returns a template URL for the given event, or null when no matching template
 * row exists. Prefers exact (category, format) match, falls back to category-only,
 * and returns null if neither has any rows — the caller should then render its
 * usual placeholder (e.g. HeroIllustration), never a broken img.
 */
export async function pickTemplateUrl({ eventId, category, format }: LookupArgs): Promise<string | null> {
  const cat = (category ?? "").trim().toLowerCase();
  if (!cat) return null;

  // Attempt exact (category, format) match first.
  let query = supabase.from("event_image_templates").select("template_url").eq("category", cat);
  if (format) query = query.eq("format", format);
  const { data: exact } = await query;
  const exactRows = exact ?? [];

  const pickFrom = (rows: Array<{ template_url: string }>) => {
    if (rows.length === 0) return null;
    const idx = stableHash(eventId) % rows.length;
    return rows[idx].template_url;
  };

  const exactPick = pickFrom(exactRows);
  if (exactPick) return exactPick;

  // Fall back to category-only if a format-specific pool was empty.
  if (format) {
    const { data: catOnly } = await supabase
      .from("event_image_templates")
      .select("template_url")
      .eq("category", cat);
    const catPick = pickFrom(catOnly ?? []);
    if (catPick) return catPick;
  }

  return null;
}
