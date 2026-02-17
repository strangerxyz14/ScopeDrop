export type ArticleStatus = "scouted" | "analyzing" | "published" | "rejected";

export type BusinessCategory = "Startup" | "Tech" | "Business" | "Case Study";

export interface Article {
  id: string;
  title: string;
  slug: string;
  content_html: string | null;
  summary: string | null;
  category: BusinessCategory;
  status: ArticleStatus;
  source_urls: string[];
  ai_analysis_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ScoutNewsCandidate {
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string | null;
}

export interface GeminiDisruptorOutput {
  contrarian_take: string;
  asymmetric_risks: string[];
  founder_playbooks: string[];
  disconfirming_signals: string[];
  confidence_score: number;
  category: BusinessCategory;
  headline: string;
  summary: string;
  content_html: string;
}

export interface SupabaseWebhookInsertPayload<TRecord> {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: TRecord;
  old_record: TRecord | null;
}
