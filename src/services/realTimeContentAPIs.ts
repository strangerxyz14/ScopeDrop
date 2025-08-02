import { NewsArticle, FundingRound, Event } from "@/types/news";

// API Configuration
const API_KEYS = {
  newsapi: process.env.VITE_NEWSAPI_KEY || 'your_newsapi_key',
  alphavantage: process.env.VITE_ALPHAVANTAGE_KEY || 'your_alphavantage_key',
  crunchbase: process.env.VITE_CRUNCHBASE_KEY || 'your_crunchbase_key',
  eventbrite: process.env.VITE_EVENTBRITE_TOKEN || 'your_eventbrite_token',
  github: process.env.VITE_GITHUB_TOKEN || 'your_github_token',
  producthunt: process.env.VITE_PRODUCTHUNT_TOKEN || 'your_producthunt_token'
};

// Rate limiting helper
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(apiName: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(apiName) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(apiName, validRequests);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// 1. NEWS CONTENT APIS
export class NewsContentService {
  
  // NewsAPI - 1000 requests/day free
  async getStartupNews(): Promise<NewsArticle[]> {
    if (!rateLimiter.canMakeRequest('newsapi', 100, 24 * 60 * 60 * 1000)) {
      throw new Error('NewsAPI rate limit exceeded');
    }

    const queries = [
      'startup funding',
      'venture capital',
      'tech startup',
      'series A funding',
      'IPO startup',
      'startup acquisition'
    ];
    
    const query = queries[Math.floor(Math.random() * queries.length)];
    
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${API_KEYS.newsapi}`
      );
      
      if (!response.ok) throw new Error('NewsAPI request failed');
      
      const data = await response.json();
      
      return data.articles?.map((article: any, index: number) => ({
        id: `news-${Date.now()}-${index}`,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        source: {
          name: article.source.name,
          url: article.url
        },
        category: this.categorizeArticle(article.title + ' ' + article.description),
        tags: this.extractTags(article.title + ' ' + article.description),
        processedByAI: false
      })) || [];
    } catch (error) {
      console.error('NewsAPI error:', error);
      return [];
    }
  }

  // Reddit API - Completely free
  async getRedditStartupContent(): Promise<NewsArticle[]> {
    const subreddits = [
      'startups',
      'entrepreneur',
      'venturecapital',
      'TechCrunch',
      'SaaS',
      'artificial'
    ];
    
    const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    try {
      const response = await fetch(
        `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`
      );
      
      if (!response.ok) throw new Error('Reddit API request failed');
      
      const data = await response.json();
      
      return data.data.children
        .filter((post: any) => !post.data.is_self && post.data.url && post.data.title)
        .map((post: any, index: number) => ({
          id: `reddit-${Date.now()}-${index}`,
          title: post.data.title,
          description: post.data.selftext || `Discussion from r/${subreddit}`,
          url: post.data.url,
          image: post.data.thumbnail !== 'self' ? post.data.thumbnail : undefined,
          publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
          source: {
            name: `r/${subreddit}`,
            url: `https://reddit.com${post.data.permalink}`
          },
          category: 'Discussion',
          tags: [subreddit, 'reddit', 'community'],
          processedByAI: false
        }));
    } catch (error) {
      console.error('Reddit API error:', error);
      return [];
    }
  }

  // Hacker News API - Completely free
  async getHackerNewsContent(): Promise<NewsArticle[]> {
    try {
      // Get top stories
      const topStoriesResponse = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const topStories = await topStoriesResponse.json();
      
      // Get first 20 stories
      const storyPromises = topStories.slice(0, 20).map(async (id: number) => {
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return storyResponse.json();
      });
      
      const stories = await Promise.all(storyPromises);
      
      return stories
        .filter(story => story && story.url && story.title)
        .map((story, index) => ({
          id: `hn-${story.id}`,
          title: story.title,
          description: story.text || `Hacker News discussion with ${story.descendants || 0} comments`,
          url: story.url,
          publishedAt: new Date(story.time * 1000).toISOString(),
          source: {
            name: 'Hacker News',
            url: `https://news.ycombinator.com/item?id=${story.id}`
          },
          category: 'Technology',
          tags: ['hackernews', 'tech', 'startup'],
          processedByAI: false
        }));
    } catch (error) {
      console.error('Hacker News API error:', error);
      return [];
    }
  }

  private categorizeArticle(text: string): string {
    const categories = {
      'Funding': ['funding', 'investment', 'raised', 'series', 'venture', 'capital'],
      'Acquisition': ['acquired', 'acquisition', 'bought', 'merger', 'deal'],
      'Product Launch': ['launch', 'released', 'unveiled', 'announced', 'debut'],
      'IPO': ['ipo', 'public', 'nasdaq', 'stock'],
      'Partnership': ['partnership', 'collaborate', 'alliance', 'joint']
    };
    
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return 'News';
  }

  private extractTags(text: string): string[] {
    const commonTags = ['startup', 'technology', 'business', 'innovation'];
    const sectors = ['AI', 'SaaS', 'fintech', 'healthtech', 'edtech'];
    
    const lowerText = text.toLowerCase();
    const tags = [...commonTags];
    
    sectors.forEach(sector => {
      if (lowerText.includes(sector.toLowerCase())) {
        tags.push(sector);
      }
    });
    
    return tags;
  }
}

// 2. FUNDING & COMPANY DATA APIS
export class FundingDataService {
  
  // Alpha Vantage - 500 requests/day free
  async getMarketData(): Promise<any[]> {
    if (!rateLimiter.canMakeRequest('alphavantage', 5, 60 * 1000)) {
      throw new Error('Alpha Vantage rate limit exceeded');
    }

    try {
      const response = await fetch(
        `https://www.alphavantage.co/query?function=MARKET_STATUS&apikey=${API_KEYS.alphavantage}`
      );
      
      const data = await response.json();
      return data.markets || [];
    } catch (error) {
      console.error('Alpha Vantage error:', error);
      return [];
    }
  }

  // GitHub API - 5000 requests/hour free (authenticated)
  async getTrendingRepos(): Promise<any[]> {
    try {
      const headers: HeadersInit = {};
      if (API_KEYS.github) {
        headers['Authorization'] = `token ${API_KEYS.github}`;
      }
      
      const response = await fetch(
        'https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=30',
        { headers }
      );
      
      if (!response.ok) throw new Error('GitHub API request failed');
      
      const data = await response.json();
      
      return data.items?.map((repo: any) => ({
        id: `github-${repo.id}`,
        name: repo.name,
        description: repo.description,
        stars: repo.stargazers_count,
        language: repo.language,
        url: repo.html_url,
        createdAt: repo.created_at,
        updatedAt: repo.updated_at
      })) || [];
    } catch (error) {
      console.error('GitHub API error:', error);
      return [];
    }
  }

  // Product Hunt API - Free tier available
  async getProductHuntLaunches(): Promise<any[]> {
    if (!API_KEYS.producthunt) return [];
    
    try {
      const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEYS.producthunt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            query {
              posts(first: 20) {
                edges {
                  node {
                    id
                    name
                    tagline
                    description
                    url
                    votesCount
                    createdAt
                    featuredAt
                  }
                }
              }
            }
          `
        })
      });
      
      const data = await response.json();
      
      return data.data?.posts?.edges?.map((edge: any) => ({
        id: `ph-${edge.node.id}`,
        name: edge.node.name,
        description: edge.node.tagline,
        fullDescription: edge.node.description,
        url: edge.node.url,
        votes: edge.node.votesCount,
        createdAt: edge.node.createdAt,
        featuredAt: edge.node.featuredAt
      })) || [];
    } catch (error) {
      console.error('Product Hunt API error:', error);
      return [];
    }
  }
}

// 3. EVENTS API
export class EventsService {
  
  // Eventbrite API - Free tier available
  async getTechEvents(): Promise<Event[]> {
    if (!API_KEYS.eventbrite) return [];
    
    try {
      const response = await fetch(
        `https://www.eventbriteapi.com/v3/events/search/?q=startup&categories=102&sort_by=date&token=${API_KEYS.eventbrite}`
      );
      
      if (!response.ok) throw new Error('Eventbrite API request failed');
      
      const data = await response.json();
      
      return data.events?.map((event: any) => ({
        id: `eb-${event.id}`,
        name: event.name.text,
        description: event.description?.text || 'Tech event',
        date: event.start.utc,
        location: event.venue ? `${event.venue.name}, ${event.venue.address.city}` : 'Online',
        type: 'Conference' as const,
        url: event.url,
        organizer: event.organizer?.name || 'Eventbrite',
        imageUrl: event.logo?.url
      })) || [];
    } catch (error) {
      console.error('Eventbrite API error:', error);
      return [];
    }
  }

  // Meetup API alternative - Facebook Events (free)
  async getFacebookEvents(): Promise<Event[]> {
    // Note: Facebook Graph API requires app review for events
    // Alternative: Use web scraping or other event APIs
    return [];
  }
}

// 4. AI CONTENT ENHANCEMENT SERVICES
export class AIContentEnhancer {
  
  // Multiple free AI APIs
  private aiServices = [
    {
      name: 'huggingface',
      endpoint: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      headers: { 'Authorization': `Bearer ${process.env.VITE_HUGGINGFACE_TOKEN}` }
    },
    {
      name: 'cohere',
      endpoint: 'https://api.cohere.ai/v1/generate',
      headers: { 'Authorization': `Bearer ${process.env.VITE_COHERE_KEY}` }
    }
  ];

  async enhanceContent(rawContent: any, type: 'article' | 'summary' | 'analysis'): Promise<string> {
    const prompts = {
      article: `Transform this into a professional startup news article: ${JSON.stringify(rawContent)}`,
      summary: `Create a brief summary of this startup news: ${JSON.stringify(rawContent)}`,
      analysis: `Provide market analysis for this startup information: ${JSON.stringify(rawContent)}`
    };

    // Try Hugging Face first (free tier)
    try {
      const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VITE_HUGGINGFACE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompts[type],
          parameters: { max_length: 500, min_length: 100 }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data[0]?.summary_text || rawContent.title || '';
      }
    } catch (error) {
      console.error('Hugging Face API error:', error);
    }

    // Fallback to local enhancement
    return this.localContentEnhancement(rawContent, type);
  }

  private localContentEnhancement(content: any, type: string): string {
    const templates = {
      article: `${content.title || content.name} represents a significant development in the startup ecosystem. ${content.description || content.tagline || ''} This development highlights the ongoing innovation in the technology sector.`,
      summary: `${content.title || content.name}: ${content.description || content.tagline || 'New development in startup ecosystem'}`,
      analysis: `Market Analysis: ${content.title || content.name} shows promising indicators with ${content.votes || content.stars || 'strong'} community engagement.`
    };

    return templates[type as keyof typeof templates] || content.description || '';
  }
}

// 5. CONTENT AGGREGATION SERVICE
export class RealTimeContentAggregator {
  private newsService = new NewsContentService();
  private fundingService = new FundingDataService();
  private eventsService = new EventsService();
  private aiEnhancer = new AIContentEnhancer();

  async aggregateAllContent(): Promise<{
    articles: NewsArticle[];
    funding: any[];
    events: Event[];
    trending: any[];
  }> {
    try {
      const [
        newsApiArticles,
        redditContent,
        hackerNewsContent,
        githubRepos,
        productHuntLaunches,
        techEvents
      ] = await Promise.allSettled([
        this.newsService.getStartupNews(),
        this.newsService.getRedditStartupContent(),
        this.newsService.getHackerNewsContent(),
        this.fundingService.getTrendingRepos(),
        this.fundingService.getProductHuntLaunches(),
        this.eventsService.getTechEvents()
      ]);

      // Combine all articles
      const allArticles: NewsArticle[] = [
        ...(newsApiArticles.status === 'fulfilled' ? newsApiArticles.value : []),
        ...(redditContent.status === 'fulfilled' ? redditContent.value : []),
        ...(hackerNewsContent.status === 'fulfilled' ? hackerNewsContent.value : [])
      ];

      // Process trending repos and products as funding/company data
      const trendingData = [
        ...(githubRepos.status === 'fulfilled' ? githubRepos.value : []),
        ...(productHuntLaunches.status === 'fulfilled' ? productHuntLaunches.value : [])
      ];

      const events = techEvents.status === 'fulfilled' ? techEvents.value : [];

      return {
        articles: allArticles.slice(0, 50), // Limit to 50 articles
        funding: trendingData.slice(0, 30),
        events: events.slice(0, 20),
        trending: trendingData.slice(0, 10)
      };
    } catch (error) {
      console.error('Content aggregation error:', error);
      return {
        articles: [],
        funding: [],
        events: [],
        trending: []
      };
    }
  }

  // Enhanced content with AI processing
  async getEnhancedContent(): Promise<any> {
    const rawContent = await this.aggregateAllContent();

    // Enhance articles with AI
    const enhancedArticles = await Promise.all(
      rawContent.articles.slice(0, 10).map(async (article) => {
        try {
          const enhancedDescription = await this.aiEnhancer.enhanceContent(article, 'summary');
          return {
            ...article,
            description: enhancedDescription || article.description,
            processedByAI: true
          };
        } catch (error) {
          return article;
        }
      })
    );

    return {
      ...rawContent,
      articles: [...enhancedArticles, ...rawContent.articles.slice(10)]
    };
  }
}

// Export singleton instance
export const realTimeContentAggregator = new RealTimeContentAggregator();

export default {
  NewsContentService,
  FundingDataService,
  EventsService,
  AIContentEnhancer,
  RealTimeContentAggregator,
  realTimeContentAggregator
};