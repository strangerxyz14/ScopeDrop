import { supabase } from "@/integrations/supabase/client";
import type { DbArticleRow } from "@/services/articlesService";

// Every section page reads through here so none can forget the status
// filter again. RLS (20261025120000_articles_rls_published.sql) enforces
// the same rule server-side; this keeps the intent visible in the client.

// Category values the section pages read. Phase 1 of the routing plan
// replaces this with a shared list imported by the pipeline too.
export type SectionKey =
  | "funding"
  | "acquisitions"
  | "ai"
  | "startups"
  | "markets"
  | "policy"
  | "tech";

export interface SectionFeedOptions {
  /** Narrow to rows in these sections that also carry this tag. */
  withTag?: string;
  /** Widen to rows carrying this tag in any section. */
  orTag?: string;
  limit?: number;
}

export async function fetchSection(
  sections: SectionKey[],
  { withTag, orTag, limit = 12 }: SectionFeedOptions = {},
): Promise<DbArticleRow[]> {
  let q = supabase.from("articles").select("*").eq("status", "published");

  if (orTag) {
    q = q.or(`category.in.(${sections.join(",")}),tags.cs.{"${orTag}"}`);
  } else {
    q = q.in("category", sections);
  }
  if (withTag) q = q.contains("tags", [withTag]);

  const { data, error } = await q
    // created_at: see useFreshFlow for why published_at can't be trusted.
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as DbArticleRow[];
}

/** Tagged rows first; the whole section when none are tagged yet. */
export async function fetchSectionPreferTag(
  sections: SectionKey[],
  tag: string,
  limit = 12,
): Promise<DbArticleRow[]> {
  const tagged = await fetchSection(sections, { withTag: tag, limit });
  return tagged.length > 0 ? tagged : fetchSection(sections, { limit });
}
