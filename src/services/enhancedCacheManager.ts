import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kudoyccddmdilphlwann.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
  private environment: 'staging' | 'production' = process.env.NODE_ENV === 'production' ? 'production' : 'staging';
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
      // Layer 1: Browser cache (fastest)
      const browserCache = this.getBrowserCache(key);
      if (browserCache && this.isValid(browserCache)) {
        console.log(`📦 Browser cache hit: ${key}`);
        await this.recordCacheHit(key, 'browser');
        return browserCache.data;
      }

      // Layer 2: Database cache
      const dbCache = await this.getDatabaseCache(key);
      if (dbCache && this.isValid(dbCache)) {
        console.log(`🗄️ Database cache hit: ${key}`);
        // Refresh browser cache
        this.setBrowserCache(key, dbCache.data, dbCache.ttl);
        await this.recordCacheHit(key, 'database');
        return dbCache.data;
      }

      // Check if content should be refreshed based on priority
      if (this.shouldRefreshContent(key, priority)) {
        console.log(`🔄 Content needs refresh: ${key} (${priority} priority)`);
        return null; // Force refresh
      }

      return null;
    } catch (error) {
      console.error('Error retrieving cached content:', error);
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
          apiCalls: this.getApiUsage(source).calls,
          lastRefreshed: Date.now(),
          quality: this.calculateQualityScore(data),
          priority
        }
      };

      // Store in both layers
      this.setBrowserCache(key, data, CACHE_CONFIG.browser.ttl);
      await this.setDatabaseCache(entry);

      // Record cache miss for analytics
      await this.recordCacheMiss(key, source);

      console.log(`💾 Cached content: ${key} (${priority} priority, ${source} source)`);
    } catch (error) {
      console.error('Error storing cached content:', error);
    }
  }

  // 3. ENHANCED API QUOTA MANAGEMENT
  async canMakeApiCall(source: string): Promise<boolean> {
    try {
      // Get quota info from database
      const quotaInfo = await this.getQuotaInfo(source);
      
      if (!quotaInfo.isActive) {
        console.warn(`🚫 API ${source} is disabled`);
        return false;
      }

      const now = Date.now();
      
      // Check if we need to reset quotas
      if (now > quotaInfo.resetTime.getTime()) {
        await this.resetQuota(source);
        return true;
      }

      // Check limits
      if (quotaInfo.dailyUsed >= quotaInfo.dailyLimit) {
        console.warn(`🚫 Daily API limit reached for ${source}`);
        return false;
      }

      if (quotaInfo.hourlyUsed >= quotaInfo.hourlyLimit) {
        console.warn(`⏰ Hourly API limit reached for ${source}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking API quota:', error);
      return false; // Fail safe
    }
  }

  async recordApiCall(source: string, responseTime?: number, statusCode?: number): Promise<void> {
    try {
      // Update local usage
      const usage = this.getApiUsage(source);
      usage.calls++;

      // Update database
      await supabase.rpc('update_quota_usage', {
        api_type_param: source,
        used_count: 1
      });

      // Record API usage for analytics
      await supabase.from('api_usage').insert({
        api_type: source,
        endpoint: 'content_fetch',
        response_time: responseTime,
        status_code: statusCode,
        created_at: new Date().toISOString()
      });

      console.log(`📊 API call recorded: ${source} (${usage.calls} calls today)`);
    } catch (error) {
      console.error('Error recording API call:', error);
    }
  }

  // 4. SMART REFRESH LOGIC WITH PRIORITY
  shouldRefreshContent(key: string, priority: 'high' | 'medium' | 'low'): boolean {
    const cache = this.getBrowserCache(key) || this.getDatabaseCache(key);
    
    if (!cache) return true; // No cache, need to fetch

    const age = Date.now() - cache.timestamp;
    const refreshInterval = CACHE_CONFIG.refresh[priority];

    return age > refreshInterval;
  }

  // 5. CACHE INVALIDATION STRATEGY
  async invalidateCache(pattern: string, type?: string): Promise<void> {
    try {
      // Clear browser cache matching pattern
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes(CACHE_CONFIG.browser.prefix + pattern)) {
          localStorage.removeItem(key);
        }
      });

      // Clear database cache matching pattern
      let query = supabase
        .from('content_cache')
        .delete()
        .ilike('cache_key', `%${pattern}%`);

      if (type) {
        query = query.eq('cache_type', type);
      }

      await query;

      console.log(`🗑️ Cache invalidated: ${pattern}${type ? ` (${type})` : ''}`);
    } catch (error) {
      console.error('Error invalidating cache:', error);
    }
  }

  // 6. PERFORMANCE MONITORING
  async recordCacheHit(key: string, layer: 'browser' | 'database'): Promise<void> {
    try {
      await supabase.from('performance_metrics').insert({
        metric_type: 'cache_hit_rate',
        metric_name: `${layer}_cache_hit`,
        metric_value: 1,
        metadata: { cache_key: key, layer },
        recorded_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording cache hit:', error);
    }
  }

  async recordCacheMiss(key: string, source: string): Promise<void> {
    try {
      await supabase.from('performance_metrics').insert({
        metric_type: 'cache_hit_rate',
        metric_name: 'cache_miss',
        metric_value: 1,
        metadata: { cache_key: key, source },
        recorded_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error recording cache miss:', error);
    }
  }

  // 7. AUTOMATIC CLEANUP
  async performCleanup(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCleanup < CACHE_CONFIG.database.cleanupInterval) {
      return; // Not time for cleanup yet
    }

    try {
      // Clean up expired cache in database
      await supabase.rpc('cleanup_expired_cache');
      
      // Clean up browser cache
      this.cleanupBrowserCache();
      
      this.lastCleanup = now;
      console.log('🧹 Cache cleanup completed');
    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }
  }

  // HELPER METHODS

  private getTTLForPriority(priority: 'high' | 'medium' | 'low'): number {
    return CACHE_CONFIG.refresh[priority];
  }

  private async getQuotaInfo(source: string): Promise<QuotaInfo> {
    const { data, error } = await supabase
      .from('quota_management')
      .select('*')
      .eq('api_type', source)
      .single();

    if (error || !data) {
      throw new Error(`No quota info found for ${source}`);
    }

    return {
      dailyLimit: data.daily_limit,
      hourlyLimit: data.hourly_limit,
      dailyUsed: data.daily_used,
      hourlyUsed: data.hourly_used,
      resetTime: new Date(data.reset_time),
      isActive: data.is_active
    };
  }

  private async resetQuota(source: string): Promise<void> {
    await supabase.rpc('reset_daily_quotas');
    console.log(`🔄 Quota reset for ${source}`);
  }

  private calculateQualityScore(data: any): number {
    let score = 0;
    
    if (Array.isArray(data)) {
      score += data.length * 2;
      score += data.filter(item => item.title && item.description).length * 5;
    }
    
    if (typeof data === 'object' && data.title) {
      score += data.title.length > 20 ? 10 : 5;
      score += data.description ? 15 : 0;
    }
    
    return Math.min(score, 100);
  }

  // Browser cache methods
  private getBrowserCache(key: string): CacheEntry | null {
    try {
      const cached = localStorage.getItem(CACHE_CONFIG.browser.prefix + key);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  }

  private setBrowserCache(key: string, data: any, ttl: number): void {
    try {
      const entry: CacheEntry = {
        key,
        data,
        timestamp: Date.now(),
        ttl,
        source: 'browser'
      };
      localStorage.setItem(CACHE_CONFIG.browser.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.warn('Browser cache storage failed:', error);
    }
  }

  private cleanupBrowserCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_CONFIG.browser.prefix)) {
        try {
          const entry: CacheEntry = JSON.parse(localStorage.getItem(key) || '{}');
          if (!this.isValid(entry)) {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    });
  }

  // Database cache methods
  private async getDatabaseCache(key: string): Promise<CacheEntry | null> {
    try {
      const { data, error } = await supabase
        .from('content_cache')
        .select('*')
        .eq('cache_key', key)
        .single();

      if (error || !data) return null;

      return {
        key: data.cache_key,
        data: data.cache_data,
        timestamp: new Date(data.created_at).getTime(),
        ttl: data.ttl,
        source: data.source,
        metadata: data.metadata
      };
    } catch {
      return null;
    }
  }

  private async setDatabaseCache(entry: CacheEntry): Promise<void> {
    try {
      await supabase
        .from('content_cache')
        .upsert({
          cache_key: entry.key,
          cache_data: entry.data,
          cache_type: this.getCacheType(entry.key),
          source: entry.source,
          ttl: entry.ttl,
          quality_score: entry.metadata?.quality || 0,
          metadata: entry.metadata,
          created_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
    } catch (error) {
      console.error('Database cache storage failed:', error);
    }
  }

  private getCacheType(key: string): string {
    if (key.includes('news')) return 'news';
    if (key.includes('funding')) return 'funding';
    if (key.includes('events')) return 'events';
    if (key.includes('ai_')) return 'ai_summary';
    return 'news';
  }

  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getApiUsage(source: string): { calls: number; resetTime: number } {
    if (!this.apiUsage.has(source)) {
      this.apiUsage.set(source, { calls: 0, resetTime: Date.now() });
    }
    return this.apiUsage.get(source)!;
  }

  // Get current environment limits
  getApiLimits(source: string) {
    return CACHE_CONFIG.api[this.environment][source as keyof typeof CACHE_CONFIG.api.staging];
  }

  // Get environment info
  getEnvironment(): 'staging' | 'production' {
    return this.environment;
  }
}

// Export singleton instance
export const enhancedCacheManager = EnhancedCacheManager.getInstance();