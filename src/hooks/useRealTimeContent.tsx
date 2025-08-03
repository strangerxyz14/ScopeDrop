import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { realTimeContentAggregator } from "@/services/realTimeContentAPIs";
import { contentScheduler } from "@/services/contentScheduler";
import { toast } from "sonner";

// Hook to get real-time content with automatic refresh
export const useRealTimeContent = (contentType: 'all' | 'news' | 'trending' | 'events' | 'market' = 'all') => {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Main query for real-time content
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['realTimeContent', contentType],
    queryFn: async () => {
      console.log(`🔄 Fetching real-time ${contentType} content...`);
      
      try {
        if (contentType === 'all') {
          const content = await realTimeContentAggregator.getEnhancedContent();
          console.log(`✅ Fetched ${content.articles.length} articles, ${content.events.length} events`);
          return content;
        } else {
          // Fetch specific content type
          const content = await realTimeContentAggregator.aggregateAllContent();
          return content;
        }
      } catch (error) {
        console.error(`❌ Failed to fetch ${contentType} content:`, error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    throwOnError: false,
    onSuccess: (data) => {
      setLastRefresh(new Date());
      console.log(`✅ Successfully loaded ${contentType} content`);
    }
  });

  // Manual refresh function
  const refreshContent = async () => {
    try {
      await contentScheduler.manualRefresh(contentType);
      await refetch();
      toast.success(`${contentType} content refreshed!`);
    } catch (error) {
      toast.error(`Failed to refresh ${contentType} content`);
    }
  };

  // Auto-refresh when scheduler updates content
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'freshContent' || e.key === `fresh${contentType}`) {
        console.log(`📡 Detected fresh ${contentType} content, refreshing...`);
        refetch();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contentType, refetch]);

  return {
    data,
    isLoading,
    error,
    lastRefresh,
    refreshContent,
    isStale: data ? Date.now() - lastRefresh.getTime() > 30 * 60 * 1000 : true // 30 minutes
  };
};

// Hook specifically for news content
export const useRealTimeNews = () => {
  const { data, isLoading, error, refreshContent, lastRefresh } = useRealTimeContent('news');
  
  return {
    articles: data?.articles || [],
    isLoading,
    error,
    refreshNews: refreshContent,
    lastRefresh
  };
};

// Hook specifically for trending content
export const useRealTimeTrending = () => {
  const { data, isLoading, error, refreshContent, lastRefresh } = useRealTimeContent('trending');
  
  return {
    trending: data?.trending || [],
    isLoading,
    error,
    refreshTrending: refreshContent,
    lastRefresh
  };
};

// Hook specifically for events
export const useRealTimeEvents = () => {
  const { data, isLoading, error, refreshContent, lastRefresh } = useRealTimeContent('events');
  
  return {
    events: data?.events || [],
    isLoading,
    error,
    refreshEvents: refreshContent,
    lastRefresh
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
    newsapi: !!import.meta.env.VITE_NEWSAPI_KEY && import.meta.env.VITE_NEWSAPI_KEY !== 'your_newsapi_key_here',
    github: !!import.meta.env.VITE_GITHUB_TOKEN && import.meta.env.VITE_GITHUB_TOKEN !== 'your_github_token_here',
    huggingface: !!import.meta.env.VITE_HUGGINGFACE_TOKEN && import.meta.env.VITE_HUGGINGFACE_TOKEN !== 'your_huggingface_token_here',
    producthunt: !!import.meta.env.VITE_PRODUCTHUNT_TOKEN && import.meta.env.VITE_PRODUCTHUNT_TOKEN !== 'your_producthunt_token_here',
    alphavantage: !!import.meta.env.VITE_ALPHAVANTAGE_KEY && import.meta.env.VITE_ALPHAVANTAGE_KEY !== 'your_alphavantage_key_here',
    eventbrite: !!import.meta.env.VITE_EVENTBRITE_TOKEN && import.meta.env.VITE_EVENTBRITE_TOKEN !== 'your_eventbrite_token_here'
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