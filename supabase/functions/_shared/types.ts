export type SignalStatus = "pending" | "published" | "rejected" | "paused";

export type ArticleCategory = "funding" | "ai" | "markets" | "startups" | "policy";

export interface RawSignal {
  id: string;
  title: string | null;
  raw_content: string | null;
  source_url: string;
  source_name: string | null;
  status: SignalStatus;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface Article {
  id: string;
  headline: string;
  summary: string;
  content_html: string;
  category: ArticleCategory;
  tags: string[];
  read_time_minutes: number;
  source_signal_id: string | null;
  status: string;
  created_at: string;
}

export interface PipelineStats {
  date: string;
  tokens_used: number;
  articles_generated: number;
  requests_made: number;
  last_updated: string;
}
