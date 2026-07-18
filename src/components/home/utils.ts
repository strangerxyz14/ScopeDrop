export function formatMoneyShort(amount: number | null | undefined): string | null {
  if (amount == null || !isFinite(amount) || amount <= 0) return null;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(amount >= 1e10 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(amount >= 1e8 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (amount >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${Math.round(amount)}`;
}

export function formatRoundType(roundType: string | null | undefined): string {
  if (!roundType) return "";
  const map: Record<string, string> = {
    pre_seed: "PRE-SEED",
    seed: "SEED",
    series_a: "SERIES A",
    series_b: "SERIES B",
    series_c: "SERIES C",
    series_d_plus: "SERIES D+",
    growth: "GROWTH",
    debt: "DEBT",
    acquisition: "ACQUIRED",
    ipo: "IPO",
  };
  return map[roundType] ?? roundType.toUpperCase().replace(/_/g, " ");
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!isFinite(then)) return "";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "JUST NOW";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}M AGO`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}H AGO`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d}D AGO`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" }).toUpperCase();
}

export function kickerFromArticle(a: {
  tags: string[] | null;
  category: string;
  subtype: string | null;
}): { text: string; isAcq: boolean } {
  const tag0 = a.tags?.[0]?.trim();
  if (tag0) return { text: tag0.toUpperCase(), isAcq: /acquisit/i.test(tag0) };
  if (a.subtype) return { text: a.subtype.replace(/_/g, " ").toUpperCase(), isAcq: false };
  return { text: (a.category || "STORY").toUpperCase(), isAcq: /acquisit/i.test(a.category) };
}

export function bylineFromArticle(a: { tags: string[] | null }): string {
  const desks: Record<string, string> = {
    decode: "The Decode Desk",
    pattern: "The Pattern Desk",
    data: "The Data Desk",
    radar: "The Radar Desk",
    profile: "The Profile Desk",
  };
  const t0 = a.tags?.[0]?.toLowerCase();
  if (t0 && desks[t0]) return desks[t0];
  return "The ScopeDrop Desk";
}

/** Estimate read time in minutes from content_html if not stored. Strips tags naively. */
export function estimateReadTime(contentHtml: string | null, stored?: number | null): number {
  if (stored && stored > 0) return stored;
  if (!contentHtml) return 3;
  const words = contentHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 220));
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (!isFinite(d.getTime())) return "";
  const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = d.getDate().toString().padStart(2, "0");
  const dow = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${month} ${day} · ${dow}`;
}
