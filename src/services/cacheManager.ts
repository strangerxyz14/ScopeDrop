import { supabase } from './supabaseClient';

// Cache configuration
const CACHE_CONFIG = {
  // Browser cache (localStorage)
  browser: {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  // Supabase cache (database)
  database: {
    ttl: 6 * 60 * 60 * 1000, // 6 hours
    maxEntries: 1000,
  },
  // API rate limits
  api: {
    gnews: {
      dailyLimit: 1000,
      hourlyLimit: 100,
      cooldown: 60 * 1000, // 1 minute between calls
    },
    gemini: {
      dailyLimit: 15000,
      hourlyLimit: 1500,
      cooldown: 2 * 1000, // 2 seconds between calls
    }
  }
};

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  source: 'gnews' | 'gemini' | 'reddit' | 'hn';
  metadata?: {
    apiCalls: number;
    lastRefreshed: number;
    quality: number;
  };
}

export class CacheManager {
  private static instance: CacheManager;
  private apiUsage: Map<string, { calls: number; resetTime: number }> = new Map();

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // 1. SMART CACHE RETRIEVAL (Multi-layer)
  async getCachedContent(key: string, source: string): Promise<any | null> {
    // Layer 1: Browser cache (fastest)
    const browserCache = this.getBrowserCache(key);
    if (browserCache && this.isValid(browserCache)) {
      console.log(`📦 Browser cache hit: ${key}`);
      return browserCache.data;
    }

    // Layer 2: Database cache
    const dbCache = await this.getDatabaseCache(key);
    if (dbCache && this.isValid(dbCache)) {
      console.log(`🗄️ Database cache hit: ${key}`);
      // Refresh browser cache
      this.setBrowserCache(key, dbCache.data, dbCache.ttl);
      return dbCache.data;
    }

    return null;
  }

  // 2. INTELLIGENT CACHE STORAGE
  async setCachedContent(key: string, data: any, source: string, ttl?: number): Promise<void> {
    const entry: CacheEntry = {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_CONFIG.database.ttl,
      source: source as any,
      metadata: {
        apiCalls: this.getApiUsage(source).calls,
        lastRefreshed: Date.now(),
        quality: this.calculateQualityScore(data)
      }
    };

    // Store in both layers
    this.setBrowserCache(key, data, CACHE_CONFIG.browser.ttl);
    await this.setDatabaseCache(entry);
  }

  // 3. API QUOTA MANAGEMENT
  canMakeApiCall(source: string): boolean {
    const usage = this.getApiUsage(source);
    const limits = CACHE_CONFIG.api[source as keyof typeof CACHE_CONFIG.api];
    
    if (!limits) return true; // No limits configured

    const now = Date.now();
    
    // Reset daily limit
    if (now - usage.resetTime > 24 * 60 * 60 * 1000) {
      usage.calls = 0;
      usage.resetTime = now;
    }

    // Check limits
    if (usage.calls >= limits.dailyLimit) {
      console.warn(`🚫 Daily API limit reached for ${source}`);
      return false;
    }

    if (usage.calls >= limits.hourlyLimit) {
      console.warn(`⏰ Hourly API limit reached for ${source}`);
      return false;
    }

    return true;
  }

  recordApiCall(source: string): void {
    const usage = this.getApiUsage(source);
    usage.calls++;
  }

  // 4. SMART REFRESH LOGIC
  shouldRefreshContent(key: string, source: string): boolean {
    const cache = this.getBrowserCache(key) || this.getDatabaseCache(key);
    
    if (!cache) return true; // No cache, need to fetch

    const age = Date.now() - cache.timestamp;
    const ttl = cache.ttl;

    // High-priority content (funding news) - refresh more frequently
    if (key.includes('funding') || key.includes('ipo')) {
      return age > 2 * 60 * 60 * 1000; // 2 hours
    }

    // Medium-priority content (general news) - moderate refresh
    if (key.includes('news') || key.includes('startup')) {
      return age > 4 * 60 * 60 * 1000; // 4 hours
    }

    // Low-priority content (events, static data) - less frequent refresh
    return age > 12 * 60 * 60 * 1000; // 12 hours
  }

  // 5. CACHE INVALIDATION STRATEGY
  async invalidateCache(pattern: string): Promise<void> {
    // Clear browser cache matching pattern
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(pattern)) {
        localStorage.removeItem(key);
      }
    });

    // Clear database cache matching pattern
    await supabase
      .from('content_cache')
      .delete()
      .ilike('cache_key', `%${pattern}%`);
  }

  // 6. QUALITY-BASED CACHE PRIORITY
  private calculateQualityScore(data: any): number {
    let score = 0;
    
    if (Array.isArray(data)) {
      score += data.length * 2; // More items = higher quality
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
      const cached = localStorage.getItem(`cache_${key}`);
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
        source: 'gnews'
      };
      localStorage.setItem(`cache_${key}`, JSON.stringify(entry));
    } catch (error) {
      console.warn('Browser cache storage failed:', error);
    }
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
          ttl: entry.ttl,
          source: entry.source,
          metadata: entry.metadata,
          created_at: new Date().toISOString()
        }, { onConflict: 'cache_key' });
    } catch (error) {
      console.error('Database cache storage failed:', error);
    }
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
}

export const cacheManager = CacheManager.getInstance();