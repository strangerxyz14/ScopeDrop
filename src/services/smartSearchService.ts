import { supabase } from '@/services/enhancedCacheManager';

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
      const { data: articles, error } = await supabase
        .from('news_articles')
        .select('title, description, category, tags, published_at')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
        .order('published_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching search suggestions:', error);
        return this.getFallbackSuggestions(query);
      }

      const suggestions: SearchSuggestion[] = articles?.map((article, index) => ({
        id: `article_${index}`,
        text: article.title,
        type: this.categorizeContent(article.category, article.tags),
        relevance: 0.8 - (index * 0.1),
        source: 'database',
        timestamp: new Date(article.published_at)
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
      const { data: topics, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('momentum', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching trending topics:', error);
        return this.getFallbackTrendingTopics();
      }

      this.trendingCache = topics?.map(topic => ({
        id: topic.id,
        topic: topic.topic,
        category: topic.category,
        momentum: topic.momentum,
        mentions: topic.mentions,
        lastUpdated: new Date(topic.updated_at)
      })) || [];

      return this.trendingCache;
    } catch (error) {
      console.error('Error in trending topics:', error);
      return this.getFallbackTrendingTopics();
    }
  }

  // Get real-time badges for navigation
  async getNavigationBadges(): Promise<Record<string, string | null>> {
    try {
      const badges: Record<string, string | null> = {};

      // Check for recent funding activity
      const { data: recentFunding } = await supabase
        .from('news_articles')
        .select('published_at')
        .eq('category', 'Funding')
        .gte('published_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentFunding && recentFunding.length > 0) {
        badges.funding = 'Hot';
      }

      // Check for AI momentum
      const { data: aiTopics } = await supabase
        .from('trending_topics')
        .select('momentum')
        .eq('category', 'AI')
        .gte('momentum', 0.7)
        .limit(1);

      if (aiTopics && aiTopics.length > 0) {
        badges.aiTrends = 'Live';
      }

      // Check for recent acquisitions
      const { data: recentAcquisitions } = await supabase
        .from('news_articles')
        .select('published_at')
        .eq('category', 'Acquisitions')
        .gte('published_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (recentAcquisitions && recentAcquisitions.length > 0) {
        badges.acquisitions = 'New';
      }

      return badges;
    } catch (error) {
      console.error('Error fetching navigation badges:', error);
      return {};
    }
  }

  // Categorize content based on category and tags
  private categorizeContent(category: string, tags: string[]): 'funding' | 'ai' | 'acquisition' | 'founder' | 'tech' {
    const categoryLower = category.toLowerCase();
    const tagsLower = tags?.map(tag => tag.toLowerCase()) || [];

    if (categoryLower.includes('funding') || tagsLower.some(tag => tag.includes('funding'))) {
      return 'funding';
    }
    if (categoryLower.includes('ai') || tagsLower.some(tag => tag.includes('ai'))) {
      return 'ai';
    }
    if (categoryLower.includes('acquisition') || tagsLower.some(tag => tag.includes('acquisition'))) {
      return 'acquisition';
    }
    if (categoryLower.includes('founder') || tagsLower.some(tag => tag.includes('founder'))) {
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