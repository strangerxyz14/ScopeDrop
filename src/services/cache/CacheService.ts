import { CONFIG } from '@/config';
import { CacheEntry, AppError } from '@/types';

export class CacheService {
  private static instance: CacheService;
  private memoryCache: Map<string, CacheEntry> = new Map();
  private localStoragePrefix: string;
  private maxMemorySize: number;
  private maxLocalStorageSize: number;

  constructor() {
    this.localStoragePrefix = CONFIG.CACHE.PREFIX;
    this.maxMemorySize = CONFIG.CACHE.MAX_SIZE;
    this.maxLocalStorageSize = 5 * 1024 * 1024; // 5MB for sessionStorage
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Set cache entry in memory and sessionStorage
   */
  async set(key: string, data: any, ttl: number = CONFIG.CACHE.BROWSER_TTL, metadata?: CacheEntry['metadata']): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl,
      source: 'cache_service',
      metadata,
    };

    // Set in memory cache
    this.memoryCache.set(key, entry);

    // Set in sessionStorage
    try {
      const localStorageKey = `${this.localStoragePrefix}${key}`;
      sessionStorage.setItem(localStorageKey, JSON.stringify(entry));
    } catch (error) {
      console.warn('Failed to set cache in sessionStorage:', error);
      // If storage is full, clear old entries
      this.cleanupLocalStorage();
    }

    // Cleanup if memory cache is too large
    this.cleanupMemoryCache();
  }

  /**
   * Get cache entry from memory first, then sessionStorage
   */
  async get<T = any>(key: string): Promise<T | null> {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Try sessionStorage
    try {
      const localStorageKey = `${this.localStoragePrefix}${key}`;
      const stored = sessionStorage.getItem(localStorageKey);
      
      if (stored) {
        const entry: CacheEntry = JSON.parse(stored);
        
        if (!this.isExpired(entry)) {
          // Update memory cache
          this.memoryCache.set(key, entry);
          return entry.data as T;
        } else {
          // Remove expired entry
          this.remove(key);
        }
      }
    } catch (error) {
      console.warn('Failed to get cache from sessionStorage:', error);
    }

    return null;
  }

  /**
   * Remove cache entry from both memory and sessionStorage
   */
  async remove(key: string): Promise<void> {
    // Remove from memory cache
    this.memoryCache.delete(key);

    // Remove from sessionStorage
    try {
      const localStorageKey = `${this.localStoragePrefix}${key}`;
      sessionStorage.removeItem(localStorageKey);
    } catch (error) {
      console.warn('Failed to remove cache from sessionStorage:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear sessionStorage cache
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear sessionStorage cache:', error);
    }
  }

  /**
   * Check if cache entry exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.get(key);
    return entry !== null;
  }

  /**
   * Get cache entry with metadata
   */
  async getWithMetadata<T = any>(key: string): Promise<{ data: T | null; metadata?: CacheEntry['metadata'] }> {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return {
        data: memoryEntry.data as T,
        metadata: memoryEntry.metadata,
      };
    }

    try {
      const localStorageKey = `${this.localStoragePrefix}${key}`;
      const stored = sessionStorage.getItem(localStorageKey);
      
      if (stored) {
        const entry: CacheEntry = JSON.parse(stored);
        
        if (!this.isExpired(entry)) {
          this.memoryCache.set(key, entry);
          return {
            data: entry.data as T,
            metadata: entry.metadata,
          };
        } else {
          this.remove(key);
        }
      }
    } catch (error) {
      console.warn('Failed to get cache metadata from sessionStorage:', error);
    }

    return { data: null };
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryEntries: number;
    localStorageSize: number;
    localStorageEntries: number;
    totalSize: number;
  } {
    // Calculate memory cache size
    const memorySize = this.calculateMemorySize();
    const memoryEntries = this.memoryCache.size;

    // Calculate sessionStorage cache size
    let localStorageSize = 0;
    let localStorageEntries = 0;

    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          const value = sessionStorage.getItem(key);
          if (value) {
            localStorageSize += new Blob([value]).size;
            localStorageEntries++;
          }
        }
      });
    } catch (error) {
      console.warn('Failed to calculate sessionStorage stats:', error);
    }

    return {
      memorySize,
      memoryEntries,
      localStorageSize,
      localStorageEntries,
      totalSize: memorySize + localStorageSize,
    };
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // Cleanup sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          const stored = sessionStorage.getItem(key);
          if (stored) {
            try {
              const entry: CacheEntry = JSON.parse(stored);
              if (this.isExpired(entry)) {
                sessionStorage.removeItem(key);
              }
            } catch (error) {
              // Remove invalid entries
              sessionStorage.removeItem(key);
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to cleanup sessionStorage:', error);
    }
  }

  /**
   * Set cache with priority (for important data)
   */
  async setWithPriority(
    key: string,
    data: any,
    priority: 'high' | 'medium' | 'low' = 'medium',
    ttl: number = CONFIG.CACHE.BROWSER_TTL
  ): Promise<void> {
    const metadata: CacheEntry['metadata'] = {
      apiCalls: 0,
      lastRefreshed: Date.now(),
      quality: this.getPriorityQuality(priority),
      priority,
    };

    await this.set(key, data, ttl, metadata);
  }

  /**
   * Get cache keys by pattern
   */
  async getKeys(pattern?: string): Promise<string[]> {
    const keys: string[] = [];

    // Get memory cache keys
    for (const key of this.memoryCache.keys()) {
      if (!pattern || key.includes(pattern)) {
        keys.push(key);
      }
    }

    // Get sessionStorage keys
    try {
      const localStorageKeys = Object.keys(sessionStorage);
      localStorageKeys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          const cacheKey = key.replace(this.localStoragePrefix, '');
          if (!pattern || cacheKey.includes(pattern)) {
            keys.push(cacheKey);
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get sessionStorage keys:', error);
    }

    return [...new Set(keys)]; // Remove duplicates
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.getKeys(pattern);
    for (const key of keys) {
      await this.remove(key);
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    return now > entry.timestamp + entry.ttl;
  }

  /**
   * Calculate memory cache size
   */
  private calculateMemorySize(): number {
    let size = 0;
    for (const [key, entry] of this.memoryCache.entries()) {
      size += new Blob([key]).size;
      size += new Blob([JSON.stringify(entry.data)]).size;
    }
    return size;
  }

  /**
   * Cleanup memory cache if too large
   */
  private cleanupMemoryCache(): void {
    if (this.calculateMemorySize() > this.maxMemorySize) {
      // Remove oldest entries
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const entriesToRemove = Math.ceil(entries.length * 0.2); // Remove 20%
      for (let i = 0; i < entriesToRemove; i++) {
        this.memoryCache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Cleanup localStorage if too large
   */
  private cleanupLocalStorage(): void {
    try {
      const entries: Array<{ key: string; size: number; timestamp: number }> = [];
      
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith(this.localStoragePrefix)) {
          const value = sessionStorage.getItem(key);
          if (value) {
            try {
              const entry: CacheEntry = JSON.parse(value);
              entries.push({
                key,
                size: new Blob([value]).size,
                timestamp: entry.timestamp,
              });
            } catch (error) {
              // Remove invalid entries
              sessionStorage.removeItem(key);
            }
          }
        }
      });

      // Calculate total size
      const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
      
      if (totalSize > this.maxLocalStorageSize) {
        // Remove oldest entries
        entries.sort((a, b) => a.timestamp - b.timestamp);
        
        let removedSize = 0;
        const targetRemoval = totalSize - this.maxLocalStorageSize * 0.8; // Remove to 80% of max
        
        for (const entry of entries) {
          if (removedSize >= targetRemoval) break;
          sessionStorage.removeItem(entry.key);
          removedSize += entry.size;
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup sessionStorage:', error);
    }
  }

  /**
   * Get quality score based on priority
   */
  private getPriorityQuality(priority: 'high' | 'medium' | 'low'): number {
    switch (priority) {
      case 'high': return 1.0;
      case 'medium': return 0.7;
      case 'low': return 0.4;
      default: return 0.5;
    }
  }

  /**
   * Health check for cache service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test memory cache
      const testKey = 'health_check_test';
      const testData = { test: true, timestamp: Date.now() };
      
      await this.set(testKey, testData, 1000);
      const retrieved = await this.get(testKey);
      
      if (!retrieved || !retrieved.test) {
        return false;
      }

      // Test localStorage
      await this.set(`${testKey}_local`, testData, 1000);
      const retrievedLocal = await this.get(`${testKey}_local`);
      
      if (!retrievedLocal || !retrievedLocal.test) {
        return false;
      }

      // Cleanup test data
      await this.remove(testKey);
      await this.remove(`${testKey}_local`);
      
      return true;
    } catch (error) {
      console.error('Cache service health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();