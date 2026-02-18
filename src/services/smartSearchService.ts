import { supabase } from '@/lib/supabase';

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'funding' | 'ai' | 'acquisition' | 'founder' | 'tech';
  relevance: number;
  source: string;
  timestamp: Date;
}

export interface TrendingTopic {
  id: string;
  topic: string;
  category: string;
  momentum: number;
  mentions: number;
  lastUpdated: Date;
}

export class SmartSearchService {
  private static instance: SmartSearchService;
  private cache: Map<string, SearchSuggestion[]> = new Map();
  private trendingCache: TrendingTopic[] = [];

  static getInstance(): SmartSearchService {
    if (!SmartSearchService.instance) {
      SmartSearchService.instance = new SmartSearchService();
    }
    return SmartSearchService.instance;
  }

  // Get search suggestions with Supabase integration
  async getSearchSuggestions(query: string): Promise<SearchSuggestion[]> {
    if (query.length < 2) return [];

    // Check cache first
    const cacheKey = `search_${query.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // Query Supabase for relevant content
      const { data: articles, error } = await (supabase
        .from('articles')
        .select('id, title, summary, category, created_at') as any)
        .or(`title.ilike.%${query}%,summary.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching search suggestions:', error);
        return this.getFallbackSuggestions(query);
      }

      const suggestions: SearchSuggestion[] = articles?.map((article, index) => ({
        id: article.id ?? `article_${index}`,
        text: article.title,
        type: this.categorizeContent(article.category, article.summary),
        relevance: 0.8 - (index * 0.1),
        source: 'database',
        timestamp: new Date(article.created_at)
      })) || [];

      // Add trending topics if query matches
      const trendingMatches = this.trendingCache.filter(topic => 
        topic.topic.toLowerCase().includes(query.toLowerCase())
      );

      trendingMatches.forEach((topic, index) => {
        suggestions.push({
          id: `trending_${topic.id}`,
          text: topic.topic,
          type: topic.category as any,
          relevance: 0.9 + (topic.momentum * 0.1),
          source: 'trending',
          timestamp: topic.lastUpdated
        });
      });

      // Cache the results
      this.cache.set(cacheKey, suggestions);
      
      // Clear old cache entries
      if (this.cache.size > 100) {
        const keys = Array.from(this.cache.keys());
        keys.slice(0, 20).forEach(key => this.cache.delete(key));
      }

      return suggestions;
    } catch (error) {
      console.error('Error in smart search:', error);
      return this.getFallbackSuggestions(query);
    }
  }

  // Get trending topics from Supabase
  async getTrendingTopics(): Promise<TrendingTopic[]> {
    try {
      const { data: rows, error } = await supabase
        .from("articles")
        .select("id, category, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const categories = (rows ?? [])
        .map((r: any) => (typeof r.category === "string" ? r.category.trim() : ""))
        .filter(Boolean);

      const counts: Record<string, number> = categories.reduce((acc: Record<string, number>, c: string) => {
        acc[c] = (acc[c] ?? 0) + 1;
        return acc;
      }, {});

      const top: TrendingTopic[] = Object.entries(counts)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([category, mentions]) => ({
          id: category,
          topic: category,
          category,
          momentum: Math.min(1, (mentions as number) / 10),
          mentions: mentions as number,
          lastUpdated: new Date(),
        }));

      this.trendingCache = top;
      return top;
    } catch (error) {
      console.error('Error in trending topics:', error);
      return this.getFallbackTrendingTopics();
    }
  }

  // Get real-time badges for navigation
  async getNavigationBadges(): Promise<Record<string, string | null>> {
    try {
      const badges: Record<string, string | null> = {};

      const now = Date.now();

      // Recent funding activity (funding_rounds table)
      try {
        const { data: latestFunding, error } = await supabase
          .from("funding_rounds" as any)
          .select("announced_at, created_at")
          .order("announced_at" as any, { ascending: false })
          .limit(1);
        if (!error && latestFunding && latestFunding.length > 0) {
          const ts = String((latestFunding[0] as any).announced_at ?? (latestFunding[0] as any).created_at ?? "");
          const t = new Date(ts).getTime();
          if (Number.isFinite(t) && now - t <= 24 * 60 * 60 * 1000) badges.funding = "Hot";
        }
      } catch {
        // ignore missing table
      }

      // AI momentum (recent articles containing "AI" in title)
      const { data: aiRows } = await supabase
        .from("articles")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      const recentAi = (aiRows ?? []).some((r: any) => {
        const title = String(r.title ?? "").toLowerCase();
        const t = new Date(String(r.created_at ?? "")).getTime();
        return title.includes("ai") && Number.isFinite(t) && now - t <= 24 * 60 * 60 * 1000;
      });
      if (recentAi) badges.aiTrends = "Live";

      // Recent acquisitions (title match)
      const recentAcq = (aiRows ?? []).some((r: any) => {
        const title = String(r.title ?? "").toLowerCase();
        const t = new Date(String(r.created_at ?? "")).getTime();
        return (title.includes("acquisition") || title.includes("acquire") || title.includes("merger")) &&
          Number.isFinite(t) && now - t <= 24 * 60 * 60 * 1000;
      });
      if (recentAcq) badges.acquisitions = "New";

      return badges;
    } catch (error) {
      console.error('Error fetching navigation badges:', error);
      return {};
    }
  }

  // Categorize content based on category and tags
  private categorizeContent(category: string | null, summary: string | null): 'funding' | 'ai' | 'acquisition' | 'founder' | 'tech' {
    const categoryLower = (category || '').toLowerCase();
    const summaryLower = (summary || '').toLowerCase();

    if (summaryLower.includes('funding') || categoryLower.includes('startup')) {
      return 'funding';
    }
    if (summaryLower.includes('ai') || categoryLower.includes('tech')) {
      return 'ai';
    }
    if (summaryLower.includes('acquisition') || summaryLower.includes('merger')) {
      return 'acquisition';
    }
    if (summaryLower.includes('founder')) {
      return 'founder';
    }
    return 'tech';
  }

  // Fallback suggestions when Supabase is unavailable
  private getFallbackSuggestions(query: string): SearchSuggestion[] {
    const fallbackSuggestions: SearchSuggestion[] = [
      { id: '1', text: 'Series A funding rounds', type: 'funding', relevance: 0.9, source: 'fallback', timestamp: new Date() },
      { id: '2', text: 'AI startup acquisitions', type: 'acquisition', relevance: 0.8, source: 'fallback', timestamp: new Date() },
      { id: '3', text: 'Tech stack analysis', type: 'tech', relevance: 0.7, source: 'fallback', timestamp: new Date() },
      { id: '4', text: 'Founder interviews', type: 'founder', relevance: 0.6, source: 'fallback', timestamp: new Date() },
      { id: '5', text: 'AI market trends', type: 'ai', relevance: 0.8, source: 'fallback', timestamp: new Date() },
    ];

    return fallbackSuggestions.filter(suggestion => 
      suggestion.text.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Fallback trending topics
  private getFallbackTrendingTopics(): TrendingTopic[] {
    return [
      { id: '1', topic: 'AI Funding Boom', category: 'AI', momentum: 0.9, mentions: 150, lastUpdated: new Date() },
      { id: '2', topic: 'Series A Rounds', category: 'Funding', momentum: 0.8, mentions: 120, lastUpdated: new Date() },
      { id: '3', topic: 'Tech Stack Evolution', category: 'Tech', momentum: 0.7, mentions: 90, lastUpdated: new Date() },
      { id: '4', topic: 'Founder Stories', category: 'Founder', momentum: 0.6, mentions: 75, lastUpdated: new Date() },
    ];
  }
}

export const smartSearchService = SmartSearchService.getInstance();