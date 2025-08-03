import { NewsArticle, FundingRound, Event } from "@/types/news";

// FREE API ENDPOINTS - NO API KEYS NEEDED
const FREE_APIS = {
  // Reddit API - Completely free, no auth required for public data
  reddit: 'https://www.reddit.com/r/startups.json',
  hackerNews: 'https://hacker-news.firebaseio.com/v0',
  github: 'https://api.github.com',
  // RSS feeds - No API keys needed
  techcrunch: 'https://techcrunch.com/feed/',
  venturebeat: 'https://venturebeat.com/feed/',
  // Public startup databases
  startupBlink: 'https://www.startupblink.com/api',
  // Free events APIs
  meetup: 'https://api.meetup.com',
  eventbrite: 'https://www.eventbriteapi.com/v3'
};

// Rate limiting for free APIs
class FreeAPIRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  canMakeRequest(apiName: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(apiName) || [];
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= limit) return false;
    
    validRequests.push(now);
    this.requests.set(apiName, validRequests);
    return true;
  }
}

const rateLimiter = new FreeAPIRateLimiter();

export class FreeNewsService {
  
  // 1. REDDIT API - Completely free, no auth required
  async getRedditStartupNews(): Promise<NewsArticle[]> {
    if (!rateLimiter.canMakeRequest('reddit', 60, 60 * 1000)) {
      throw new Error('Reddit rate limit exceeded');
    }

    const subreddits = [
      'startups',
      'entrepreneur', 
      'venturecapital',
      'TechCrunch',
      'SaaS',
      'artificial',
      'MachineLearning',
      'webdev'
    ];

    const articles: NewsArticle[] = [];
    
    for (const subreddit of subreddits.slice(0, 3)) { // Limit to 3 to stay within rate limits
      try {
        const response = await fetch(`https://www.reddit.com/r/${subreddit}/hot.json?limit=10`);
        const data = await response.json();
        
        const redditPosts = data.data?.children?.map((post: any) => {
          const postData = post.data;
          return {
            id: `reddit-${postData.id}`,
            title: postData.title,
            description: postData.selftext?.substring(0, 200) || postData.title,
            content: postData.selftext || postData.title,
            url: `https://reddit.com${postData.permalink}`,
            image: postData.thumbnail !== 'self' ? postData.thumbnail : undefined,
            publishedAt: new Date(postData.created_utc * 1000).toISOString(),
            source: {
              name: `r/${subreddit}`,
              url: `https://reddit.com/r/${subreddit}`
            },
            category: this.categorizeRedditPost(postData.title, postData.selftext, subreddit),
            tags: this.extractTags(postData.title + ' ' + (postData.selftext || '')),
            processedByAI: false
          };
        }) || [];
        
        articles.push(...redditPosts);
      } catch (error) {
        console.error(`Reddit API error for r/${subreddit}:`, error);
      }
    }
    
    return articles.slice(0, 20); // Return top 20 articles
  }

  // 2. HACKER NEWS API - Completely free
  async getHackerNewsContent(): Promise<NewsArticle[]> {
    if (!rateLimiter.canMakeRequest('hackernews', 30, 60 * 1000)) {
      throw new Error('HackerNews rate limit exceeded');
    }

    try {
      // Get top stories IDs
      const response = await fetch(`${FREE_APIS.hackerNews}/topstories.json`);
      const storyIds = await response.json();
      
      // Get first 20 stories
      const stories = await Promise.all(
        storyIds.slice(0, 20).map(async (id: number) => {
          const storyResponse = await fetch(`${FREE_APIS.hackerNews}/item/${id}.json`);
          return storyResponse.json();
        })
      );
      
      return stories
        .filter((story: any) => story && story.title && !story.deleted)
        .map((story: any) => ({
          id: `hn-${story.id}`,
          title: story.title,
          description: story.title,
          content: story.title,
          url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
          image: undefined,
          publishedAt: new Date(story.time * 1000).toISOString(),
          source: {
            name: 'Hacker News',
            url: 'https://news.ycombinator.com'
          },
          category: this.categorizeHNPost(story.title),
          tags: this.extractTags(story.title),
          processedByAI: false
        }));
    } catch (error) {
      console.error('HackerNews API error:', error);
      return [];
    }
  }

  // 3. GITHUB TRENDING - Completely free
  async getGitHubTrending(): Promise<NewsArticle[]> {
    if (!rateLimiter.canMakeRequest('github', 30, 60 * 1000)) {
      throw new Error('GitHub rate limit exceeded');
    }

    try {
      const response = await fetch('https://api.github.com/search/repositories?q=created:>2024-01-01+language:javascript+language:python+language:typescript&sort=stars&order=desc&per_page=20');
      const data = await response.json();
      
      return data.items?.map((repo: any) => ({
        id: `github-${repo.id}`,
        title: `${repo.name} - ${repo.description || 'Open source project'}`,
        description: repo.description || 'Trending open source project',
        content: repo.description || 'A popular open source project on GitHub',
        url: repo.html_url,
        image: undefined,
        publishedAt: repo.created_at,
        source: {
          name: 'GitHub Trending',
          url: 'https://github.com/trending'
        },
        category: 'Open Source',
        tags: [repo.language, 'trending', 'github'].filter(Boolean),
        processedByAI: false
      })) || [];
    } catch (error) {
      console.error('GitHub API error:', error);
      return [];
    }
  }

  // 4. RSS FEEDS - Completely free
  async getRSSContent(): Promise<NewsArticle[]> {
    const rssFeeds = [
      'https://techcrunch.com/feed/',
      'https://venturebeat.com/feed/',
      'https://www.theverge.com/rss/index.xml',
      'https://www.wired.com/feed/rss'
    ];

    const articles: NewsArticle[] = [];
    
    for (const feedUrl of rssFeeds.slice(0, 2)) { // Limit to 2 feeds to stay within rate limits
      try {
        // Use a CORS proxy for RSS feeds
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(proxyUrl);
        const data = await response.json();
        
        if (data.contents) {
          const parser = new DOMParser();
          const xml = parser.parseFromString(data.contents, 'text/xml');
          const items = xml.querySelectorAll('item');
          
          items.forEach((item, index) => {
            const title = item.querySelector('title')?.textContent || '';
            const description = item.querySelector('description')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            
            articles.push({
              id: `rss-${Date.now()}-${index}`,
              title,
              description: description.substring(0, 200),
              content: description,
              url: link,
              image: undefined,
              publishedAt: new Date(pubDate).toISOString(),
              source: {
                name: this.extractSourceName(feedUrl),
                url: feedUrl
              },
              category: this.categorizeRSSPost(title, description),
              tags: this.extractTags(title + ' ' + description),
              processedByAI: false
            });
          });
        }
      } catch (error) {
        console.error(`RSS feed error for ${feedUrl}:`, error);
      }
    }
    
    return articles.slice(0, 15);
  }

  // 5. MEETUP EVENTS - Free API
  async getMeetupEvents(): Promise<Event[]> {
    if (!rateLimiter.canMakeRequest('meetup', 20, 60 * 1000)) {
      throw new Error('Meetup rate limit exceeded');
    }

    try {
      const cities = ['san-francisco', 'new-york', 'london', 'berlin', 'toronto'];
      const events: Event[] = [];
      
      for (const city of cities.slice(0, 2)) { // Limit to 2 cities
        const response = await fetch(`https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=20`);
        const data = await response.json();
        
        const meetupEvents = data.events?.map((event: any) => ({
          id: `meetup-${event.id}`,
          name: event.name,
          organizer: event.group?.name || 'Meetup',
          date: new Date(event.time).toISOString(),
          location: `${event.venue?.city || 'Online'}, ${event.venue?.country || ''}`,
          type: 'Conference' as const,
          url: event.link,
          description: event.description?.substring(0, 200) || event.name,
          imageUrl: event.group?.photo?.photo_link
        })) || [];
        
        events.push(...meetupEvents);
      }
      
      return events.slice(0, 10);
    } catch (error) {
      console.error('Meetup API error:', error);
      return [];
    }
  }

  // Helper methods
  private categorizeRedditPost(title: string, content: string, subreddit: string): string {
    const text = (title + ' ' + content).toLowerCase();
    
    if (text.includes('funding') || text.includes('series') || text.includes('raise')) return 'Funding';
    if (text.includes('acquisition') || text.includes('acquire') || text.includes('buy')) return 'Acquisition';
    if (text.includes('launch') || text.includes('release') || text.includes('product')) return 'Product Launch';
    if (text.includes('ai') || text.includes('machine learning') || text.includes('artificial intelligence')) return 'AI & Tech';
    if (text.includes('startup') || text.includes('entrepreneur')) return 'Startup News';
    
    return 'General';
  }

  private categorizeHNPost(title: string): string {
    const text = title.toLowerCase();
    
    if (text.includes('funding') || text.includes('series')) return 'Funding';
    if (text.includes('ai') || text.includes('machine learning')) return 'AI & Tech';
    if (text.includes('startup') || text.includes('ycombinator')) return 'Startup News';
    if (text.includes('open source') || text.includes('github')) return 'Open Source';
    
    return 'Tech News';
  }

  private categorizeRSSPost(title: string, description: string): string {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('funding') || text.includes('series')) return 'Funding';
    if (text.includes('acquisition') || text.includes('merger')) return 'Acquisition';
    if (text.includes('ai') || text.includes('artificial intelligence')) return 'AI & Tech';
    if (text.includes('startup') || text.includes('venture')) return 'Startup News';
    
    return 'Tech News';
  }

  private extractTags(text: string): string[] {
    const tags = new Set<string>();
    const words = text.toLowerCase().split(/\s+/);
    
    const tagKeywords = [
      'startup', 'funding', 'ai', 'tech', 'venture', 'capital', 'series', 'acquisition',
      'launch', 'product', 'innovation', 'entrepreneur', 'investor', 'round', 'ipo'
    ];
    
    words.forEach(word => {
      if (tagKeywords.includes(word)) {
        tags.add(word);
      }
    });
    
    return Array.from(tags).slice(0, 5);
  }

  private extractSourceName(feedUrl: string): string {
    if (feedUrl.includes('techcrunch')) return 'TechCrunch';
    if (feedUrl.includes('venturebeat')) return 'VentureBeat';
    if (feedUrl.includes('theverge')) return 'The Verge';
    if (feedUrl.includes('wired')) return 'Wired';
    return 'RSS Feed';
  }
}

// Export singleton instance
export const freeNewsService = new FreeNewsService();