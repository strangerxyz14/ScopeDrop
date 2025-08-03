import { BaseApiService } from './BaseApiService';
import { CONFIG, getApiKey } from '@/config';
import { NewsArticle, ApiResponse, AppError } from '@/types';

interface GNewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

interface GNewsSearchParams {
  q?: string;
  lang?: string;
  country?: string;
  category?: string;
  max?: number;
  from?: string;
  to?: string;
  sortby?: 'publishedAt' | 'relevance' | 'popularity';
}

export class GNewsService extends BaseApiService {
  private static instance: GNewsService;

  constructor() {
    super('GNews', {
      baseUrl: CONFIG.ENDPOINTS.GNEWS_BASE,
      timeout: 15000,
      retries: 3,
      rateLimit: {
        requests: CONFIG.IS_PRODUCTION ? 100 : 10,
        window: 60000, // 1 minute
      },
    });
  }

  static getInstance(): GNewsService {
    if (!GNewsService.instance) {
      GNewsService.instance = new GNewsService();
    }
    return GNewsService.instance;
  }

  protected getApiKey(): string | null {
    return getApiKey('GNEWS');
  }

  /**
   * Search for news articles
   */
  async searchArticles(params: GNewsSearchParams): Promise<NewsArticle[]> {
    try {
      this.logRequest('/search', params);

      const response = await this.get<GNewsResponse>('/search', {
        token: this.getApiKey(),
        ...params,
        max: Math.min(params.max || 10, 100), // GNews max is 100
      });

      this.logResponse(response.data, response.timestamp);

      return this.transformArticles(response.data.articles);
    } catch (error) {
      this.logError(error as AppError);
      throw this.handleGNewsError(error as AppError);
    }
  }

  /**
   * Get top headlines
   */
  async getTopHeadlines(params: {
    country?: string;
    category?: string;
    max?: number;
  } = {}): Promise<NewsArticle[]> {
    try {
      this.logRequest('/top-headlines', params);

      const response = await this.get<GNewsResponse>('/top-headlines', {
        token: this.getApiKey(),
        ...params,
        max: Math.min(params.max || 10, 100),
      });

      this.logResponse(response.data, response.timestamp);

      return this.transformArticles(response.data.articles);
    } catch (error) {
      this.logError(error as AppError);
      throw this.handleGNewsError(error as AppError);
    }
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(category: string, max: number = 10): Promise<NewsArticle[]> {
    return this.searchArticles({
      category,
      max,
      sortby: 'publishedAt',
    });
  }

  /**
   * Get trending articles
   */
  async getTrendingArticles(max: number = 10): Promise<NewsArticle[]> {
    return this.searchArticles({
      max,
      sortby: 'popularity',
    });
  }

  /**
   * Search for startup-related news
   */
  async getStartupNews(max: number = 20): Promise<NewsArticle[]> {
    const startupKeywords = [
      'startup',
      'funding',
      'venture capital',
      'series A',
      'series B',
      'IPO',
      'acquisition',
      'merger',
    ];

    const allArticles: NewsArticle[] = [];

    // Search for each keyword and combine results
    for (const keyword of startupKeywords.slice(0, 3)) { // Limit to avoid rate limits
      try {
        const articles = await this.searchArticles({
          q: keyword,
          max: Math.ceil(max / 3),
          sortby: 'publishedAt',
        });
        allArticles.push(...articles);
      } catch (error) {
        console.warn(`Failed to fetch articles for keyword "${keyword}":`, error);
      }
    }

    // Remove duplicates and sort by date
    const uniqueArticles = this.removeDuplicateArticles(allArticles);
    return uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, max);
  }

  /**
   * Search for AI-related news
   */
  async getAINews(max: number = 20): Promise<NewsArticle[]> {
    const aiKeywords = [
      'artificial intelligence',
      'AI',
      'machine learning',
      'ML',
      'deep learning',
      'neural networks',
      'chatgpt',
      'openai',
      'anthropic',
    ];

    const allArticles: NewsArticle[] = [];

    for (const keyword of aiKeywords.slice(0, 3)) {
      try {
        const articles = await this.searchArticles({
          q: keyword,
          max: Math.ceil(max / 3),
          sortby: 'publishedAt',
        });
        allArticles.push(...articles);
      } catch (error) {
        console.warn(`Failed to fetch articles for keyword "${keyword}":`, error);
      }
    }

    const uniqueArticles = this.removeDuplicateArticles(allArticles);
    return uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, max);
  }

  /**
   * Search for funding-related news
   */
  async getFundingNews(max: number = 20): Promise<NewsArticle[]> {
    const fundingKeywords = [
      'funding round',
      'series A',
      'series B',
      'series C',
      'venture capital',
      'investment',
      'startup funding',
      'unicorn',
    ];

    const allArticles: NewsArticle[] = [];

    for (const keyword of fundingKeywords.slice(0, 3)) {
      try {
        const articles = await this.searchArticles({
          q: keyword,
          max: Math.ceil(max / 3),
          sortby: 'publishedAt',
        });
        allArticles.push(...articles);
      } catch (error) {
        console.warn(`Failed to fetch articles for keyword "${keyword}":`, error);
      }
    }

    const uniqueArticles = this.removeDuplicateArticles(allArticles);
    return uniqueArticles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, max);
  }

  /**
   * Transform GNews articles to our NewsArticle format
   */
  private transformArticles(gnewsArticles: GNewsArticle[]): NewsArticle[] {
    return gnewsArticles.map((article, index) => ({
      id: `gnews_${Date.now()}_${index}`,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      imageUrl: article.image,
      publishedAt: new Date(article.publishedAt),
      sourceName: article.source.name,
      category: this.categorizeArticle(article.title, article.description),
      tags: this.extractTags(article.title, article.description),
      sentiment: this.analyzeSentiment(article.title, article.description),
      relevance: this.calculateRelevance(article.title, article.description),
    }));
  }

  /**
   * Categorize article based on content
   */
  private categorizeArticle(title: string, description: string): string {
    const content = `${title} ${description}`.toLowerCase();
    
    if (content.includes('funding') || content.includes('investment') || content.includes('series')) {
      return 'funding';
    }
    if (content.includes('ai') || content.includes('artificial intelligence') || content.includes('machine learning')) {
      return 'ai';
    }
    if (content.includes('acquisition') || content.includes('merger') || content.includes('ipo')) {
      return 'acquisition';
    }
    if (content.includes('founder') || content.includes('ceo') || content.includes('startup')) {
      return 'founder';
    }
    if (content.includes('tech') || content.includes('technology') || content.includes('software')) {
      return 'tech';
    }
    
    return 'general';
  }

  /**
   * Extract relevant tags from content
   */
  private extractTags(title: string, description: string): string[] {
    const content = `${title} ${description}`.toLowerCase();
    const tags: string[] = [];
    
    // Common startup/tech terms
    const tagPatterns = [
      'startup', 'funding', 'ai', 'artificial intelligence', 'machine learning',
      'venture capital', 'series a', 'series b', 'ipo', 'acquisition', 'merger',
      'tech', 'technology', 'software', 'saas', 'fintech', 'healthtech',
      'edtech', 'proptech', 'insurtech', 'biotech', 'cleantech',
    ];

    tagPatterns.forEach(tag => {
      if (content.includes(tag)) {
        tags.push(tag);
      }
    });

    return tags.slice(0, 5); // Limit to 5 tags
  }

  /**
   * Simple sentiment analysis
   */
  private analyzeSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
    const content = `${title} ${description}`.toLowerCase();
    
    const positiveWords = ['success', 'growth', 'profit', 'gain', 'rise', 'positive', 'up', 'high'];
    const negativeWords = ['loss', 'fail', 'down', 'drop', 'negative', 'decline', 'bankruptcy', 'layoff'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Calculate relevance score (0-1)
   */
  private calculateRelevance(title: string, description: string): number {
    const content = `${title} ${description}`.toLowerCase();
    let score = 0.5; // Base score
    
    // Boost for startup/tech keywords
    const relevantKeywords = [
      'startup', 'funding', 'ai', 'tech', 'venture', 'series', 'ipo',
      'acquisition', 'founder', 'ceo', 'investment', 'capital',
    ];
    
    const keywordMatches = relevantKeywords.filter(keyword => content.includes(keyword)).length;
    score += Math.min(keywordMatches * 0.1, 0.4); // Max 0.4 boost
    
    // Boost for recent articles
    const now = new Date();
    const publishedAt = new Date(); // This would be the actual published date
    const daysDiff = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 0.2 - (daysDiff * 0.02)); // Recent articles get higher score
    
    return Math.min(score, 1);
  }

  /**
   * Remove duplicate articles based on URL
   */
  private removeDuplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      if (seen.has(article.url)) {
        return false;
      }
      seen.add(article.url);
      return true;
    });
  }

  /**
   * Handle GNews-specific errors
   */
  private handleGNewsError(error: AppError): AppError {
    // Add GNews-specific error handling
    if (error.message.includes('API key')) {
      return {
        ...error,
        message: 'GNews API key is invalid or missing. Please check your configuration.',
      };
    }
    
    if (error.message.includes('Rate limit')) {
      return {
        ...error,
        message: 'GNews API rate limit exceeded. Please try again later.',
      };
    }
    
    return error;
  }
}

// Export singleton instance
export const gnewsService = GNewsService.getInstance();