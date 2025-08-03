import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { enhancedCacheManager } from '@/services/enhancedCacheManager';
import { supabase } from '@/services/enhancedCacheManager';
import { CONFIG } from '@/config';

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
  cacheStatus: 'hit' | 'miss' | 'stale' | null;
  quotaInfo: any;
  performanceMetrics: any;
}

interface EdgeFunctionResponse {
  success: boolean;
  data?: any;
  error?: string;
  cacheStatus?: string;
  quotaInfo?: any;
  performanceMetrics?: any;
}

export function useEnhancedSmartContent(config: ContentConfig) {
  const [state, setState] = useState<ContentState>({
    data: null,
    isLoading: false,
    isRefreshing: false,
    isStale: false,
    lastUpdated: null,
    error: null,
    cacheStatus: null,
    quotaInfo: null,
    performanceMetrics: null
  });

  const queryClient = useQueryClient();
  const cacheKey = `${config.type}_${config.keywords.join('_')}_${config.count}`;
  const abortControllerRef = useRef<AbortController | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. ENHANCED CONTENT FETCHING WITH EDGE FUNCTION SUPPORT
  const fetchContent = useCallback(async (forceRefresh = false): Promise<any> => {
    const startTime = Date.now();
    
    try {
      // Check if we should use Edge Functions
      if (config.useEdgeFunction && !forceRefresh) {
        return await fetchViaEdgeFunction(forceRefresh);
      } else {
        return await fetchViaDirectAPI(forceRefresh);
      }
    } catch (error) {
      console.error('Content fetch error:', error);
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      await trackPerformance('response_time', responseTime);
    }
  }, [cacheKey, config, enhancedCacheManager]);

  // 2. EDGE FUNCTION INTEGRATION
  const fetchViaEdgeFunction = async (forceRefresh: boolean): Promise<any> => {
    try {
      const edgeFunctionUrl = `${CONFIG.ENDPOINTS.SUPABASE_FUNCTIONS}/content-orchestrator-v2`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'batch_fetch',
          data: {
            contentTypes: [config.type],
            keywords: config.keywords,
            priority: config.priority,
            batchId: config.batchId || `batch_${Date.now()}`,
            forceRefresh
          }
        }),
        signal: abortControllerRef.current?.signal
      });

      if (!response.ok) {
        throw new Error(`Edge Function error: ${response.status}`);
      }

      const result: EdgeFunctionResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Edge Function failed');
      }

      // Update state with Edge Function response
      setState(prev => ({
        ...prev,
        data: result.data,
        cacheStatus: result.cacheStatus as any,
        quotaInfo: result.quotaInfo,
        performanceMetrics: result.performanceMetrics,
        lastUpdated: new Date()
      }));

      return result.data;

    } catch (error) {
      console.warn('Edge Function failed, falling back to direct API:', error);
      return await fetchViaDirectAPI(forceRefresh);
    }
  };

  // 3. DIRECT API INTEGRATION (Fallback)
  const fetchViaDirectAPI = async (forceRefresh: boolean): Promise<any> => {
    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedData = await enhancedCacheManager.getCachedContent(
          cacheKey, 
          config.type, 
          config.priority
        );
        
        if (cachedData) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            cacheStatus: 'hit',
            lastUpdated: new Date()
          }));
          return cachedData;
        }
      }

      // Check API quota
      const canMakeCall = await enhancedCacheManager.canMakeApiCall(config.type);
      if (!canMakeCall) {
        throw new Error(`API quota exceeded for ${config.type}`);
      }

      // Fetch fresh content
      const freshData = await fetchFreshContent(config);
      
      // Cache the fresh data
      await enhancedCacheManager.setCachedContent(
        cacheKey,
        freshData,
        config.type,
        undefined,
        config.priority
      );

      setState(prev => ({
        ...prev,
        data: freshData,
        cacheStatus: 'miss',
        lastUpdated: new Date()
      }));

      return freshData;

    } catch (error) {
      console.error('Direct API fetch error:', error);
      throw error;
    }
  };

  // 4. INTELLIGENT REFRESH LOGIC
  const refreshContent = useCallback(async (): Promise<any> => {
    try {
      setState(prev => ({ ...prev, isRefreshing: true, error: null }));
      
      const data = await fetchContent(true);
      
      setState(prev => ({
        ...prev,
        data,
        isRefreshing: false,
        isStale: false,
        lastUpdated: new Date()
      }));

      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        isRefreshing: false
      }));
      throw error;
    }
  }, [fetchContent, cacheKey, config.priority, state.data]);

  // 5. AUTO-REFRESH SYSTEM WITH PRIORITY
  useEffect(() => {
    if (!config.autoRefresh || !config.refreshInterval) return;

    const interval = setInterval(async () => {
      const shouldRefresh = enhancedCacheManager.shouldRefreshContent(
        cacheKey, 
        config.priority
      );
      
      if (shouldRefresh) {
        try {
          await refreshContent();
        } catch (error) {
          console.warn('Auto-refresh failed:', error);
        }
      }
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, refreshContent, cacheKey, config.priority, state.data]);

  // 6. BACKGROUND REFRESH (when tab becomes visible)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const shouldRefresh = enhancedCacheManager.shouldRefreshContent(
          cacheKey, 
          config.priority
        );
        
        if (shouldRefresh) {
          try {
            await refreshContent();
          } catch (error) {
            console.warn('Background refresh failed:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refreshContent, cacheKey, config.priority, state.data]);

  // 7. INITIAL LOAD
  useEffect(() => {
    const loadInitialContent = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        await fetchContent();
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error as Error,
          isLoading: false
        }));
      } finally {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadInitialContent();
  }, [fetchContent]);

  // 8. MANUAL REFRESH
  const manualRefresh = useCallback(async (): Promise<any> => {
    return await refreshContent();
  }, [fetchContent, cacheKey]);

  // 9. BATCH OPTIMIZATION
  const batchRefresh = useCallback(async (batchConfig: ContentConfig[]): Promise<any[]> => {
    if (!config.useEdgeFunction) {
      // Fallback to individual refreshes
      return Promise.all(batchConfig.map(cfg => fetchContent(true)));
    }

    try {
      const edgeFunctionUrl = `${CONFIG.ENDPOINTS.SUPABASE_FUNCTIONS}/content-orchestrator-v2`;
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.SUPABASE.ANON_KEY}`
        },
        body: JSON.stringify({
          action: 'batch_fetch',
          data: {
            contentTypes: batchConfig.map(cfg => cfg.type),
            keywords: [...new Set(batchConfig.flatMap(cfg => cfg.keywords))],
            priority: config.priority,
            batchId: `batch_${Date.now()}`,
            forceRefresh: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Batch refresh failed: ${response.status}`);
      }

      const result = await response.json();
      return result.data || [];

    } catch (error) {
      console.error('Batch refresh error:', error);
      throw error;
    }
  }, [config.useEdgeFunction, config.priority, fetchContent]);

  // 10. PERFORMANCE MONITORING
  const trackPerformance = useCallback(async (metric: string, value: number): Promise<void> => {
    try {
      await supabase.from('performance_metrics').insert({
        cache_key: cacheKey,
        metric_type: metric,
        metric_value: value,
        content_type: config.type,
        priority: config.priority,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Performance tracking error:', error);
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
  switch (config.type) {
    case 'news':
      return await fetchNewsContent(config.keywords, config.count);
    case 'funding':
      return await fetchFundingContent(config.keywords, config.count);
    case 'events':
      return await fetchEventsContent(config.keywords, config.count);
    case 'ai_summary':
      return await generateAISummary(config.keywords, config.count);
    default:
      throw new Error(`Unknown content type: ${config.type}`);
  }
}

async function fetchNewsContent(keywords: string[], count: number): Promise<any[]> {
  try {
    const query = keywords.join(' OR ');
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${count}&apikey=${CONFIG.API_KEYS.GNEWS}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`GNews API error: ${response.status}`);
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('News fetch error:', error);
    return [];
  }
}

async function fetchFundingContent(keywords: string[], count: number): Promise<any[]> {
  try {
    const newsContent = await fetchNewsContent(keywords, count);
    return newsContent.filter(article => 
      article.title.toLowerCase().includes('funding') ||
      article.title.toLowerCase().includes('series') ||
      article.title.toLowerCase().includes('raise')
    );
  } catch (error) {
    console.error('Funding fetch error:', error);
    return [];
  }
}

async function fetchEventsContent(keywords: string[], count: number): Promise<any[]> {
  try {
    const events = [];
    
    // Fetch from Meetup API
    const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=5');
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
  } catch (error) {
    console.error('Events fetch error:', error);
    return [];
  }
}

async function generateAISummary(keywords: string[], count: number): Promise<string> {
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.API_KEYS.GEMINI}`;
    
    const prompt = `Summarize the latest startup news and trends in 2-3 sentences. Focus on: ${keywords.join(', ')}.`;

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
  } catch (error) {
    console.error('AI summary error:', error);
    return 'Summary unavailable';
  }
}

async function getQuotaInfo(): Promise<any> {
  try {
    const { data } = await supabase
      .from('quota_management')
      .select('*');
    return data;
  } catch (error) {
    console.error('Quota info error:', error);
    return null;
  }
}

function getRefreshInterval(priority: 'high' | 'medium' | 'low'): number {
  switch (priority) {
    case 'high': return 2 * 60 * 60 * 1000; // 2 hours
    case 'medium': return 4 * 60 * 60 * 1000; // 4 hours
    case 'low': return 12 * 60 * 60 * 1000; // 12 hours
    default: return 4 * 60 * 60 * 1000;
  }
}