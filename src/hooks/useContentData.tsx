import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  enhancedDataService,
  getPageContent,
  searchContent,
  getAnalyticsData,
  getTrendingTopics,
  getSearchSuggestions
} from "@/services/enhancedDataService";
import { toast } from "sonner";

// Hook for page-specific content
export const usePageContent = (page: string, params?: any) => {
  return useQuery({
    queryKey: ['pageContent', page, params],
    queryFn: () => getPageContent(page, params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    onError: (error) => {
      console.error(`Error loading content for page ${page}:`, error);
      toast.error(`Failed to load ${page} content`);
    }
  });
};

// Hook for search functionality
export const useSearch = () => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<any>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const searchQuery = useQuery({
    queryKey: ['search', query, filters],
    queryFn: () => searchContent(query, filters),
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    onError: (error) => {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    }
  });

  const loadSuggestions = useCallback(async (searchQuery: string) => {
    try {
      const newSuggestions = await getSearchSuggestions(searchQuery);
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  }, []);

  const performSearch = useCallback((searchQuery: string, searchFilters?: any) => {
    setQuery(searchQuery);
    if (searchFilters) {
      setFilters(searchFilters);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    setFilters({});
    setSuggestions([]);
  }, []);

  return {
    query,
    filters,
    suggestions,
    results: searchQuery.data,
    isLoading: searchQuery.isLoading,
    error: searchQuery.error,
    performSearch,
    clearSearch,
    loadSuggestions,
    setFilters
  };
};

// Hook for analytics data
export const useAnalytics = () => {
  return useQuery({
    queryKey: ['analytics'],
    queryFn: getAnalyticsData,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    onError: (error) => {
      console.error('Analytics error:', error);
      toast.error('Failed to load analytics data');
    }
  });
};

// Hook for trending topics
export const useTrendingTopics = () => {
  return useQuery({
    queryKey: ['trendingTopics'],
    queryFn: getTrendingTopics,
    staleTime: 15 * 60 * 1000, // 15 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    onError: (error) => {
      console.error('Trending topics error:', error);
    }
  });
};

// Hook for sector-specific content
export const useSectorContent = (sector: string, count: number = 10) => {
  return useQuery({
    queryKey: ['sectorContent', sector, count],
    queryFn: () => enhancedDataService.getSectorContent(sector, count),
    enabled: !!sector,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error(`Error loading ${sector} content:`, error);
      toast.error(`Failed to load ${sector} content`);
    }
  });
};

// Hook for company profiles
export const useCompanyProfiles = (count: number = 10, sector?: string) => {
  return useQuery({
    queryKey: ['companyProfiles', count, sector],
    queryFn: () => enhancedDataService.getCompanyProfiles(count, sector),
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
      console.error('Error loading company profiles:', error);
      toast.error('Failed to load company profiles');
    }
  });
};

// Hook for dynamic content refresh
export const useContentRefresh = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshContent = useCallback(async (pattern?: string) => {
    setIsRefreshing(true);
    try {
      // Clear service cache
      enhancedDataService.clearCache(pattern);
      
      // Clear React Query cache
      if (pattern) {
        queryClient.invalidateQueries({ queryKey: [pattern] });
      } else {
        queryClient.clear();
      }
      
      // Pre-load fresh content
      await enhancedDataService.refreshContent();
      
      toast.success('Content refreshed successfully!');
    } catch (error) {
      console.error('Content refresh error:', error);
      toast.error('Failed to refresh content');
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const refreshPage = useCallback(async (page: string) => {
    setIsRefreshing(true);
    try {
      enhancedDataService.clearCache(`page-${page}`);
      queryClient.invalidateQueries({ queryKey: ['pageContent', page] });
      toast.success(`${page} content refreshed!`);
    } catch (error) {
      console.error(`Error refreshing ${page}:`, error);
      toast.error(`Failed to refresh ${page} content`);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  return {
    refreshContent,
    refreshPage,
    isRefreshing
  };
};

// Hook for infinite loading (for long lists)
export const useInfiniteContent = (contentType: 'articles' | 'funding' | 'companies', initialCount: number = 10) => {
  const [allContent, setAllContent] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    try {
      let newContent: any[] = [];
      
      switch (contentType) {
        case 'articles':
          newContent = await enhancedDataService.getNewsArticles(initialCount);
          break;
        case 'funding':
          newContent = await enhancedDataService.getFundingRounds(initialCount);
          break;
        case 'companies':
          newContent = await enhancedDataService.getCompanyProfiles(initialCount);
          break;
      }

      if (newContent.length < initialCount) {
        setHasMore(false);
      }

      setAllContent(prev => [...prev, ...newContent]);
      setPage(prev => prev + 1);
    } catch (error) {
      console.error(`Error loading more ${contentType}:`, error);
      toast.error(`Failed to load more ${contentType}`);
    } finally {
      setIsLoading(false);
    }
  }, [contentType, initialCount, isLoading, hasMore, page]);

  const reset = useCallback(() => {
    setAllContent([]);
    setPage(1);
    setHasMore(true);
  }, []);

  // Load initial content
  useEffect(() => {
    if (allContent.length === 0) {
      loadMore();
    }
  }, [loadMore, allContent.length]);

  return {
    content: allContent,
    hasMore,
    isLoading,
    loadMore,
    reset
  };
};

// Hook for real-time content updates (simulated)
export const useRealTimeUpdates = (interval: number = 30000) => {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      // Simulate real-time updates by invalidating some queries
      queryClient.invalidateQueries({ queryKey: ['pageContent', 'home'] });
      queryClient.invalidateQueries({ queryKey: ['trendingTopics'] });
      setLastUpdate(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [interval, queryClient]);

  return { lastUpdate };
};

// Hook for content personalization (basic implementation)
export const usePersonalizedContent = (userPreferences?: any) => {
  const [personalizedSectors, setPersonalizedSectors] = useState<string[]>([
    'AI & ML', 'Fintech', 'SaaS' // Default preferences
  ]);

  const personalizedQuery = useQuery({
    queryKey: ['personalizedContent', personalizedSectors],
    queryFn: async () => {
      const content = await Promise.all(
        personalizedSectors.map(sector => 
          enhancedDataService.getSectorContent(sector, 5)
        )
      );
      return content.flat();
    },
    staleTime: 10 * 60 * 1000,
    enabled: personalizedSectors.length > 0
  });

  const updatePreferences = useCallback((sectors: string[]) => {
    setPersonalizedSectors(sectors);
    // In a real app, this would save to user profile
    localStorage.setItem('userSectorPreferences', JSON.stringify(sectors));
  }, []);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userSectorPreferences');
    if (saved) {
      try {
        setPersonalizedSectors(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  }, []);

  return {
    personalizedContent: personalizedQuery.data,
    isLoading: personalizedQuery.isLoading,
    preferences: personalizedSectors,
    updatePreferences
  };
};

export default {
  usePageContent,
  useSearch,
  useAnalytics,
  useTrendingTopics,
  useSectorContent,
  useCompanyProfiles,
  useContentRefresh,
  useInfiniteContent,
  useRealTimeUpdates,
  usePersonalizedContent
};