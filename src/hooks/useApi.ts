import { useState, useEffect, useCallback, useRef } from 'react';
import { UseApiOptions, AppError, LoadingState } from '@/types';
import { cacheService } from '@/services/cache/CacheService';
import { CONFIG } from '@/config';

interface UseApiState<T> extends LoadingState {
  data: T | null;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export function useApi<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> {
  const {
    enabled = true,
    refetchInterval,
    retry = true,
    retryDelay = CONFIG.PERFORMANCE.RETRY_DELAY,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    retryCount: 0,
    refetch: async () => {},
    clearCache: async () => {},
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Create refetch function
  const refetch = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      const data = await fetcher();
      
      setState(prev => ({
        ...prev,
        data,
        isRefreshing: false,
        error: null,
        retryCount: 0,
      }));

      // Cache the result
      await cacheService.set(key, data, CONFIG.CACHE.BROWSER_TTL);

      onSuccess?.(data);
    } catch (error) {
      const appError = error as AppError;
      
      setState(prev => ({
        ...prev,
        isRefreshing: false,
        error: appError,
        retryCount: prev.retryCount + 1,
      }));

      onError?.(appError);
    }
  }, [key, fetcher, enabled, onSuccess, onError]);

  // Create clear cache function
  const clearCache = useCallback(async () => {
    await cacheService.remove(key);
    setState(prev => ({ ...prev, data: null }));
  }, [key]);

  // Initial fetch
  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // Try cache first
        const cachedData = await cacheService.get<T>(key);
        
        if (cachedData) {
          setState(prev => ({
            ...prev,
            data: cachedData,
            isLoading: false,
            error: null,
          }));
          return;
        }

        // Fetch from API
        await refetch();
      } catch (error) {
        const appError = error as AppError;
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: appError,
        }));

        onError?.(appError);
      }
    };

    fetchData();
  }, [key, enabled, refetch, onError]);

  // Set up refetch interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(refetch, refetchInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refetchInterval, enabled, refetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Update state with refetch and clearCache functions
  useEffect(() => {
    setState(prev => ({
      ...prev,
      refetch,
      clearCache,
    }));
  }, [refetch, clearCache]);

  return state;
}

// Hook for API calls with automatic retry
export function useApiWithRetry<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiOptions & { maxRetries?: number } = {}
): UseApiState<T> {
  const { maxRetries = CONFIG.PERFORMANCE.MAX_RETRIES, ...apiOptions } = options;
  const [retryCount, setRetryCount] = useState(0);

  const retryFetcher = useCallback(async () => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fetcher();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        setRetryCount(attempt);
        await new Promise(resolve => setTimeout(resolve, CONFIG.PERFORMANCE.RETRY_DELAY * attempt));
      }
    }
  }, [fetcher, maxRetries]);

  return useApi(key, retryFetcher, {
    ...apiOptions,
    onError: (error) => {
      if (retryCount < maxRetries) {
        console.warn(`API call failed, retrying... (${retryCount + 1}/${maxRetries})`);
      }
      apiOptions.onError?.(error);
    },
  });
}

// Hook for optimistic updates
export function useOptimisticApi<T = any>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & {
  updateOptimistically: (updater: (data: T) => T) => void;
} {
  const apiState = useApi(key, fetcher, options);

  const updateOptimistically = useCallback((updater: (data: T) => T) => {
    if (apiState.data) {
      const optimisticData = updater(apiState.data);
      setState(prev => ({ ...prev, data: optimisticData }));
      
      // Cache the optimistic update
      cacheService.set(key, optimisticData, CONFIG.CACHE.BROWSER_TTL);
    }
  }, [apiState.data, key]);

  return {
    ...apiState,
    updateOptimistically,
  };
}

// Hook for paginated API calls
export function usePaginatedApi<T = any>(
  key: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; total: number }>,
  options: UseApiOptions & { pageSize?: number } = {}
): UseApiState<{ data: T[]; total: number }> & {
  page: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
} {
  const { pageSize = 10, ...apiOptions } = options;
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const paginatedFetcher = useCallback(async () => {
    const result = await fetcher(page, pageSize);
    setTotal(result.total);
    return result;
  }, [fetcher, page, pageSize]);

  const apiState = useApi(`${key}_page_${page}`, paginatedFetcher, apiOptions);

  const hasNextPage = page * pageSize < total;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / pageSize)) {
      setPage(newPage);
    }
  }, [total, pageSize]);

  return {
    ...apiState,
    page,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
  };
}

// Hook for infinite scroll API calls
export function useInfiniteApi<T = any>(
  key: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean }>,
  options: UseApiOptions & { pageSize?: number } = {}
): UseApiState<{ data: T[]; hasMore: boolean }> & {
  loadMore: () => Promise<void>;
  hasMore: boolean;
  reset: () => void;
} {
  const { pageSize = 10, ...apiOptions } = options;
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);

  const infiniteFetcher = useCallback(async () => {
    const result = await fetcher(page, pageSize);
    setAllData(prev => page === 1 ? result.data : [...prev, ...result.data]);
    setHasMore(result.hasMore);
    return { data: allData, hasMore: result.hasMore };
  }, [fetcher, page, pageSize, allData]);

  const apiState = useApi(`${key}_infinite`, infiniteFetcher, apiOptions);

  const loadMore = useCallback(async () => {
    if (hasMore && !apiState.isLoading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, apiState.isLoading]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, []);

  return {
    ...apiState,
    loadMore,
    hasMore,
    reset,
  };
}