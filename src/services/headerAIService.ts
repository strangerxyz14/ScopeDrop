import { supabase } from '@/services/enhancedCacheManager';

export interface AISearchInsight {
  id: string;
  query: string;
  category: string;
  confidence: number;
  relatedTopics: string[];
  suggestedFilters: string[];
  marketTrend: 'rising' | 'falling' | 'stable';
  timestamp: Date;
}

export interface AINavigationSuggestion {
  id: string;
  path: string;
  reason: string;
  confidence: number;
  userBehavior: string[];
  marketContext: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIContentCategorization {
  id: string;
  content: string;
  category: string;
  subcategory: string;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  aiConfidence: number;
}

export class HeaderAIService {
  private static instance: HeaderAIService;
  private insightsCache: Map<string, AISearchInsight> = new Map();
  private navigationCache: Map<string, AINavigationSuggestion[]> = new Map();

  static getInstance(): HeaderAIService {
    if (!HeaderAIService.instance) {
      HeaderAIService.instance = new HeaderAIService();
    }
    return HeaderAIService.instance;
  }

  // Generate AI-powered search insights
  async generateSearchInsights(query: string): Promise<AISearchInsight> {
    const cacheKey = `insight_${query.toLowerCase()}`;
    if (this.insightsCache.has(cacheKey)) {
      return this.insightsCache.get(cacheKey)!;
    }

    try {
      // Analyze query using local AI processing
      const insight = await this.analyzeQuery(query);
      
      // Store in Supabase for learning
      await this.storeSearchInsight(insight);
      
      // Cache the result
      this.insightsCache.set(cacheKey, insight);
      
      return insight;
    } catch (error) {
      console.error('Error generating search insights:', error);
      return this.getFallbackInsight(query);
    }
  }

  // Generate AI-powered navigation suggestions
  async generateNavigationSuggestions(userId?: string): Promise<AINavigationSuggestion[]> {
    try {
      // Get user behavior from Supabase
      const userBehavior = await this.getUserBehavior(userId);
      
      // Get market context
      const marketContext = await this.getMarketContext();
      
      // Generate suggestions based on behavior and context
      const suggestions = await this.analyzeNavigationPatterns(userBehavior, marketContext);
      
      return suggestions;
    } catch (error) {
      console.error('Error generating navigation suggestions:', error);
      return this.getFallbackNavigationSuggestions();
    }
  }

  // Categorize content using AI
  async categorizeContent(content: string): Promise<AIContentCategorization> {
    try {
      // Use local AI processing for categorization
      const categorization = await this.performContentCategorization(content);
      
      // Store categorization in Supabase
      await this.storeContentCategorization(categorization);
      
      return categorization;
    } catch (error) {
      console.error('Error categorizing content:', error);
      return this.getFallbackCategorization(content);
    }
  }

  // Analyze search query using local AI
  private async analyzeQuery(query: string): Promise<AISearchInsight> {
    const queryLower = query.toLowerCase();
    
    // Determine category based on keywords
    let category = 'general';
    let confidence = 0.5;
    let marketTrend: 'rising' | 'falling' | 'stable' = 'stable';
    
    if (queryLower.includes('funding') || queryLower.includes('series') || queryLower.includes('investment')) {
      category = 'funding';
      confidence = 0.9;
      marketTrend = 'rising';
    } else if (queryLower.includes('ai') || queryLower.includes('artificial intelligence') || queryLower.includes('machine learning')) {
      category = 'ai';
      confidence = 0.9;
      marketTrend = 'rising';
    } else if (queryLower.includes('acquisition') || queryLower.includes('merger') || queryLower.includes('exit')) {
      category = 'acquisitions';
      confidence = 0.8;
      marketTrend = 'stable';
    } else if (queryLower.includes('founder') || queryLower.includes('ceo') || queryLower.includes('startup')) {
      category = 'founders';
      confidence = 0.7;
      marketTrend = 'stable';
    } else if (queryLower.includes('tech') || queryLower.includes('stack') || queryLower.includes('technology')) {
      category = 'tech';
      confidence = 0.8;
      marketTrend = 'rising';
    }

    // Generate related topics
    const relatedTopics = this.generateRelatedTopics(query, category);
    
    // Generate suggested filters
    const suggestedFilters = this.generateSuggestedFilters(category);

    return {
      id: this.generateId(),
      query,
      category,
      confidence,
      relatedTopics,
      suggestedFilters,
      marketTrend,
      timestamp: new Date()
    };
  }

  // Analyze navigation patterns
  private async analyzeNavigationPatterns(userBehavior: any[], marketContext: any): Promise<AINavigationSuggestion[]> {
    const suggestions: AINavigationSuggestion[] = [];

    // Analyze user behavior patterns
    const recentPaths = userBehavior.map(b => b.path).slice(-5);
    const pathFrequency = this.calculatePathFrequency(recentPaths);

    // Generate suggestions based on patterns
    if (pathFrequency['/funding'] > 2) {
      suggestions.push({
        id: this.generateId(),
        path: '/funding',
        reason: 'High interest in funding news',
        confidence: 0.8,
        userBehavior: recentPaths,
        marketContext: marketContext.fundingTrend || 'stable',
        priority: 'high'
      });
    }

    if (pathFrequency['/ai-trends'] > 1) {
      suggestions.push({
        id: this.generateId(),
        path: '/ai-trends',
        reason: 'AI market momentum detected',
        confidence: 0.7,
        userBehavior: recentPaths,
        marketContext: marketContext.aiTrend || 'rising',
        priority: 'high'
      });
    }

    // Add market-driven suggestions
    if (marketContext.fundingTrend === 'rising') {
      suggestions.push({
        id: this.generateId(),
        path: '/funding',
        reason: 'Market shows increased funding activity',
        confidence: 0.6,
        userBehavior: recentPaths,
        marketContext: marketContext.fundingTrend,
        priority: 'medium'
      });
    }

    return suggestions;
  }

  // Perform content categorization
  private async performContentCategorization(content: string): Promise<AIContentCategorization> {
    const contentLower = content.toLowerCase();
    
    // Determine category and subcategory
    let category = 'general';
    let subcategory = 'news';
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let relevance = 0.5;
    let aiConfidence = 0.6;

    // Category detection
    if (contentLower.includes('funding') || contentLower.includes('series')) {
      category = 'funding';
      subcategory = 'rounds';
      relevance = 0.9;
      aiConfidence = 0.9;
    } else if (contentLower.includes('ai') || contentLower.includes('artificial intelligence')) {
      category = 'ai';
      subcategory = 'trends';
      relevance = 0.9;
      aiConfidence = 0.9;
    } else if (contentLower.includes('acquisition') || contentLower.includes('merger')) {
      category = 'acquisitions';
      subcategory = 'deals';
      relevance = 0.8;
      aiConfidence = 0.8;
    }

    // Sentiment analysis
    const positiveWords = ['success', 'growth', 'profit', 'raise', 'funding', 'innovation'];
    const negativeWords = ['failure', 'loss', 'decline', 'bankruptcy', 'layoff'];
    
    const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    // Generate tags
    const tags = this.extractTags(content);

    return {
      id: this.generateId(),
      content,
      category,
      subcategory,
      tags,
      sentiment,
      relevance,
      aiConfidence
    };
  }

  // Get user behavior from Supabase
  private async getUserBehavior(userId?: string): Promise<any[]> {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from('content_analytics')
        .select('*')
        .eq('session_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching user behavior:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserBehavior:', error);
      return [];
    }
  }

  // Get market context from Supabase
  private async getMarketContext(): Promise<any> {
    try {
      const { data: fundingTrend, error: fundingError } = await supabase
        .from('news_articles')
        .select('category, published_at')
        .eq('category', 'Funding')
        .gte('published_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      const { data: aiTrend, error: aiError } = await supabase
        .from('trending_topics')
        .select('momentum')
        .eq('category', 'AI')
        .limit(5);

      return {
        fundingTrend: fundingTrend && fundingTrend.length > 5 ? 'rising' : 'stable',
        aiTrend: aiTrend && aiTrend.some(t => t.momentum > 0.7) ? 'rising' : 'stable'
      };
    } catch (error) {
      console.error('Error getting market context:', error);
      return { fundingTrend: 'stable', aiTrend: 'stable' };
    }
  }

  // Store search insight in Supabase
  private async storeSearchInsight(insight: AISearchInsight): Promise<void> {
    try {
      await supabase
        .from('content_analytics')
        .insert({
          content_type: 'ai_insight',
          query: insight.query,
          category: insight.category,
          confidence: insight.confidence,
          market_trend: insight.marketTrend,
          created_at: insight.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Error storing search insight:', error);
    }
  }

  // Store content categorization in Supabase
  private async storeContentCategorization(categorization: AIContentCategorization): Promise<void> {
    try {
      await supabase
        .from('content_analytics')
        .insert({
          content_type: 'ai_categorization',
          category: categorization.category,
          subcategory: categorization.subcategory,
          sentiment: categorization.sentiment,
          relevance: categorization.relevance,
          ai_confidence: categorization.aiConfidence,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error storing content categorization:', error);
    }
  }

  // Helper methods
  private generateRelatedTopics(query: string, category: string): string[] {
    const topics: Record<string, string[]> = {
      funding: ['Series A', 'Venture Capital', 'Investment Rounds', 'Startup Funding'],
      ai: ['Machine Learning', 'Artificial Intelligence', 'AI Tools', 'Tech Innovation'],
      acquisitions: ['Mergers', 'Exits', 'Company Sales', 'Strategic Deals'],
      founders: ['CEO Stories', 'Startup Founders', 'Leadership', 'Entrepreneurship'],
      tech: ['Technology Stack', 'Software', 'Development', 'Innovation']
    };

    return topics[category] || ['Startup News', 'Tech Trends', 'Innovation'];
  }

  private generateSuggestedFilters(category: string): string[] {
    const filters: Record<string, string[]> = {
      funding: ['Series A', 'Series B', 'Seed', 'IPO'],
      ai: ['Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision'],
      acquisitions: ['Recent', 'Large Deals', 'Strategic', 'Financial'],
      founders: ['Interviews', 'Success Stories', 'Lessons Learned'],
      tech: ['Frontend', 'Backend', 'Mobile', 'Cloud']
    };

    return filters[category] || ['Recent', 'Popular', 'Trending'];
  }

  private calculatePathFrequency(paths: string[]): Record<string, number> {
    return paths.reduce((acc, path) => {
      acc[path] = (acc[path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private extractTags(content: string): string[] {
    const commonTags = ['startup', 'tech', 'funding', 'ai', 'innovation', 'business'];
    const contentLower = content.toLowerCase();
    
    return commonTags.filter(tag => contentLower.includes(tag));
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  // Fallback methods
  private getFallbackInsight(query: string): AISearchInsight {
    return {
      id: this.generateId(),
      query,
      category: 'general',
      confidence: 0.5,
      relatedTopics: ['Startup News', 'Tech Trends'],
      suggestedFilters: ['Recent', 'Popular'],
      marketTrend: 'stable',
      timestamp: new Date()
    };
  }

  private getFallbackNavigationSuggestions(): AINavigationSuggestion[] {
    return [
      {
        id: this.generateId(),
        path: '/funding',
        reason: 'Popular section',
        confidence: 0.6,
        userBehavior: [],
        marketContext: 'stable',
        priority: 'medium'
      },
      {
        id: this.generateId(),
        path: '/ai-trends',
        reason: 'Trending topic',
        confidence: 0.5,
        userBehavior: [],
        marketContext: 'rising',
        priority: 'medium'
      }
    ];
  }

  private getFallbackCategorization(content: string): AIContentCategorization {
    return {
      id: this.generateId(),
      content,
      category: 'general',
      subcategory: 'news',
      tags: ['startup', 'tech'],
      sentiment: 'neutral',
      relevance: 0.5,
      aiConfidence: 0.5
    };
  }
}

export const headerAIService = HeaderAIService.getInstance();