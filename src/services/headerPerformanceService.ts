import { supabase } from '@/services/enhancedCacheManager';

export interface HeaderInteraction {
  id: string;
  type: 'navigation' | 'search' | 'dark_mode' | 'user_menu';
  target: string;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  performance: {
    loadTime: number;
    interactionTime: number;
  };
}

export interface HeaderAnalytics {
  totalInteractions: number;
  searchUsage: number;
  navigationUsage: number;
  darkModeUsage: number;
  averageLoadTime: number;
  topSearches: string[];
  topNavigationItems: string[];
}

export class HeaderPerformanceService {
  private static instance: HeaderPerformanceService;
  private sessionId: string;
  private interactions: HeaderInteraction[] = [];

  static getInstance(): HeaderPerformanceService {
    if (!HeaderPerformanceService.instance) {
      HeaderPerformanceService.instance = new HeaderPerformanceService();
    }
    return HeaderPerformanceService.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceMonitoring();
  }

  // Track header interaction
  async trackInteraction(
    type: HeaderInteraction['type'],
    target: string,
    loadTime?: number,
    interactionTime?: number
  ) {
    const interaction: HeaderInteraction = {
      id: this.generateId(),
      type,
      target,
      timestamp: new Date(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      performance: {
        loadTime: loadTime || 0,
        interactionTime: interactionTime || 0
      }
    };

    this.interactions.push(interaction);

    // Send to Supabase in batches
    if (this.interactions.length >= 10) {
      await this.flushInteractions();
    }

    // Also send immediately for important interactions
    if (type === 'search' || type === 'navigation') {
      await this.sendInteraction(interaction);
    }
  }

  // Track search performance
  async trackSearchPerformance(query: string, loadTime: number, resultCount: number) {
    await this.trackInteraction('search', query, loadTime);
    
    try {
      await supabase
        .from('content_analytics')
        .insert({
          content_type: 'search',
          query: query,
          result_count: resultCount,
          load_time: loadTime,
          session_id: this.sessionId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking search performance:', error);
    }
  }

  // Track navigation performance
  async trackNavigationPerformance(path: string, loadTime: number) {
    await this.trackInteraction('navigation', path, loadTime);
    
    try {
      await supabase
        .from('content_analytics')
        .insert({
          content_type: 'navigation',
          path: path,
          load_time: loadTime,
          session_id: this.sessionId,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error tracking navigation performance:', error);
    }
  }

  // Get header analytics
  async getHeaderAnalytics(): Promise<HeaderAnalytics> {
    try {
      const { data: interactions, error } = await supabase
        .from('content_analytics')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching header analytics:', error);
        return this.getFallbackAnalytics();
      }

      const totalInteractions = interactions?.length || 0;
      const searchUsage = interactions?.filter(i => i.content_type === 'search').length || 0;
      const navigationUsage = interactions?.filter(i => i.content_type === 'navigation').length || 0;
      const averageLoadTime = interactions?.reduce((sum, i) => sum + (i.load_time || 0), 0) / totalInteractions || 0;

      // Get top searches
      const searchQueries = interactions
        ?.filter(i => i.content_type === 'search' && i.query)
        .map(i => i.query) || [];
      const topSearches = this.getTopItems(searchQueries);

      // Get top navigation items
      const navigationPaths = interactions
        ?.filter(i => i.content_type === 'navigation' && i.path)
        .map(i => i.path) || [];
      const topNavigationItems = this.getTopItems(navigationPaths);

      return {
        totalInteractions,
        searchUsage,
        navigationUsage,
        darkModeUsage: 0, // Would need separate tracking
        averageLoadTime,
        topSearches,
        topNavigationItems
      };
    } catch (error) {
      console.error('Error getting header analytics:', error);
      return this.getFallbackAnalytics();
    }
  }

  // Initialize performance monitoring
  private initializePerformanceMonitoring() {
    // Monitor header load time
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.trackInteraction('navigation', 'header_load', loadTime);
      });
    }
  }

  // Flush interactions to Supabase
  private async flushInteractions() {
    if (this.interactions.length === 0) return;

    try {
      const interactionsToSend = this.interactions.map(interaction => ({
        content_type: interaction.type,
        target: interaction.target,
        session_id: interaction.sessionId,
        load_time: interaction.performance.loadTime,
        interaction_time: interaction.performance.interactionTime,
        created_at: interaction.timestamp.toISOString()
      }));

      await supabase
        .from('content_analytics')
        .insert(interactionsToSend);

      this.interactions = [];
    } catch (error) {
      console.error('Error flushing interactions:', error);
    }
  }

  // Send single interaction
  private async sendInteraction(interaction: HeaderInteraction) {
    try {
      await supabase
        .from('content_analytics')
        .insert({
          content_type: interaction.type,
          target: interaction.target,
          session_id: interaction.sessionId,
          load_time: interaction.performance.loadTime,
          interaction_time: interaction.performance.interactionTime,
          created_at: interaction.timestamp.toISOString()
        });
    } catch (error) {
      console.error('Error sending interaction:', error);
    }
  }

  // Generate unique IDs
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get top items from array
  private getTopItems(items: string[], limit: number = 5): string[] {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([item]) => item);
  }

  // Fallback analytics
  private getFallbackAnalytics(): HeaderAnalytics {
    return {
      totalInteractions: 0,
      searchUsage: 0,
      navigationUsage: 0,
      darkModeUsage: 0,
      averageLoadTime: 0,
      topSearches: [],
      topNavigationItems: []
    };
  }
}

export const headerPerformanceService = HeaderPerformanceService.getInstance();