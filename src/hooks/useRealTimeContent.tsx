import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useEnhancedSmartContent } from "./useEnhancedSmartContent";
import { toast } from "sonner";

// Hook to get real-time content with enhanced caching and Edge Function support
export const useRealTimeContent = (contentType: 'all' | 'news' | 'trending' | 'events' | 'market' = 'all') => {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Enhanced content configuration based on type
  const getContentConfig = () => {
    const baseConfig = {
      count: 20,
      autoRefresh: true,
      useEdgeFunction: true
    };

    switch (contentType) {
      case 'news':
        return {
          ...baseConfig,
          type: 'news' as const,
          keywords: ['startup', 'tech', 'innovation'],
          priority: 'high' as const,
          refreshInterval: 4 * 60 * 60 * 1000 // 4 hours
        };
      case 'trending':
        return {
          ...baseConfig,
          type: 'news' as const,
          keywords: ['trending', 'viral', 'popular'],
          priority: 'high' as const,
          refreshInterval: 2 * 60 * 60 * 1000 // 2 hours
        };
      case 'events':
        return {
          ...baseConfig,
          type: 'events' as const,
          keywords: ['startup events', 'tech conferences'],
          priority: 'medium' as const,
          refreshInterval: 12 * 60 * 60 * 1000 // 12 hours
        };
      case 'market':
        return {
          ...baseConfig,
          type: 'funding' as const,
          keywords: ['funding', 'venture capital', 'investment'],
          priority: 'high' as const,
          refreshInterval: 2 * 60 * 60 * 1000 // 2 hours
        };
      default:
        return {
          ...baseConfig,
          type: 'news' as const,
          keywords: ['startup', 'tech'],
          priority: 'medium' as const,
          refreshInterval: 4 * 60 * 60 * 1000 // 4 hours
        };
    }
  };

  // Use enhanced smart content hook
  const {
    data,
    isLoading,
    isRefreshing,
    isStale,
    lastUpdated,
    error,
    cacheStatus,
    refresh,
    quotaInfo,
    performanceMetrics
  } = useEnhancedSmartContent(getContentConfig());

  // Update last refresh when data changes
  useEffect(() => {
    if (data && !isLoading) {
      setLastRefresh(new Date());
    }
  }, [data, isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error(`Error loading ${contentType} content:`, error);
      toast.error(`Failed to load ${contentType} content`);
    }
  }, [error, contentType]);

  // Manual refresh function
  const refreshContent = async () => {
    try {
      await refresh();
      toast.success(`${contentType} content refreshed!`);
    } catch (error) {
      toast.error(`Failed to refresh ${contentType} content`);
    }
  };

  return {
    data,
    isLoading,
    isRefreshing,
    error,
    lastRefresh,
    refreshContent,
    isStale,
    cacheStatus,
    quotaInfo,
    performanceMetrics
  };
};

// Hook specifically for news content
export const useRealTimeNews = () => {
  const { data, isLoading, error, refreshContent, lastRefresh, cacheStatus, quotaInfo } = useRealTimeContent('news');
  
  return {
    articles: data || [],
    isLoading,
    error,
    refreshNews: refreshContent,
    lastRefresh,
    cacheStatus,
    quotaInfo
  };
};

// Hook specifically for trending content
export const useRealTimeTrending = () => {
  const { data, isLoading, error, refreshContent, lastRefresh, cacheStatus, quotaInfo } = useRealTimeContent('trending');
  
  return {
    trending: data || [],
    isLoading,
    error,
    refreshTrending: refreshContent,
    lastRefresh,
    cacheStatus,
    quotaInfo
  };
};

// Hook specifically for events
export const useRealTimeEvents = () => {
  const { data, isLoading, error, refreshContent, lastRefresh, cacheStatus, quotaInfo } = useRealTimeContent('events');
  
  return {
    events: data || [],
    isLoading,
    error,
    refreshEvents: refreshContent,
    lastRefresh,
    cacheStatus,
    quotaInfo
  };
};

// Hook for content scheduler status
export const useContentSchedulerStatus = () => {
  const [status, setStatus] = useState(contentScheduler.getJobStatus());
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(contentScheduler.getJobStatus());
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const startScheduler = () => {
    contentScheduler.start();
    setIsRunning(true);
    toast.success('Content scheduler started');
  };

  const stopScheduler = () => {
    contentScheduler.stop();
    setIsRunning(false);
    toast.info('Content scheduler stopped');
  };

  const manualRefresh = async (type: 'all' | 'news' | 'trending' | 'events' | 'market' = 'all') => {
    await contentScheduler.manualRefresh(type);
    toast.success(`${type} content refreshed manually`);
  };

  return {
    status,
    isRunning,
    startScheduler,
    stopScheduler,
    manualRefresh
  };
};

// Hook to check if APIs are configured
export const useAPIConfiguration = () => {
  const [configStatus, setConfigStatus] = useState({
    gnews: !!import.meta.env.VITE_GNEWS_API_KEY && import.meta.env.VITE_GNEWS_API_KEY !== 'your-gnews-api-key-here',
    gemini: !!import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your-gemini-api-key-here',
    supabase: !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
    edgeFunctions: !!import.meta.env.VITE_USE_EDGE_FUNCTIONS
  });

  const configuredCount = Object.values(configStatus).filter(Boolean).length;
  const totalCount = Object.keys(configStatus).length;
  const configurationPercentage = Math.round((configuredCount / totalCount) * 100);

  const isFullyConfigured = configuredCount === totalCount;
  const hasMinimumConfig = configStatus.newsapi || configStatus.github; // At least one working API

  return {
    configStatus,
    configuredCount,
    totalCount,
    configurationPercentage,
    isFullyConfigured,
    hasMinimumConfig,
    missingAPIs: Object.entries(configStatus)
      .filter(([_, configured]) => !configured)
      .map(([api]) => api)
  };
};