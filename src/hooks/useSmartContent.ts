import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheManager } from '@/services/cacheManager';
import { supabase } from '@/services/supabaseClient';

interface ContentConfig {
  type: 'news' | 'funding' | 'events' | 'ai_summary';
  keywords: string[];
  count: number;
  priority: 'high' | 'medium' | 'low';
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface ContentState {
  data: any;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
  cacheStatus: 'hit' | 'miss' | 'stale';
}

export function useSmartContent(config: ContentConfig) {
  const [state, setState] = useState<ContentState>({
    data: null,
    isLoading: false,
    isRefreshing: false,
    isStale: false,
    lastUpdated: null,
    error: null,
    cacheStatus: 'miss'
  });

  const queryClient = useQueryClient();
  const cacheKey = `${config.type}_${config.keywords.join('_')}_${config.count}`;

  // 1. SMART CONTENT FETCHING
  const fetchContent = useCallback(async (forceRefresh = false) => {
    setState(prev => ({ ...prev, isLoading: !forceRefresh, isRefreshing: forceRefresh }));

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = await cacheManager.getCachedContent(cacheKey, config.type);
        if (cached) {
          setState(prev => ({
            ...prev,
            data: cached,
            isLoading: false,
            isRefreshing: false,
            lastUpdated: new Date(),
            cacheStatus: 'hit'
          }));
          return cached;
        }
      }

      // Check if we can make API call
      if (!cacheManager.canMakeApiCall(config.type === 'ai_summary' ? 'gemini' : 'gnews')) {
        console.warn('API limit reached, using cached content');
        const cached = await cacheManager.getCachedContent(cacheKey, config.type);
        if (cached) {
          setState(prev => ({
            ...prev,
            data: cached,
            isLoading: false,
            isRefreshing: false,
            lastUpdated: new Date(),
            cacheStatus: 'hit',
            isStale: true
          }));
          return cached;
        }
      }

      // Fetch fresh content
      const content = await fetchFreshContent(config);
      
      // Cache the content
      await cacheManager.setCachedContent(cacheKey, content, config.type);
      
      // Record API usage
      cacheManager.recordApiCall(config.type === 'ai_summary' ? 'gemini' : 'gnews');

      setState(prev => ({
        ...prev,
        data: content,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date(),
        cacheStatus: 'miss',
        error: null
      }));

      return content;
    } catch (error) {
      console.error('Error fetching content:', error);
      
      // Fallback to cached content
      const cached = await cacheManager.getCachedContent(cacheKey, config.type);
      
      setState(prev => ({
        ...prev,
        data: cached || prev.data,
        isLoading: false,
        isRefreshing: false,
        error: error as Error,
        cacheStatus: cached ? 'hit' : 'miss'
      }));

      return cached;
    }
  }, [cacheKey, config]);

  // 2. INTELLIGENT REFRESH LOGIC
  const refreshContent = useCallback(async () => {
    const shouldRefresh = cacheManager.shouldRefreshContent(cacheKey, config.type);
    
    if (shouldRefresh) {
      console.log(`🔄 Refreshing content: ${cacheKey}`);
      return await fetchContent(true);
    } else {
      console.log(`✅ Content is fresh: ${cacheKey}`);
      return state.data;
    }
  }, [fetchContent, cacheKey, config.type, state.data]);

  // 3. AUTO-REFRESH SYSTEM
  useEffect(() => {
    if (!config.autoRefresh) return;

    const interval = setInterval(async () => {
      const shouldRefresh = cacheManager.shouldRefreshContent(cacheKey, config.type);
      
      if (shouldRefresh) {
        console.log(`⏰ Auto-refreshing content: ${cacheKey}`);
        await refreshContent();
      }
    }, config.refreshInterval || 5 * 60 * 1000); // Default: 5 minutes

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, refreshContent, cacheKey, config.type]);

  // 4. INITIAL LOAD
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // 5. BACKGROUND REFRESH (when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.data) {
        const shouldRefresh = cacheManager.shouldRefreshContent(cacheKey, config.type);
        if (shouldRefresh) {
          console.log(`👁️ Tab visible, refreshing stale content: ${cacheKey}`);
          refreshContent();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshContent, cacheKey, config.type, state.data]);

  // 6. MANUAL REFRESH
  const manualRefresh = useCallback(async () => {
    console.log(`🔄 Manual refresh requested: ${cacheKey}`);
    return await fetchContent(true);
  }, [fetchContent, cacheKey]);

  // 7. CONTENT OPTIMIZATION
  const optimizeContent = useCallback(async (content: any) => {
    if (config.type === 'ai_summary') {
      // Optimize AI-generated content
      return await optimizeAIContent(content);
    }
    
    // Optimize news/funding content
    return await optimizeNewsContent(content);
  }, [config.type]);

  return {
    ...state,
    refresh: manualRefresh,
    optimize: optimizeContent,
    cacheKey
  };
}

// HELPER FUNCTIONS

async function fetchFreshContent(config: ContentConfig): Promise<any> {
  const { type, keywords, count } = config;

  switch (type) {
    case 'news':
      return await fetchNewsContent(keywords, count);
    
    case 'funding':
      return await fetchFundingContent(keywords, count);
    
    case 'events':
      return await fetchEventsContent(keywords, count);
    
    case 'ai_summary':
      return await generateAISummary(keywords, count);
    
    default:
      throw new Error(`Unknown content type: ${type}`);
  }
}

async function fetchNewsContent(keywords: string[], count: number): Promise<any[]> {
  const query = keywords.join(' OR ');
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${count}&apikey=${process.env.VITE_GNEWS_API_KEY}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  return data.articles || [];
}

async function fetchFundingContent(keywords: string[], count: number): Promise<any[]> {
  // Extract funding news from general news
  const newsContent = await fetchNewsContent([...keywords, 'funding', 'series'], count * 2);
  
  return newsContent
    .filter(article => 
      article.title.toLowerCase().includes('funding') ||
      article.title.toLowerCase().includes('series') ||
      article.title.toLowerCase().includes('raise') ||
      article.title.toLowerCase().includes('investment')
    )
    .slice(0, count);
}

async function fetchEventsContent(keywords: string[], count: number): Promise<any[]> {
  const events = [];
  
  // Meetup API
  const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=10');
  const meetupData = await meetupResponse.json();
  
  if (meetupData.events) {
    events.push(...meetupData.events.map((event: any) => ({
      name: event.name,
      date: new Date(event.time).toISOString(),
      location: event.venue?.city || 'Online',
      url: event.link,
      source: 'Meetup'
    })));
  }
  
  return events.slice(0, count);
}

async function generateAISummary(keywords: string[], count: number): Promise<string> {
  // Get news content first
  const newsContent = await fetchNewsContent(keywords, count);
  
  // Generate AI summary
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`;
  
  const prompt = `Analyze these startup news articles and provide a comprehensive summary:

Articles:
${newsContent.map(article => `- ${article.title}: ${article.description}`).join('\n')}

Please provide:
1. Key trends and insights
2. Notable companies and funding amounts
3. Market analysis
4. Future predictions

Format the response in a clear, engaging way suitable for a startup news website.`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';
}

async function optimizeAIContent(content: string): Promise<string> {
  // Optimize AI-generated content for better readability
  return content
    .replace(/\n{3,}/g, '\n\n') // Remove excessive line breaks
    .replace(/\s{2,}/g, ' ') // Remove excessive spaces
    .trim();
}

async function optimizeNewsContent(content: any[]): Promise<any[]> {
  // Optimize news content for better presentation
  return content.map(article => ({
    ...article,
    title: article.title?.trim(),
    description: article.description?.substring(0, 200) + '...',
    publishedAt: new Date(article.publishedAt).toISOString()
  }));
}