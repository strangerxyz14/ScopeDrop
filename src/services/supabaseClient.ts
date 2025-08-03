import { createClient } from '@supabase/supabase-js';
import { NewsArticle, FundingRound, Event } from '@/types/news';
import { freeNewsService } from './freeAPIs';
import { freeAIService } from './freeAIService';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kudoyccddmdilphlwann.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Enhanced data service using free APIs + Supabase
export class FreeSupabaseService {
  
  // 1. GET REAL NEWS ARTICLES (from free APIs + local AI processing)
  async getNewsArticles(count: number = 20): Promise<NewsArticle[]> {
    try {
      // First, try to get from database
      const { data: dbArticles, error: dbError } = await supabase
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(count);

      if (dbArticles && dbArticles.length >= count * 0.7) {
        // We have enough articles in DB, return them
        return this.mapDbToNewsArticles(dbArticles);
      }

      // If not enough articles, fetch from free APIs
      console.log('🔍 Fetching fresh content from free APIs...');
      
      const [redditArticles, hnArticles, rssArticles] = await Promise.all([
        freeNewsService.getRedditStartupNews(),
        freeNewsService.getHackerNewsContent(),
        freeNewsService.getRSSContent()
      ]);

      // Combine and enhance with local AI
      let allArticles = [...redditArticles, ...hnArticles, ...rssArticles];
      allArticles = await freeAIService.enhanceArticles(allArticles);
      allArticles = await freeAIService.filterAndRankContent(allArticles);

      // Store new articles in database
      const articlesToStore = allArticles.slice(0, count).map(article => ({
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        image_url: article.image,
        published_at: article.publishedAt,
        source_name: article.source?.name || 'Unknown',
        source_url: article.source?.url,
        category: article.category,
        tags: article.tags || [],
        sentiment: article.tags?.includes('positive') ? 'positive' : 
                   article.tags?.includes('negative') ? 'negative' : 'neutral',
        quality_score: article.qualityScore || 0,
        processed_by_ai: true
      }));

      // Insert new articles (ignore duplicates)
      const { error: insertError } = await supabase
        .from('news_articles')
        .upsert(articlesToStore, { onConflict: 'url' });

      if (insertError) {
        console.error('Error storing articles:', insertError);
      }

      return allArticles.slice(0, count);
    } catch (error) {
      console.error('Error fetching news articles:', error);
      return [];
    }
  }

  // 2. GET FUNDING ROUNDS (from free APIs + local processing)
  async getFundingRounds(count: number = 10): Promise<FundingRound[]> {
    try {
      // Get from database first
      const { data: dbFunding, error: dbError } = await supabase
        .from('funding_rounds')
        .select('*')
        .order('announced_at', { ascending: false })
        .limit(count);

      if (dbFunding && dbFunding.length >= count * 0.7) {
        return this.mapDbToFundingRounds(dbFunding);
      }

      // Extract funding info from news articles
      const newsArticles = await this.getNewsArticles(50);
      const fundingArticles = newsArticles.filter(article => 
        article.category === 'Funding' || 
        article.title.toLowerCase().includes('funding') ||
        article.title.toLowerCase().includes('series')
      );

      // Convert news articles to funding rounds
      const fundingRounds = fundingArticles.slice(0, count).map(article => {
        const amount = this.extractFundingAmount(article.title + ' ' + article.description);
        const stage = this.extractFundingStage(article.title + ' ' + article.description);
        const company = this.extractCompanyName(article.title);
        
        return {
          id: `extracted-${article.id}`,
          companyName: company || 'Unknown Company',
          amount: amount || '$1M',
          stage: stage || 'Seed',
          investors: this.extractInvestors(article.title + ' ' + article.description),
          sector: article.category || 'General',
          region: 'Global',
          date: article.publishedAt,
          description: article.description,
          url: article.url
        };
      });

      // Store in database
      const fundingToStore = fundingRounds.map(round => ({
        company_name: round.companyName,
        amount: round.amount,
        stage: round.stage,
        investors: round.investors,
        sector: round.sector,
        region: round.region,
        announced_at: round.date,
        description: round.description,
        url: round.url
      }));

      await supabase
        .from('funding_rounds')
        .upsert(fundingToStore, { onConflict: 'url' });

      return fundingRounds;
    } catch (error) {
      console.error('Error fetching funding rounds:', error);
      return [];
    }
  }

  // 3. GET EVENTS (from free APIs)
  async getEvents(count: number = 8): Promise<Event[]> {
    try {
      // Get from database first
      const { data: dbEvents, error: dbError } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
        .limit(count);

      if (dbEvents && dbEvents.length >= count * 0.7) {
        return this.mapDbToEvents(dbEvents);
      }

      // Fetch from free APIs
      const meetupEvents = await freeNewsService.getMeetupEvents();
      
      // Store in database
      const eventsToStore = meetupEvents.map(event => ({
        name: event.name,
        organizer: event.organizer,
        event_date: event.date,
        location: event.location,
        event_type: event.type,
        url: event.url,
        description: event.description,
        image_url: event.imageUrl
      }));

      await supabase
        .from('events')
        .upsert(eventsToStore, { onConflict: 'url' });

      return meetupEvents.slice(0, count);
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // 4. SEARCH CONTENT
  async searchContent(query: string, filters?: any): Promise<NewsArticle[]> {
    try {
      const { data, error } = await supabase
        .from('news_articles')
        .select('*')
        .textSearch('title', query)
        .or(`description.ilike.%${query}%,content.ilike.%${query}%`)
        .order('published_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return this.mapDbToNewsArticles(data || []);
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  // 5. GET TRENDING TOPICS
  async getTrendingTopics(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('trending_topics')
        .select('topic, frequency')
        .order('frequency', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (data || []).map(item => item.topic);
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      // Fallback to local generation
      const articles = await this.getNewsArticles(50);
      return await freeAIService.generateTrendingTopics(articles);
    }
  }

  // 6. TRACK CONTENT VIEWS
  async trackContentView(contentType: 'article' | 'funding' | 'event', contentId: string): Promise<void> {
    try {
      await supabase.rpc('increment_content_views', {
        content_type_param: contentType,
        content_id_param: contentId
      });
    } catch (error) {
      console.error('Error tracking content view:', error);
    }
  }

  // 7. SAVE ARTICLE FOR USER
  async saveArticle(userId: string, articleId: string): Promise<void> {
    try {
      await supabase
        .from('saved_articles')
        .insert({
          user_id: userId,
          article_id: articleId
        });
    } catch (error) {
      console.error('Error saving article:', error);
    }
  }

  // 8. GET USER SAVED ARTICLES
  async getSavedArticles(userId: string): Promise<NewsArticle[]> {
    try {
      const { data, error } = await supabase
        .from('saved_articles')
        .select(`
          article_id,
          news_articles (*)
        `)
        .eq('user_id', userId)
        .order('saved_at', { ascending: false });

      if (error) throw error;

      return (data || [])
        .map(item => item.news_articles)
        .filter(Boolean)
        .map(article => this.mapDbToNewsArticles([article])[0]);
    } catch (error) {
      console.error('Error fetching saved articles:', error);
      return [];
    }
  }

  // Helper methods for data mapping
  private mapDbToNewsArticles(dbArticles: any[]): NewsArticle[] {
    return dbArticles.map(article => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content,
      url: article.url,
      image: article.image_url,
      publishedAt: article.published_at,
      source: {
        name: article.source_name,
        url: article.source_url
      },
      category: article.category,
      tags: article.tags || [],
      processedByAI: article.processed_by_ai
    }));
  }

  private mapDbToFundingRounds(dbFunding: any[]): FundingRound[] {
    return dbFunding.map(funding => ({
      id: funding.id,
      companyName: funding.company_name,
      amount: funding.amount,
      stage: funding.stage,
      investors: funding.investors || [],
      sector: funding.sector,
      region: funding.region,
      date: funding.announced_at,
      description: funding.description,
      url: funding.url
    }));
  }

  private mapDbToEvents(dbEvents: any[]): Event[] {
    return dbEvents.map(event => ({
      id: event.id,
      name: event.name,
      organizer: event.organizer,
      date: event.event_date,
      location: event.location,
      type: event.event_type,
      url: event.url,
      description: event.description,
      imageUrl: event.image_url
    }));
  }

  // Local text processing helpers
  private extractFundingAmount(text: string): string | null {
    const amountMatch = text.match(/\$[\d,]+(?:\.\d+)?[MBK]?\b/);
    return amountMatch ? amountMatch[0] : null;
  }

  private extractFundingStage(text: string): string {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('series a')) return 'Series A';
    if (lowerText.includes('series b')) return 'Series B';
    if (lowerText.includes('series c')) return 'Series C+';
    if (lowerText.includes('seed')) return 'Seed';
    if (lowerText.includes('ipo')) return 'IPO';
    return 'Seed';
  }

  private extractCompanyName(text: string): string | null {
    // Simple extraction - look for capitalized words
    const words = text.split(' ');
    const companyWords = words.filter(word => 
      word.length > 2 && 
      word[0] === word[0].toUpperCase() &&
      !['The', 'Raises', 'Secures', 'Announces', 'Funding'].includes(word)
    );
    
    return companyWords.length > 0 ? companyWords[0] : null;
  }

  private extractInvestors(text: string): string[] {
    const investors = [
      'Sequoia Capital', 'Andreessen Horowitz', 'Kleiner Perkins', 'Accel Partners',
      'Index Ventures', 'Greylock Partners', 'Bessemer Venture Partners',
      'General Catalyst', 'NEA', 'Lightspeed Venture', 'Founders Fund',
      'GV', 'Intel Capital', 'Microsoft Ventures', 'Y Combinator', 'Techstars'
    ];

    return investors.filter(investor => 
      text.toLowerCase().includes(investor.toLowerCase())
    );
  }
}

// Export singleton instance
export const freeSupabaseService = new FreeSupabaseService();