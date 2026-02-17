import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchLatestArticles, mapDbArticleToNewsArticle } from "@/services/articlesService";
import type { NewsArticle } from "@/types/news";

// Hook for page-specific content
export const usePageContent = (page: string, params?: any) => {
  return useQuery({
    queryKey: ['pageContent', page, params],
    queryFn: async () => {
      if (page !== "home") {
        return { featuredArticles: [], trendingTopics: [] };
      }

      const rows = await fetchLatestArticles(params?.limit ?? 20);
      const articles = rows.map(mapDbArticleToNewsArticle);

      const categories = rows
        .map((r: any) => (typeof r.category === "string" ? r.category : null))
        .filter((c): c is string => Boolean(c && c.trim().length > 0));
      const trendingTopics = Array.from(
        categories.reduce((acc, c) => acc.set(c, (acc.get(c) ?? 0) + 1), new Map<string, number>()),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([c]) => c);

      return {
        featuredArticles: articles,
        trendingTopics,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    retry: 2,
    throwOnError: false,
  });
};

// Hook for search functionality
export const useSearch = () => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<any>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const searchQuery = useQuery({
    queryKey: ['search', query, filters],
    queryFn: async () => {
      const term = query.trim();
      if (term.length < 3) return { articles: [] as NewsArticle[] };

      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .or(`title.ilike.%${term}%,summary.ilike.%${term}%`)
        .order("published_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      const rows = (data ?? []) as any[];
      return { articles: rows.map(mapDbArticleToNewsArticle) };
    },
    enabled: query.length > 2,
    staleTime: 2 * 60 * 1000, // 2 minutes for search results
    throwOnError: false,
  });

  const loadSuggestions = useCallback(async (searchQuery: string) => {
    try {
      const term = searchQuery.trim();
      if (term.length < 2) {
        setSuggestions([]);
        return;
      }

      const { data, error } = await supabase
        .from("articles")
        .select("title")
        .ilike("title", `%${term}%`)
        .order("published_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      const titles = (data ?? []).map((r: any) => r.title).filter((t: any) => typeof t === "string");
      setSuggestions(titles);
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("category, id", { count: "exact" });
      if (error) throw error;

      const rows = (data ?? []) as any[];
      const byCategory = rows.reduce((acc: Record<string, number>, r: any) => {
        const c = typeof r.category === "string" && r.category.trim() ? r.category : "Uncategorized";
        acc[c] = (acc[c] ?? 0) + 1;
        return acc;
      }, {});

      return {
        totalArticles: rows.length,
        categories: Object.entries(byCategory).map(([category, count]) => ({ category, count })),
      };
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    throwOnError: false,
  });
};

// Hook for trending topics
export const useTrendingTopics = () => {
  return useQuery({
    queryKey: ['trendingTopics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("category")
        .order("published_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      const categories = (data ?? [])
        .map((r: any) => (typeof r.category === "string" ? r.category.trim() : ""))
        .filter(Boolean);

      const counts = categories.reduce((acc: Record<string, number>, c: string) => {
        acc[c] = (acc[c] ?? 0) + 1;
        return acc;
      }, {});

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([c]) => c);
    },
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    throwOnError: false,
  });
};

// Hook for sector-specific content
export const useSectorContent = (sector: string, count: number = 10) => {
  return useQuery({
    queryKey: ['sectorContent', sector, count],
    queryFn: async () => ({ sector, items: [] }),
    enabled: !!sector,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
};

// Hook for company profiles
export const useCompanyProfiles = (count: number = 10, sector?: string) => {
  return useQuery({
    queryKey: ['companyProfiles', count, sector],
    queryFn: async () => [],
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });
};

// Hook for dynamic content refresh
export const useContentRefresh = () => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshContent = useCallback(async (pattern?: string) => {
    setIsRefreshing(true);
    try {
      // Clear React Query cache
      if (pattern) {
        queryClient.invalidateQueries({ queryKey: [pattern] });
      } else {
        queryClient.invalidateQueries();
      }

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
        case 'articles': {
          const rows = await fetchLatestArticles(initialCount * page);
          const mapped = rows.map(mapDbArticleToNewsArticle);
          newContent = mapped.slice((page - 1) * initialCount, page * initialCount);
          break;
        }
        case 'funding':
          newContent = [];
          break;
        case 'companies': {
          newContent = [];
          break;
        }
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
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate(new Date());
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

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
      return [];
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