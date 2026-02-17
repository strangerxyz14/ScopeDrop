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
    // Keep memory bounded
    if (this.interactions.length > 200) {
      this.interactions.splice(0, this.interactions.length - 200);
    }
  }

  // Track search performance
  async trackSearchPerformance(query: string, loadTime: number, resultCount: number) {
    await this.trackInteraction('search', query, loadTime);
    void resultCount; // reserved for future backend-side analytics
  }

  // Track navigation performance
  async trackNavigationPerformance(path: string, loadTime: number) {
    await this.trackInteraction('navigation', path, loadTime);
  }

  // Get header analytics
  async getHeaderAnalytics(): Promise<HeaderAnalytics> {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recent = this.interactions.filter((i) => i.timestamp.getTime() >= cutoff);

    const totalInteractions = recent.length;
    const searchUsage = recent.filter((i) => i.type === "search").length;
    const navigationUsage = recent.filter((i) => i.type === "navigation").length;
    const darkModeUsage = recent.filter((i) => i.type === "dark_mode").length;
    const averageLoadTime =
      totalInteractions > 0
        ? recent.reduce((sum, i) => sum + (i.performance.loadTime || 0), 0) / totalInteractions
        : 0;

    const topSearches = this.getTopItems(recent.filter((i) => i.type === "search").map((i) => i.target));
    const topNavigationItems = this.getTopItems(
      recent.filter((i) => i.type === "navigation").map((i) => i.target),
    );

    return {
      totalInteractions,
      searchUsage,
      navigationUsage,
      darkModeUsage,
      averageLoadTime,
      topSearches,
      topNavigationItems,
    };
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

  // (Backend-only) analytics persistence removed from frontend.

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