import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { enhancedCacheManager } from '@/services/enhancedCacheManager';
import { supabase } from '@/services/supabaseClient';

interface ContentConfig {
  type: 'news' | 'funding' | 'events' | 'ai_summary';
  keywords: string[];
  count: number;
  priority: 'high' | 'medium' | 'low';
  refreshInterval?: number;
  autoRefresh?: boolean;
  useEdgeFunction?: boolean;
  batchId?: string;
}

interface ContentState {
  data: any;
  isLoading: boolean;
  isRefreshing: boolean;
  isStale: boolean;
  lastUpdated: Date | null;
  error: Error | null;
  cacheStatus: 'hit' | 'miss' | 'stale';
  quotaInfo?: {
    dailyUsed: number;
    dailyLimit: number;
    hourlyUsed: number;
    hourlyLimit: number;
    dailyPercentage: number;
    hourlyPercentage: number;
  };
  performanceMetrics?: {
    responseTime: number;
    cacheLayer: 'browser' | 'database' | 'api';
    batchOptimized: boolean;
  };
}

interface EdgeFunctionResponse {
  success: boolean;
  content?: any;
  cached?: boolean;
  response_time?: number;
  job_id?: string;
  error?: string;
  quotas?: any[];
}

export function useEnhancedSmartContent(config: ContentConfig) {
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. ENHANCED CONTENT FETCHING WITH EDGE FUNCTION SUPPORT
  const fetchContent = useCallback(async (forceRefresh = false): Promise<any> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();

    setState(prev => ({ 
      ...prev, 
      isLoading: !forceRefresh, 
      isRefreshing: forceRefresh,
      error: null 
    }));

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = await enhancedCacheManager.getCachedContent(
          cacheKey, 
          config.type, 
          config.priority
        );
        
        if (cached) {
          setState(prev => ({
            ...prev,
            data: cached,
            isLoading: false,
            isRefreshing: false,
            lastUpdated: new Date(),
            cacheStatus: 'hit',
            performanceMetrics: {
              responseTime: 0,
              cacheLayer: 'browser',
              batchOptimized: false
            }
          }));
          return cached;
        }
      }

      // Use Edge Function if enabled and available
      if (config.useEdgeFunction) {
        return await fetchViaEdgeFunction(forceRefresh);
      }

      // Fallback to direct API calls
      return await fetchViaDirectAPI(forceRefresh);

    } catch (error) {
      console.error('Error fetching content:', error);
      
      // Fallback to cached content
      const cached = await enhancedCacheManager.getCachedContent(cacheKey, config.type, config.priority);
      
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
  }, [cacheKey, config, enhancedCacheManager]);

  // 2. EDGE FUNCTION INTEGRATION
  const fetchViaEdgeFunction = async (forceRefresh: boolean): Promise<any> => {
    const startTime = Date.now();
    
    // Schedule job via Edge Function
    const jobId = `${config.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const jobResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/content-orchestrator-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'schedule_job',
        data: {
          id: jobId,
          type: config.type,
          priority: config.priority,
          config: {
            keywords: config.keywords,
            count: config.count,
            sources: ['gnews', 'reddit', 'hn'],
            refreshInterval: config.refreshInterval
          }
        }
      }),
      signal: abortControllerRef.current?.signal
    });

    if (!jobResponse.ok) {
      throw new Error(`Edge Function error: ${jobResponse.status}`);
    }

    // Execute the job immediately
    const executeResponse = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/content-orchestrator-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'execute_job',
        data: jobId
      }),
      signal: abortControllerRef.current?.signal
    });

    if (!executeResponse.ok) {
      throw new Error(`Job execution error: ${executeResponse.status}`);
    }

    const result: EdgeFunctionResponse = await executeResponse.json();
    const responseTime = Date.now() - startTime;

    if (!result.success) {
      throw new Error(result.error || 'Edge Function execution failed');
    }

    // Cache the content
    await enhancedCacheManager.setCachedContent(
      cacheKey, 
      result.content, 
      config.type, 
      undefined, 
      config.priority
    );

    // Get quota information
    const quotaInfo = await getQuotaInfo();

    setState(prev => ({
      ...prev,
      data: result.content,
      isLoading: false,
      isRefreshing: false,
      lastUpdated: new Date(),
      cacheStatus: result.cached ? 'hit' : 'miss',
      quotaInfo,
      performanceMetrics: {
        responseTime: result.response_time || responseTime,
        cacheLayer: result.cached ? 'database' : 'api',
        batchOptimized: true
      }
    }));

    return result.content;
  };

  // 3. DIRECT API INTEGRATION (Fallback)
  const fetchViaDirectAPI = async (forceRefresh: boolean): Promise<any> => {
    const startTime = Date.now();

    // Check API quota
    const canMakeCall = await enhancedCacheManager.canMakeApiCall(config.type === 'ai_summary' ? 'gemini' : 'gnews');
    
    if (!canMakeCall) {
      console.warn('API limit reached, using cached content');
      const cached = await enhancedCacheManager.getCachedContent(cacheKey, config.type, config.priority);
      
      setState(prev => ({
        ...prev,
        data: cached || prev.data,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date(),
        cacheStatus: 'hit',
        isStale: true
      }));
      
      return cached;
    }

    // Fetch fresh content
    const content = await fetchFreshContent(config);
    const responseTime = Date.now() - startTime;
    
    // Cache the content
    await enhancedCacheManager.setCachedContent(
      cacheKey, 
      content, 
      config.type, 
      undefined, 
      config.priority
    );
    
    // Record API usage
    await enhancedCacheManager.recordApiCall(
      config.type === 'ai_summary' ? 'gemini' : 'gnews',
      responseTime,
      200
    );

    // Get quota information
    const quotaInfo = await getQuotaInfo();

    setState(prev => ({
      ...prev,
      data: content,
      isLoading: false,
      isRefreshing: false,
      lastUpdated: new Date(),
      cacheStatus: 'miss',
      quotaInfo,
      performanceMetrics: {
        responseTime,
        cacheLayer: 'api',
        batchOptimized: false
      }
    }));

    return content;
  };

  // 4. INTELLIGENT REFRESH LOGIC
  const refreshContent = useCallback(async (): Promise<any> => {
    const shouldRefresh = enhancedCacheManager.shouldRefreshContent(cacheKey, config.priority);
    
    if (shouldRefresh) {
      console.log(`🔄 Refreshing content: ${cacheKey} (${config.priority} priority)`);
      return await fetchContent(true);
    } else {
      console.log(`✅ Content is fresh: ${cacheKey}`);
      return state.data;
    }
  }, [fetchContent, cacheKey, config.priority, state.data]);

  // 5. AUTO-REFRESH SYSTEM WITH PRIORITY
  useEffect(() => {
    if (!config.autoRefresh) return;

    const interval = setInterval(async () => {
      const shouldRefresh = enhancedCacheManager.shouldRefreshContent(cacheKey, config.priority);
      
      if (shouldRefresh) {
        console.log(`⏰ Auto-refreshing content: ${cacheKey} (${config.priority} priority)`);
        await refreshContent();
      }
    }, config.refreshInterval || getRefreshInterval(config.priority));

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, refreshContent, cacheKey, config.priority]);

  // 6. BACKGROUND REFRESH (when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && state.data) {
        const shouldRefresh = enhancedCacheManager.shouldRefreshContent(cacheKey, config.priority);
        if (shouldRefresh) {
          console.log(`👁️ Tab visible, refreshing stale content: ${cacheKey}`);
          refreshContent();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshContent, cacheKey, config.priority, state.data]);

  // 7. INITIAL LOAD
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // 8. MANUAL REFRESH
  const manualRefresh = useCallback(async (): Promise<any> => {
    console.log(`🔄 Manual refresh requested: ${cacheKey}`);
    return await fetchContent(true);
  }, [fetchContent, cacheKey]);

  // 9. BATCH OPTIMIZATION
  const batchRefresh = useCallback(async (batchConfig: ContentConfig[]): Promise<any[]> => {
    if (!config.useEdgeFunction) {
      // Fallback to individual refreshes
      return Promise.all(batchConfig.map(cfg => fetchContent(true)));
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await fetch(`${process.env.VITE_SUPABASE_URL}/functions/v1/content-orchestrator-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'batch_fetch',
        data: {
          contentTypes: batchConfig.map(cfg => cfg.type),
          keywords: [...new Set(batchConfig.flatMap(cfg => cfg.keywords))],
          priority: config.priority,
          batchId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Batch fetch error: ${response.status}`);
    }

    const result = await response.json();
    return result.results || [];
  }, [config.useEdgeFunction, config.priority, fetchContent]);

  // 10. PERFORMANCE MONITORING
  const trackPerformance = useCallback(async (metric: string, value: number): Promise<void> => {
    try {
      await supabase.from('performance_metrics').insert({
        metric_type: 'user_engagement',
        metric_name: metric,
        metric_value: value,
        metadata: { 
          cache_key: cacheKey, 
          content_type: config.type,
          priority: config.priority 
        },
        recorded_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }, [cacheKey, config.type, config.priority]);

  // 11. CLEANUP
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    refresh: manualRefresh,
    batchRefresh,
    trackPerformance,
    cacheKey,
    environment: enhancedCacheManager.getEnvironment()
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
  if (!response.ok) throw new Error(`GNews API error: ${response.status}`);
  
  const data = await response.json();
  return data.articles || [];
}

async function fetchFundingContent(keywords: string[], count: number): Promise<any[]> {
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
  const newsContent = await fetchNewsContent(keywords, count);
  
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`;
  
  const prompt = `Analyze these startup news articles and provide a comprehensive summary:

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
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';
}

async function getQuotaInfo(): Promise<any> {
  try {
    const { data: quotas } = await supabase
      .from('quota_management')
      .select('*')
      .eq('is_active', true);

    if (!quotas || quotas.length === 0) return null;

    const gnewsQuota = quotas.find(q => q.api_type === 'gnews');
    const geminiQuota = quotas.find(q => q.api_type === 'gemini');

    return {
      gnews: gnewsQuota ? {
        dailyUsed: gnewsQuota.daily_used,
        dailyLimit: gnewsQuota.daily_limit,
        hourlyUsed: gnewsQuota.hourly_used,
        hourlyLimit: gnewsQuota.hourly_limit,
        dailyPercentage: Math.round((gnewsQuota.daily_used / gnewsQuota.daily_limit) * 100),
        hourlyPercentage: Math.round((gnewsQuota.hourly_used / gnewsQuota.hourly_limit) * 100)
      } : null,
      gemini: geminiQuota ? {
        dailyUsed: geminiQuota.daily_used,
        dailyLimit: geminiQuota.daily_limit,
        hourlyUsed: geminiQuota.hourly_used,
        hourlyLimit: geminiQuota.hourly_limit,
        dailyPercentage: Math.round((geminiQuota.daily_used / geminiQuota.daily_limit) * 100),
        hourlyPercentage: Math.round((geminiQuota.hourly_used / geminiQuota.hourly_limit) * 100)
      } : null
    };
  } catch (error) {
    console.error('Error getting quota info:', error);
    return null;
  }
}

function getRefreshInterval(priority: 'high' | 'medium' | 'low'): number {
  const intervals = {
    high: 2 * 60 * 60 * 1000, // 2 hours
    medium: 4 * 60 * 60 * 1000, // 4 hours
    low: 12 * 60 * 60 * 1000 // 12 hours
  };
  
  return intervals[priority];
}