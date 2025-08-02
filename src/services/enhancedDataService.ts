import { NewsArticle, FundingRound, Event, MarketMap } from "@/types/news";
import { 
  generateNewsArticles, 
  generateFundingRounds, 
  generateEvents, 
  generateMarketMaps,
  generateSectorContent,
  generateCompanyProfiles,
  generateTrendingTopics,
  generateSearchSuggestions,
  contentGenerator
} from "./contentGenerator";

// Enhanced data service with dynamic content generation
class EnhancedDataService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return (Date.now() - cached.timestamp) < this.CACHE_DURATION;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  // Get news articles with dynamic generation
  async getNewsArticles(count: number = 10, category?: string): Promise<NewsArticle[]> {
    const cacheKey = `news-${count}-${category || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache<NewsArticle[]>(cacheKey) || [];
    }

    const articles = generateNewsArticles(count, category);
    this.setCache(cacheKey, articles);
    return articles;
  }

  // Get funding rounds with dynamic generation
  async getFundingRounds(count: number = 10, stage?: string): Promise<FundingRound[]> {
    const cacheKey = `funding-${count}-${stage || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache<FundingRound[]>(cacheKey) || [];
    }

    const funding = generateFundingRounds(count, stage);
    this.setCache(cacheKey, funding);
    return funding;
  }

  // Get events with dynamic generation
  async getEvents(count: number = 8): Promise<Event[]> {
    const cacheKey = `events-${count}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache<Event[]>(cacheKey) || [];
    }

    const events = generateEvents(count);
    this.setCache(cacheKey, events);
    return events;
  }

  // Get market maps with dynamic generation
  async getMarketMaps(count: number = 6): Promise<MarketMap[]> {
    const cacheKey = `marketmaps-${count}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache<MarketMap[]>(cacheKey) || [];
    }

    const marketMaps = generateMarketMaps(count);
    this.setCache(cacheKey, marketMaps);
    return marketMaps;
  }

  // Get sector-specific content
  async getSectorContent(sector: string, count: number = 10) {
    const cacheKey = `sector-${sector}-${count}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache(cacheKey) || {};
    }

    const content = generateSectorContent(sector, count);
    this.setCache(cacheKey, content);
    return content;
  }

  // Get company profiles
  async getCompanyProfiles(count: number = 10, sector?: string) {
    const cacheKey = `companies-${count}-${sector || 'all'}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache(cacheKey) || [];
    }

    const companies = generateCompanyProfiles(count, sector);
    this.setCache(cacheKey, companies);
    return companies;
  }

  // Get trending topics
  async getTrendingTopics(): Promise<string[]> {
    const cacheKey = 'trending-topics';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache<string[]>(cacheKey) || [];
    }

    const topics = generateTrendingTopics();
    this.setCache(cacheKey, topics);
    return topics;
  }

  // Get search suggestions
  async getSearchSuggestions(query: string = ""): Promise<string[]> {
    // Don't cache search suggestions as they're query-dependent
    return generateSearchSuggestions(query);
  }

  // Search functionality
  async searchContent(query: string, filters?: any) {
    const cacheKey = `search-${query}-${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache(cacheKey) || { articles: [], funding: [], companies: [] };
    }

    // Generate search results based on query
    const articles = generateNewsArticles(20).filter(article => 
      article.title.toLowerCase().includes(query.toLowerCase()) ||
      article.description.toLowerCase().includes(query.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
    );

    const funding = generateFundingRounds(15).filter(round => 
      round.companyName.toLowerCase().includes(query.toLowerCase()) ||
      round.sector.toLowerCase().includes(query.toLowerCase()) ||
      round.investors.some(investor => investor.toLowerCase().includes(query.toLowerCase()))
    );

    const companies = generateCompanyProfiles(10).filter(company => 
      company.name.toLowerCase().includes(query.toLowerCase()) ||
      company.sector.toLowerCase().includes(query.toLowerCase()) ||
      company.description.toLowerCase().includes(query.toLowerCase())
    );

    const results = { articles, funding, companies };
    this.setCache(cacheKey, results);
    return results;
  }

  // Get content for specific pages
  async getPageContent(page: string, params?: any) {
    const cacheKey = `page-${page}-${JSON.stringify(params)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache(cacheKey) || {};
    }

    let content = {};

    switch (page) {
      case 'home':
        content = {
          featuredArticles: await this.getNewsArticles(5, 'Funding'),
          recentFunding: await this.getFundingRounds(8),
          upcomingEvents: await this.getEvents(4),
          marketMaps: await this.getMarketMaps(3),
          trendingTopics: await this.getTrendingTopics()
        };
        break;

      case 'startups':
        content = {
          latestNews: await this.getNewsArticles(15, 'Product Launch'),
          upcomingStartups: await this.getCompanyProfiles(12, 'AI & ML'),
          founderStories: await this.getNewsArticles(8, 'Leadership'),
          exitStories: await this.getNewsArticles(6, 'Acquisition'),
          failures: await this.getNewsArticles(5, 'Shutdown')
        };
        break;

      case 'funding':
        content = {
          recentRounds: await this.getFundingRounds(20),
          bigStories: await this.getFundingRounds(10).then(rounds => 
            rounds.filter(r => parseFloat(r.amount.replace(/[^0-9.]/g, '')) > 50)
          ),
          vcInsights: await this.getNewsArticles(10, 'Market Analysis'),
          angelDeals: await this.getFundingRounds(15, 'Seed')
        };
        break;

      case 'technology':
        content = {
          techStacks: await this.getSectorContent('SaaS', 12),
          emergingTech: await this.getSectorContent('AI & ML', 15),
          growthHacking: await this.getNewsArticles(10, 'Growth'),
          aiMl: await this.getSectorContent('AI & ML', 20)
        };
        break;

      case 'explore':
        content = {
          founderSpotlights: await this.getNewsArticles(12, 'Leadership'),
          caseStudies: await this.getNewsArticles(8, 'Research'),
          growthStrategies: await this.getNewsArticles(10, 'Growth'),
          marketMaps: await this.getMarketMaps(6)
        };
        break;

      case 'events':
        content = {
          upcomingEvents: await this.getEvents(15),
          pastEvents: generateEvents(10).map(event => ({
            ...event,
            date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
          })),
          conferences: await this.getEvents(8),
          demodays: await this.getEvents(6)
        };
        break;

      case 'newsletter':
        content = {
          recentIssues: await this.getNewsArticles(20),
          popularTopics: await this.getTrendingTopics(),
          subscriberStats: {
            totalSubscribers: Math.floor(Math.random() * 50000) + 10000,
            weeklyGrowth: Math.floor(Math.random() * 1000) + 100,
            openRate: Math.floor(Math.random() * 30) + 40
          }
        };
        break;

      default:
        content = {
          articles: await this.getNewsArticles(10),
          funding: await this.getFundingRounds(5),
          events: await this.getEvents(3)
        };
    }

    this.setCache(cacheKey, content);
    return content;
  }

  // Get analytics data for charts
  async getAnalyticsData() {
    const cacheKey = 'analytics-data';
    
    if (this.isCacheValid(cacheKey)) {
      return this.getFromCache(cacheKey) || {};
    }

    const funding = await this.getFundingRounds(100);
    const articles = await this.getNewsArticles(50);
    
    const analytics = {
      fundingTrends: funding,
      sectorDistribution: this.calculateSectorDistribution(funding),
      regionalData: this.calculateRegionalData(funding),
      monthlyTrends: this.calculateMonthlyTrends(funding),
      topInvestors: this.getTopInvestors(funding),
      articleCategories: this.getArticleCategories(articles)
    };

    this.setCache(cacheKey, analytics);
    return analytics;
  }

  // Helper methods for analytics
  private calculateSectorDistribution(funding: FundingRound[]) {
    const distribution: { [key: string]: number } = {};
    funding.forEach(round => {
      distribution[round.sector] = (distribution[round.sector] || 0) + 1;
    });
    return Object.entries(distribution).map(([sector, count]) => ({ sector, count }));
  }

  private calculateRegionalData(funding: FundingRound[]) {
    const regional: { [key: string]: number } = {};
    funding.forEach(round => {
      regional[round.region] = (regional[round.region] || 0) + 1;
    });
    return Object.entries(regional).map(([region, count]) => ({ region, count }));
  }

  private calculateMonthlyTrends(funding: FundingRound[]) {
    const monthly: { [key: string]: { count: number; amount: number } } = {};
    
    funding.forEach(round => {
      const month = new Date(round.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      const amount = parseFloat(round.amount.replace(/[^0-9.]/g, '')) || 0;
      
      if (!monthly[month]) {
        monthly[month] = { count: 0, amount: 0 };
      }
      monthly[month].count += 1;
      monthly[month].amount += amount;
    });

    return Object.entries(monthly).map(([month, data]) => ({ month, ...data }));
  }

  private getTopInvestors(funding: FundingRound[]) {
    const investors: { [key: string]: number } = {};
    funding.forEach(round => {
      round.investors.forEach(investor => {
        investors[investor] = (investors[investor] || 0) + 1;
      });
    });
    
    return Object.entries(investors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([investor, count]) => ({ investor, count }));
  }

  private getArticleCategories(articles: NewsArticle[]) {
    const categories: { [key: string]: number } = {};
    articles.forEach(article => {
      if (article.category) {
        categories[article.category] = (categories[article.category] || 0) + 1;
      }
    });
    return Object.entries(categories).map(([category, count]) => ({ category, count }));
  }

  // Clear cache
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Force refresh content
  async refreshContent() {
    this.clearCache();
    // Pre-generate common content
    await Promise.all([
      this.getNewsArticles(20),
      this.getFundingRounds(15),
      this.getEvents(10),
      this.getMarketMaps(6),
      this.getTrendingTopics()
    ]);
  }
}

// Export singleton instance
export const enhancedDataService = new EnhancedDataService();

// Export convenience functions that match the existing API
export const getNewsArticles = (count?: number) => enhancedDataService.getNewsArticles(count);
export const getFundingRounds = (count?: number) => enhancedDataService.getFundingRounds(count);
export const getEvents = (count?: number) => enhancedDataService.getEvents(count);
export const getMarketMaps = (count?: number) => enhancedDataService.getMarketMaps(count);

// Export new enhanced functions
export const getSectorContent = (sector: string, count?: number) => enhancedDataService.getSectorContent(sector, count);
export const getCompanyProfiles = (count?: number, sector?: string) => enhancedDataService.getCompanyProfiles(count, sector);
export const getTrendingTopics = () => enhancedDataService.getTrendingTopics();
export const getSearchSuggestions = (query?: string) => enhancedDataService.getSearchSuggestions(query);
export const searchContent = (query: string, filters?: any) => enhancedDataService.searchContent(query, filters);
export const getPageContent = (page: string, params?: any) => enhancedDataService.getPageContent(page, params);
export const getAnalyticsData = () => enhancedDataService.getAnalyticsData();

export default enhancedDataService;