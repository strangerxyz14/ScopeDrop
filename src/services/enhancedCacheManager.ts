import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '@/config';

// Initialize Supabase client using centralized config
export const supabase = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY);

// Enhanced cache configuration with staging/production support
const CACHE_CONFIG = {
  // Browser cache (localStorage)
  browser: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
    prefix: 'scopedrop_cache_'
  },
  // Supabase cache (database)
  database: {
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    maxEntries: 1000,
    cleanupInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  // API rate limits (staging has reduced limits)
  api: {
    staging: {
      gnews: { dailyLimit: 100, hourlyLimit: 10, cooldown: 60 * 1000 },
      gemini: { dailyLimit: 1500, hourlyLimit: 150, cooldown: 2 * 1000 },
      reddit: { dailyLimit: 100, hourlyLimit: 6, cooldown: 60 * 1000 },
      hn: { dailyLimit: 100, hourlyLimit: 3, cooldown: 60 * 1000 },
      rss: { dailyLimit: 1000, hourlyLimit: 100, cooldown: 10 * 1000 },
      meetup: { dailyLimit: 100, hourlyLimit: 20, cooldown: 60 * 1000 }
    },
    production: {
      gnews: { dailyLimit: 1000, hourlyLimit: 100, cooldown: 60 * 1000 },
      gemini: { dailyLimit: 15000, hourlyLimit: 1500, cooldown: 2 * 1000 },
      reddit: { dailyLimit: 1000, hourlyLimit: 60, cooldown: 60 * 1000 },
      hn: { dailyLimit: 1000, hourlyLimit: 30, cooldown: 60 * 1000 },
      rss: { dailyLimit: 10000, hourlyLimit: 1000, cooldown: 10 * 1000 },
      meetup: { dailyLimit: 1000, hourlyLimit: 200, cooldown: 60 * 1000 }
    }
  },
  // Content refresh intervals
  refresh: {
    high: 2 * 60 * 60 * 1000, // 2 hours (funding)
    medium: 4 * 60 * 60 * 1000, // 4 hours (news)
    low: 12 * 60 * 60 * 1000 // 12 hours (events)
  }
};

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  source: string;
  metadata?: {
    apiCalls: number;
    lastRefreshed: number;
    quality: number;
    priority: 'high' | 'medium' | 'low';
  };
}

interface QuotaInfo {
  dailyLimit: number;
  hourlyLimit: number;
  dailyUsed: number;
  hourlyUsed: number;
  resetTime: Date;
  isActive: boolean;
}

export class EnhancedCacheManager {
  private static instance: EnhancedCacheManager;
  private apiUsage: Map<string, { calls: number; resetTime: number }> = new Map();
  private environment: 'staging' | 'production' = CONFIG.IS_PRODUCTION ? 'production' : 'staging';
  private lastCleanup: number = Date.now();

  static getInstance(): EnhancedCacheManager {
    if (!EnhancedCacheManager.instance) {
      EnhancedCacheManager.instance = new EnhancedCacheManager();
    }
    return EnhancedCacheManager.instance;
  }

  // 1. ENHANCED CACHE RETRIEVAL (Multi-layer with priority)
  async getCachedContent(key: string, source: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any | null> {
    try {
      // First, try browser cache
      const browserEntry = this.getBrowserCache(key);
      if (browserEntry && this.isValid(browserEntry)) {
        if (CONFIG.ENV === 'development') {
          console.log(`📦 Browser cache hit: ${key}`);
        }
        await this.recordCacheHit(key, 'browser');
        return browserEntry.data;
      }

      // Then, try database cache
      const dbEntry = await this.getDatabaseCache(key);
      if (dbEntry && this.isValid(dbEntry)) {
              if (CONFIG.ENV === 'development') {
        console.log(`🗄️ Database cache hit: ${key}`);
      }
        await this.recordCacheHit(key, 'database');
        
        // Store in browser cache for faster future access
        this.setBrowserCache(key, dbEntry.data, CACHE_CONFIG.browser.ttl);
        return dbEntry.data;
      }

      // Cache miss
      if (CONFIG.ENV === 'development') {
        console.log(`❌ Cache miss: ${key}`);
      }
      await this.recordCacheMiss(key, source);
      return null;

    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  // 2. INTELLIGENT CACHE STORAGE
  async setCachedContent(key: string, data: any, source: string, ttl?: number, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    try {
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl: ttl || this.getTTLForPriority(priority),
        source,
        metadata: {
          apiCalls: 1,
          lastRefreshed: Date.now(),
          quality: this.calculateQualityScore(data),
          priority
        }
      };

      // Store in both browser and database
      this.setBrowserCache(key, data, CACHE_CONFIG.browser.ttl);
      await this.setDatabaseCache(entry);

      if (CONFIG.ENV === 'development') {
        console.log(`💾 Cache stored: ${key} (${priority} priority)`);
      }

    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  // 3. ENHANCED API QUOTA MANAGEMENT
  async canMakeApiCall(source: string): Promise<boolean> {
    try {
      const quotaInfo = await this.getQuotaInfo(source);
      return quotaInfo.isActive && 
             quotaInfo.dailyUsed < quotaInfo.dailyLimit && 
             quotaInfo.hourlyUsed < quotaInfo.hourlyLimit;
    } catch (error) {
      console.error('Quota check error:', error);
      return false;
    }
  }

  async recordApiCall(source: string, responseTime?: number, statusCode?: number): Promise<void> {
    try {
      const usage = this.getApiUsage(source);
      usage.calls++;
      
      // Update database quota tracking
      await supabase.rpc('update_quota_usage', {
        api_type_param: source,
        used_count: 1
      });

      // Record performance metrics
      if (responseTime && statusCode) {
        await supabase.from('performance_metrics').insert({
          api_type: source,
          response_time: responseTime,
          status_code: statusCode,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('API call recording error:', error);
    }
  }

  // 4. SMART REFRESH LOGIC WITH PRIORITY
  shouldRefreshContent(key: string, priority: 'high' | 'medium' | 'low'): boolean {
    try {
      const browserEntry = this.getBrowserCache(key);
      if (!browserEntry) return true;

      const now = Date.now();
      const age = now - browserEntry.timestamp;
      const refreshInterval = CACHE_CONFIG.refresh[priority];

      const shouldRefresh = age > refreshInterval;
      
      if (CONFIG.ENV === 'development' && shouldRefresh) {
        console.log(`🔄 Content needs refresh: ${key} (${priority} priority)`);
      }

      return shouldRefresh;
    } catch (error) {
      console.error('Refresh check error:', error);
      return true;
    }
  }

  // 5. CACHE INVALIDATION STRATEGY
  async invalidateCache(pattern: string, type?: string): Promise<void> {
    try {
      // Clear browser cache
      const keys = Object.keys(localStorage);
      const cachePrefix = CACHE_CONFIG.browser.prefix;
      
      keys.forEach(key => {
        if (key.startsWith(cachePrefix) && key.includes(pattern)) {
          localStorage.removeItem(key);
        }
      });

      // Clear database cache
      let query = supabase.from('content_cache').delete();
      if (type) {
        query = query.eq('cache_type', type);
      }
      await query.ilike('cache_key', `%${pattern}%`);

      if (CONFIG.ENV === 'development') {
        console.log(`🗑️ Cache invalidated: ${pattern}`);
      }

    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // 6. PERFORMANCE MONITORING
  async recordCacheHit(key: string, layer: 'browser' | 'database'): Promise<void> {
    try {
      await supabase.from('content_analytics').insert({
        cache_key: key,
        hit_type: layer,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Cache hit recording error:', error);
    }
  }

  async recordCacheMiss(key: string, source: string): Promise<void> {
    try {
      await supabase.from('content_analytics').insert({
        cache_key: key,
        hit_type: 'miss',
        source: source,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Cache miss recording error:', error);
    }
  }

  // 7. AUTOMATIC CLEANUP
  async performCleanup(): Promise<void> {
    try {
      const now = Date.now();
      if (now - this.lastCleanup < CACHE_CONFIG.database.cleanupInterval) {
        return;
      }

      // Clean browser cache
      this.cleanupBrowserCache();

      // Clean database cache
      await supabase.rpc('cleanup_expired_cache');

      this.lastCleanup = now;

      if (CONFIG.ENV === 'development') {
        console.log('🧹 Cache cleanup completed');
      }

    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  // HELPER METHODS
  private getTTLForPriority(priority: 'high' | 'medium' | 'low'): number {
    return CACHE_CONFIG.refresh[priority];
  }

  private async getQuotaInfo(source: string): Promise<QuotaInfo> {
    try {
      const { data } = await supabase
        .from('quota_management')
        .select('*')
        .eq('api_type', source)
        .single();

      if (data) {
        return {
          dailyLimit: data.daily_limit,
          hourlyLimit: data.hourly_limit,
          dailyUsed: data.daily_used || 0,
          hourlyUsed: data.hourly_used || 0,
          resetTime: new Date(data.reset_time),
          isActive: data.is_active
        };
      }

      // Fallback to default limits
      const limits = CACHE_CONFIG.api[this.environment][source as keyof typeof CACHE_CONFIG.api.staging] || 
                    CACHE_CONFIG.api.staging.gnews;
      
      return {
        dailyLimit: limits.dailyLimit,
        hourlyLimit: limits.hourlyLimit,
        dailyUsed: 0,
        hourlyUsed: 0,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isActive: true
      };

    } catch (error) {
      console.error('Quota info error:', error);
      return {
        dailyLimit: 100,
        hourlyLimit: 10,
        dailyUsed: 0,
        hourlyUsed: 0,
        resetTime: new Date(),
        isActive: false
      };
    }
  }

  private async resetQuota(source: string): Promise<void> {
    try {
      await supabase
        .from('quota_management')
        .update({
          daily_used: 0,
          hourly_used: 0,
          reset_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('api_type', source);
    } catch (error) {
      console.error('Quota reset error:', error);
    }
  }

  private calculateQualityScore(data: any): number {
    if (!data) return 0;
    
    let score = 0;
    
    // Check if data has required fields
    if (Array.isArray(data) && data.length > 0) score += 30;
    if (typeof data === 'object' && data !== null) score += 20;
    
    // Check data freshness
    if (data.publishedAt || data.timestamp) {
      const age = Date.now() - new Date(data.publishedAt || data.timestamp).getTime();
      if (age < 24 * 60 * 60 * 1000) score += 30; // Less than 24 hours
      else if (age < 7 * 24 * 60 * 60 * 1000) score += 20; // Less than 7 days
      else score += 10;
    }
    
    // Check data completeness
    if (data.title && data.description) score += 20;
    
    return Math.min(score, 100);
  }

  private getBrowserCache(key: string): CacheEntry | null {
    try {
      const cacheKey = CACHE_CONFIG.browser.prefix + key;
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  private setBrowserCache(key: string, data: any, ttl: number): void {
    try {
      const cacheKey = CACHE_CONFIG.browser.prefix + key;
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        source: 'browser'
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Browser cache storage error:', error);
    }
  }

  private cleanupBrowserCache(): void {
    try {
      const keys = Object.keys(localStorage);
      const cachePrefix = CACHE_CONFIG.browser.prefix;
      const now = Date.now();
      
      keys.forEach(key => {
        if (key.startsWith(cachePrefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(key) || '{}');
            if (entry && (now - entry.timestamp > entry.ttl)) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            localStorage.removeItem(key);
          }
        }
      });
    } catch (error) {
      console.error('Browser cache cleanup error:', error);
    }
  }

  private async getDatabaseCache(key: string): Promise<CacheEntry | null> {
    try {
      const { data } = await supabase
        .from('content_cache')
        .select('*')
        .eq('cache_key', key)
        .single();

      if (data) {
        return {
          key: data.cache_key,
          data: data.cache_data,
          timestamp: new Date(data.created_at).getTime(),
          ttl: data.ttl,
          source: data.source,
          metadata: data.metadata
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async setDatabaseCache(entry: CacheEntry): Promise<void> {
    try {
      await supabase.from('content_cache').upsert({
        cache_key: entry.key,
        cache_data: entry.data,
        cache_type: this.getCacheType(entry.key),
        source: entry.source,
        ttl: entry.ttl,
        quality_score: entry.metadata?.quality || 0,
        metadata: entry.metadata
      });
    } catch (error) {
      console.error('Database cache storage error:', error);
    }
  }

  private getCacheType(key: string): string {
    if (key.includes('news')) return 'news';
    if (key.includes('funding')) return 'funding';
    if (key.includes('events')) return 'events';
    if (key.includes('ai_')) return 'ai_summary';
    return 'general';
  }

  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return entry && (now - entry.timestamp < entry.ttl);
  }

  private getApiUsage(source: string): { calls: number; resetTime: number } {
    if (!this.apiUsage.has(source)) {
      this.apiUsage.set(source, { calls: 0, resetTime: Date.now() + 60 * 60 * 1000 });
    }
    return this.apiUsage.get(source)!;
  }

  getApiLimits(source: string) {
    return CACHE_CONFIG.api[this.environment][source as keyof typeof CACHE_CONFIG.api.staging] || 
           CACHE_CONFIG.api.staging.gnews;
  }

  getEnvironment(): 'staging' | 'production' {
    return this.environment;
  }
}

export const enhancedCacheManager = EnhancedCacheManager.getInstance();