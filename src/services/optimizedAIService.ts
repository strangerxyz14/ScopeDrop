import { cacheManager } from './cacheManager';
import { supabase } from './supabaseClient';

// AI Prompt Templates for different content types
const AI_PROMPTS = {
  // 1. BATCH NEWS ANALYSIS
  batchNewsAnalysis: (articles: any[]) => `Analyze these startup news articles and provide comprehensive insights:

ARTICLES:
${articles.map((article, index) => `${index + 1}. ${article.title}
   Source: ${article.source?.name || 'Unknown'}
   Published: ${article.publishedAt}
   Summary: ${article.description}`).join('\n\n')}

REQUIRED OUTPUT FORMAT:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. KEY TRENDS (3-5 bullet points)
3. NOTABLE COMPANIES (list with funding amounts if mentioned)
4. MARKET INSIGHTS (2-3 observations)
5. FUTURE PREDICTIONS (2-3 predictions)

Tone: Professional, engaging, startup-focused
Length: 300-500 words
Focus: Actionable insights for entrepreneurs and investors`,

  // 2. FUNDING ROUND ANALYSIS
  fundingAnalysis: (fundingNews: any[]) => `Analyze these funding announcements and provide detailed insights:

FUNDING ROUNDS:
${fundingNews.map((news, index) => `${index + 1}. ${news.title}
   Amount: ${extractFundingAmount(news.title + ' ' + news.description)}
   Stage: ${extractFundingStage(news.title + ' ' + news.description)}
   Company: ${extractCompanyName(news.title)}`).join('\n\n')}

REQUIRED OUTPUT FORMAT:
1. TOTAL FUNDING VOLUME
2. STAGE DISTRIBUTION (Seed, Series A, B, C, etc.)
3. TOP INVESTORS MENTIONED
4. SECTOR ANALYSIS
5. REGIONAL TRENDS
6. INVESTMENT THEMES
7. MARKET SENTIMENT

Tone: Data-driven, analytical
Length: 400-600 words
Focus: Investment trends and market analysis`,

  // 3. STARTUP ECOSYSTEM OVERVIEW
  ecosystemOverview: (content: any[]) => `Provide a comprehensive overview of the current startup ecosystem based on this content:

CONTENT:
${content.map((item, index) => `${index + 1}. ${item.title || item.name}
   Type: ${item.category || 'News'}
   Summary: ${item.description}`).join('\n\n')}

REQUIRED OUTPUT FORMAT:
1. ECOSYSTEM HEALTH INDICATORS
2. EMERGING TRENDS
3. CHALLENGES & OPPORTUNITIES
4. GEOGRAPHIC HOTSPOTS
5. SECTOR FOCUS AREAS
6. INVESTOR SENTIMENT
7. RECOMMENDATIONS FOR FOUNDERS

Tone: Strategic, insightful
Length: 500-700 words
Focus: High-level ecosystem analysis`,

  // 4. SEO-OPTIMIZED ARTICLE SUMMARY
  seoSummary: (article: any) => `Create an SEO-optimized summary for this startup news article:

ARTICLE:
Title: ${article.title}
Content: ${article.description}
Source: ${article.source?.name}
Published: ${article.publishedAt}

REQUIRED OUTPUT FORMAT:
1. SEO TITLE (60 characters max)
2. META DESCRIPTION (160 characters max)
3. KEYWORDS (5-8 relevant keywords)
4. SUMMARY (150-200 words)
5. KEY TAKEAWAYS (3-5 bullet points)
6. RELATED TOPICS (3-5 topics)

Tone: Engaging, informative
Focus: SEO optimization and user engagement`,

  // 5. TRENDING TOPICS ANALYSIS
  trendingAnalysis: (topics: string[]) => `Analyze these trending startup topics and provide insights:

TRENDING TOPICS:
${topics.map((topic, index) => `${index + 1}. ${topic}`).join('\n')}

REQUIRED OUTPUT FORMAT:
1. TOPIC CLUSTERS (group related topics)
2. EMERGING TRENDS (what's new)
3. MARKET DRIVERS (why these topics are trending)
4. OPPORTUNITY AREAS (for entrepreneurs)
5. INVESTMENT IMPLICATIONS
6. FUTURE OUTLOOK

Tone: Forward-looking, analytical
Length: 300-400 words
Focus: Trend analysis and predictions`
};

// AI Service with optimization
export class OptimizedAIService {
  private static instance: OptimizedAIService;
  private batchQueue: Map<string, any[]> = new Map();
  private processingQueue: Set<string> = new Set();

  static getInstance(): OptimizedAIService {
    if (!OptimizedAIService.instance) {
      OptimizedAIService.instance = new OptimizedAIService();
    }
    return OptimizedAIService.instance;
  }

  // 1. BATCH AI PROCESSING (Minimize API calls)
  async batchProcessContent(content: any[], type: 'news' | 'funding' | 'ecosystem'): Promise<string> {
    const batchKey = `${type}_${Date.now()}`;
    
    // Check cache first
    const cached = await cacheManager.getCachedContent(batchKey, 'ai_batch');
    if (cached) {
      console.log(`📦 Using cached AI batch result: ${batchKey}`);
      return cached;
    }

    // Check API limits
    if (!cacheManager.canMakeApiCall('gemini')) {
      console.warn('🚫 Gemini API limit reached, using cached analysis');
      return await this.getCachedAnalysis(type);
    }

    try {
      // Generate appropriate prompt
      const prompt = this.generateBatchPrompt(content, type);
      
      // Make API call
      const analysis = await this.callGeminiAPI(prompt);
      
      // Cache the result
      await cacheManager.setCachedContent(batchKey, analysis, 'ai_batch', 24 * 60 * 60 * 1000); // 24 hours
      
      // Record API usage
      cacheManager.recordApiCall('gemini');
      
      return analysis;
    } catch (error) {
      console.error('Error in batch AI processing:', error);
      return await this.getCachedAnalysis(type);
    }
  }

  // 2. SMART CONTENT SUMMARIZATION
  async summarizeContent(content: any[], maxLength: number = 300): Promise<string> {
    const contentHash = this.generateContentHash(content);
    const cacheKey = `summary_${contentHash}`;
    
    // Check cache
    const cached = await cacheManager.getCachedContent(cacheKey, 'ai_summary');
    if (cached) {
      return cached;
    }

    // Check API limits
    if (!cacheManager.canMakeApiCall('gemini')) {
      return this.generateLocalSummary(content, maxLength);
    }

    try {
      const prompt = `Summarize this startup content in ${maxLength} words or less:

${content.map(item => `- ${item.title}: ${item.description}`).join('\n')}

Focus on:
- Key insights
- Notable companies
- Market trends
- Actionable takeaways

Format: Clear, engaging, startup-focused`;

      const summary = await this.callGeminiAPI(prompt);
      
      // Cache summary
      await cacheManager.setCachedContent(cacheKey, summary, 'ai_summary', 12 * 60 * 60 * 1000); // 12 hours
      
      cacheManager.recordApiCall('gemini');
      
      return summary;
    } catch (error) {
      console.error('Error in AI summarization:', error);
      return this.generateLocalSummary(content, maxLength);
    }
  }

  // 3. SEO CONTENT GENERATION
  async generateSEOContent(article: any): Promise<any> {
    const cacheKey = `seo_${article.id || article.title}`;
    
    // Check cache
    const cached = await cacheManager.getCachedContent(cacheKey, 'ai_seo');
    if (cached) {
      return cached;
    }

    // Check API limits
    if (!cacheManager.canMakeApiCall('gemini')) {
      return this.generateLocalSEO(article);
    }

    try {
      const prompt = AI_PROMPTS.seoSummary(article);
      const seoContent = await this.callGeminiAPI(prompt);
      
      // Parse structured response
      const parsed = this.parseSEOResponse(seoContent);
      
      // Cache result
      await cacheManager.setCachedContent(cacheKey, parsed, 'ai_seo', 24 * 60 * 60 * 1000);
      
      cacheManager.recordApiCall('gemini');
      
      return parsed;
    } catch (error) {
      console.error('Error in SEO generation:', error);
      return this.generateLocalSEO(article);
    }
  }

  // 4. TRENDING TOPICS ANALYSIS
  async analyzeTrendingTopics(topics: string[]): Promise<string> {
    const topicsHash = topics.sort().join('_');
    const cacheKey = `trending_${topicsHash}`;
    
    // Check cache
    const cached = await cacheManager.getCachedContent(cacheKey, 'ai_trending');
    if (cached) {
      return cached;
    }

    // Check API limits
    if (!cacheManager.canMakeApiCall('gemini')) {
      return this.generateLocalTrendingAnalysis(topics);
    }

    try {
      const prompt = AI_PROMPTS.trendingAnalysis(topics);
      const analysis = await this.callGeminiAPI(prompt);
      
      // Cache result
      await cacheManager.setCachedContent(cacheKey, analysis, 'ai_trending', 6 * 60 * 60 * 1000); // 6 hours
      
      cacheManager.recordApiCall('gemini');
      
      return analysis;
    } catch (error) {
      console.error('Error in trending analysis:', error);
      return this.generateLocalTrendingAnalysis(topics);
    }
  }

  // 5. INTELLIGENT FALLBACKS
  private async getCachedAnalysis(type: string): Promise<string> {
    // Get most recent cached analysis of this type
    const { data } = await supabase
      .from('content_cache')
      .select('*')
      .eq('cache_type', 'ai_batch')
      .ilike('cache_key', `%${type}%`)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.cache_data || `No cached analysis available for ${type}`;
  }

  private generateLocalSummary(content: any[], maxLength: number): string {
    const titles = content.map(item => item.title).join(', ');
    const summary = `Latest startup news: ${titles}. Key developments in the tech ecosystem with focus on innovation and growth.`;
    
    return summary.length > maxLength 
      ? summary.substring(0, maxLength - 3) + '...'
      : summary;
  }

  private generateLocalSEO(article: any): any {
    return {
      seoTitle: article.title?.substring(0, 60) || 'Startup News',
      metaDescription: article.description?.substring(0, 160) || 'Latest startup news and insights',
      keywords: ['startup', 'tech', 'innovation', 'funding', 'entrepreneurship'],
      summary: article.description || 'Startup news and insights',
      keyTakeaways: ['Innovation in tech', 'Market trends', 'Growth opportunities'],
      relatedTopics: ['Startup funding', 'Tech innovation', 'Market analysis']
    };
  }

  private generateLocalTrendingAnalysis(topics: string[]): string {
    return `Trending startup topics: ${topics.join(', ')}. These topics indicate growing interest in innovation and technology development. Key areas of focus include market expansion and strategic growth.`;
  }

  // HELPER METHODS

  private generateBatchPrompt(content: any[], type: string): string {
    switch (type) {
      case 'news':
        return AI_PROMPTS.batchNewsAnalysis(content);
      case 'funding':
        return AI_PROMPTS.fundingAnalysis(content);
      case 'ecosystem':
        return AI_PROMPTS.ecosystemOverview(content);
      default:
        return AI_PROMPTS.batchNewsAnalysis(content);
    }
  }

  private async callGeminiAPI(prompt: string): Promise<string> {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI';
  }

  private parseSEOResponse(response: string): any {
    // Simple parsing of structured AI response
    const lines = response.split('\n');
    const result: any = {};
    
    lines.forEach(line => {
      if (line.includes('SEO TITLE:')) {
        result.seoTitle = line.split('SEO TITLE:')[1]?.trim();
      } else if (line.includes('META DESCRIPTION:')) {
        result.metaDescription = line.split('META DESCRIPTION:')[1]?.trim();
      } else if (line.includes('KEYWORDS:')) {
        result.keywords = line.split('KEYWORDS:')[1]?.trim().split(',').map(k => k.trim());
      } else if (line.includes('SUMMARY:')) {
        result.summary = line.split('SUMMARY:')[1]?.trim();
      }
    });
    
    return result;
  }

  private generateContentHash(content: any[]): string {
    const contentString = content.map(item => item.title + item.description).join('');
    return btoa(contentString).substring(0, 16);
  }
}

// Utility functions for content extraction
function extractFundingAmount(text: string): string {
  const match = text.match(/\$[\d,]+(?:\.\d+)?[MBK]?\b/);
  return match ? match[0] : 'Undisclosed';
}

function extractFundingStage(text: string): string {
  const lowerText = text.toLowerCase();
  if (lowerText.includes('series a')) return 'Series A';
  if (lowerText.includes('series b')) return 'Series B';
  if (lowerText.includes('series c')) return 'Series C';
  if (lowerText.includes('seed')) return 'Seed';
  if (lowerText.includes('ipo')) return 'IPO';
  return 'Unknown';
}

function extractCompanyName(text: string): string {
  const words = text.split(' ');
  const companyWords = words.filter(word => 
    word.length > 2 && 
    word[0] === word[0].toUpperCase() &&
    !['The', 'Raises', 'Secures', 'Announces', 'Funding', 'Series'].includes(word)
  );
  
  return companyWords[0] || 'Unknown Company';
}

export const optimizedAIService = OptimizedAIService.getInstance();