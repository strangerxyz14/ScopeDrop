import { realTimeContentAggregator } from './realTimeContentAPIs';
import { enhancedDataService } from './enhancedDataService';
import { toast } from 'sonner';

interface ScheduledJob {
  id: string;
  name: string;
  interval: number; // in milliseconds
  lastRun?: number;
  nextRun?: number;
  isRunning: boolean;
  handler: () => Promise<void>;
}

class ContentScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized = false;

  constructor() {
    this.setupDefaultJobs();
  }

  private setupDefaultJobs() {
    // Hourly content refresh
    this.addJob({
      id: 'hourly-content-refresh',
      name: 'Hourly Content Refresh',
      interval: 60 * 60 * 1000, // 1 hour
      isRunning: false,
      handler: this.refreshAllContent.bind(this)
    });

    // News articles every 30 minutes
    this.addJob({
      id: 'news-refresh',
      name: 'News Articles Refresh',
      interval: 30 * 60 * 1000, // 30 minutes
      isRunning: false,
      handler: this.refreshNewsContent.bind(this)
    });

    // Trending content every 15 minutes
    this.addJob({
      id: 'trending-refresh',
      name: 'Trending Content Refresh',
      interval: 15 * 60 * 1000, // 15 minutes
      isRunning: false,
      handler: this.refreshTrendingContent.bind(this)
    });

    // Events refresh every 4 hours
    this.addJob({
      id: 'events-refresh',
      name: 'Events Refresh',
      interval: 4 * 60 * 60 * 1000, // 4 hours
      isRunning: false,
      handler: this.refreshEventsContent.bind(this)
    });

    // Market data every 2 hours (during market hours)
    this.addJob({
      id: 'market-data-refresh',
      name: 'Market Data Refresh',
      interval: 2 * 60 * 60 * 1000, // 2 hours
      isRunning: false,
      handler: this.refreshMarketData.bind(this)
    });
  }

  addJob(job: ScheduledJob) {
    job.nextRun = Date.now() + job.interval;
    this.jobs.set(job.id, job);
  }

  removeJob(jobId: string) {
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
    this.jobs.delete(jobId);
  }

  start() {
    if (this.isInitialized) return;
    
    console.log('🚀 Starting Content Scheduler...');
    
    // Start all jobs
    for (const [jobId, job] of this.jobs.entries()) {
      this.scheduleJob(jobId);
    }

    // Run initial content fetch
    this.runInitialFetch();
    
    this.isInitialized = true;
    toast.success('Content scheduler started - fresh content every hour!');
  }

  stop() {
    console.log('⏹️ Stopping Content Scheduler...');
    
    for (const [jobId, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    this.isInitialized = false;
    toast.info('Content scheduler stopped');
  }

  private scheduleJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const now = Date.now();
    const delay = Math.max(0, job.nextRun! - now);

    const timer = setTimeout(async () => {
      await this.runJob(jobId);
      this.scheduleJob(jobId); // Reschedule
    }, delay);

    this.timers.set(jobId, timer);
  }

  private async runJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.isRunning) return;

    console.log(`🔄 Running job: ${job.name}`);
    
    job.isRunning = true;
    job.lastRun = Date.now();
    job.nextRun = Date.now() + job.interval;

    try {
      await job.handler();
      console.log(`✅ Completed job: ${job.name}`);
    } catch (error) {
      console.error(`❌ Job failed: ${job.name}`, error);
      toast.error(`Failed to refresh ${job.name.toLowerCase()}`);
    } finally {
      job.isRunning = false;
    }
  }

  private async runInitialFetch() {
    console.log('📡 Running initial content fetch...');
    
    try {
      // Run a subset of jobs immediately
      await Promise.allSettled([
        this.refreshNewsContent(),
        this.refreshTrendingContent()
      ]);
      
      console.log('✅ Initial content fetch completed');
      toast.success('Fresh content loaded!');
    } catch (error) {
      console.error('❌ Initial content fetch failed:', error);
      toast.error('Failed to load initial content');
    }
  }

  // Job handlers
  private async refreshAllContent() {
    console.log('🔄 Refreshing all content...');
    
    try {
      const freshContent = await realTimeContentAggregator.getEnhancedContent();
      
      // Update the enhanced data service cache
      enhancedDataService.clearCache();
      
      // Store fresh content (you might want to save to database here)
      localStorage.setItem('freshContent', JSON.stringify({
        ...freshContent,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Refreshed ${freshContent.articles.length} articles, ${freshContent.events.length} events`);
      toast.success(`Updated with ${freshContent.articles.length} new articles!`);
    } catch (error) {
      console.error('❌ Failed to refresh all content:', error);
      throw error;
    }
  }

  private async refreshNewsContent() {
    console.log('📰 Refreshing news content...');
    
    try {
      const content = await realTimeContentAggregator.aggregateAllContent();
      
      // Update news cache
      enhancedDataService.clearCache('news');
      
      localStorage.setItem('freshNews', JSON.stringify({
        articles: content.articles,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Refreshed ${content.articles.length} news articles`);
    } catch (error) {
      console.error('❌ Failed to refresh news:', error);
      throw error;
    }
  }

  private async refreshTrendingContent() {
    console.log('📈 Refreshing trending content...');
    
    try {
      const content = await realTimeContentAggregator.aggregateAllContent();
      
      // Update trending cache
      enhancedDataService.clearCache('trending');
      
      localStorage.setItem('trendingContent', JSON.stringify({
        trending: content.trending,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Refreshed ${content.trending.length} trending items`);
    } catch (error) {
      console.error('❌ Failed to refresh trending:', error);
      throw error;
    }
  }

  private async refreshEventsContent() {
    console.log('🎉 Refreshing events content...');
    
    try {
      const content = await realTimeContentAggregator.aggregateAllContent();
      
      // Update events cache
      enhancedDataService.clearCache('events');
      
      localStorage.setItem('freshEvents', JSON.stringify({
        events: content.events,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Refreshed ${content.events.length} events`);
    } catch (error) {
      console.error('❌ Failed to refresh events:', error);
      throw error;
    }
  }

  private async refreshMarketData() {
    // Only refresh during market hours (9 AM - 4 PM EST)
    const now = new Date();
    const hour = now.getHours();
    
    if (hour < 9 || hour > 16) {
      console.log('📊 Skipping market data refresh (outside market hours)');
      return;
    }
    
    console.log('📊 Refreshing market data...');
    
    try {
      const content = await realTimeContentAggregator.aggregateAllContent();
      
      // Update market data cache
      enhancedDataService.clearCache('market');
      
      localStorage.setItem('marketData', JSON.stringify({
        funding: content.funding,
        timestamp: Date.now()
      }));
      
      console.log(`✅ Refreshed ${content.funding.length} market items`);
    } catch (error) {
      console.error('❌ Failed to refresh market data:', error);
      throw error;
    }
  }

  // Public methods for manual control
  async manualRefresh(type: 'all' | 'news' | 'trending' | 'events' | 'market' = 'all') {
    const jobMap = {
      all: 'hourly-content-refresh',
      news: 'news-refresh',
      trending: 'trending-refresh',
      events: 'events-refresh',
      market: 'market-data-refresh'
    };

    const jobId = jobMap[type];
    if (jobId) {
      await this.runJob(jobId);
    }
  }

  getJobStatus() {
    const status: any[] = [];
    
    for (const [jobId, job] of this.jobs.entries()) {
      status.push({
        id: jobId,
        name: job.name,
        isRunning: job.isRunning,
        lastRun: job.lastRun ? new Date(job.lastRun) : null,
        nextRun: job.nextRun ? new Date(job.nextRun) : null,
        interval: job.interval / 1000 / 60 // in minutes
      });
    }
    
    return status;
  }

  // Get fresh content from cache
  getFreshContent() {
    const stored = localStorage.getItem('freshContent');
    if (stored) {
      try {
        const content = JSON.parse(stored);
        // Check if content is less than 2 hours old
        if (Date.now() - content.timestamp < 2 * 60 * 60 * 1000) {
          return content;
        }
      } catch (error) {
        console.error('Failed to parse stored content:', error);
      }
    }
    return null;
  }

  // Integration with React hooks
  setupReactIntegration() {
    // Listen for visibility change to refresh when user returns
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // User returned to tab, check if we need fresh content
        const lastUpdate = this.getFreshContent()?.timestamp;
        if (!lastUpdate || Date.now() - lastUpdate > 30 * 60 * 1000) {
          this.manualRefresh('news');
        }
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('📡 Back online - refreshing content...');
      this.manualRefresh('all');
    });
  }
}

// Export singleton instance
export const contentScheduler = new ContentScheduler();

// Auto-start scheduler when module loads
if (typeof window !== 'undefined') {
  // Start scheduler after a short delay to allow app initialization
  setTimeout(() => {
    contentScheduler.start();
    contentScheduler.setupReactIntegration();
  }, 5000);
}

export default contentScheduler;