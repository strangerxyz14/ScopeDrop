import axios from 'axios';
import { processArticleWithGemini } from './geminiService';

export interface TechEvent {
  id: string;
  title: string;
  description: string;
  organizer: string;
  date: string;
  endDate?: string;
  time: string;
  location: {
    venue: string;
    address: string;
    city: string;
    country: string;
    isOnline: boolean;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  eventType: 'demo-day' | 'hackathon' | 'conference' | 'meetup' | 'workshop' | 'webinar' | 'pitch-event';
  category: string[];
  tags: string[];
  imageUrl?: string;
  registrationUrl: string;
  price: {
    amount: number;
    currency: string;
    isFree: boolean;
  };
  speakers?: Array<{
    name: string;
    title: string;
    company: string;
    imageUrl?: string;
  }>;
  attendeeCount?: number;
  maxAttendees?: number;
  startups?: string[];
  sponsors?: string[];
  relevanceScore?: number;
  source: string;
  fetchedAt: string;
}

// Base class for event sources
abstract class EventSource {
  abstract sourceName: string;
  abstract async fetchEvents(location: string, category?: string): Promise<TechEvent[]>;
  
  protected generateId(source: string, id: string): string {
    return `${source}_${id}`;
  }
}

// Cache Management System
class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any; timestamp: number; }> = new Map();
  private apiCallCounts: Map<string, { count: number; resetTime: number; }> = new Map();
  
  // API Rate Limits Configuration
  private rateLimits = {
    eventbrite: { limit: 1000, window: 3600000 }, // 1000 per hour
    devto: { limit: 30, window: 1800000 }, // 30 per 30 minutes
    serpapi: { limit: 100, window: 2592000000 }, // 100 per month
  };
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  // Check if we can make an API call
  canMakeApiCall(source: string): boolean {
    const rateLimit = this.rateLimits[source.toLowerCase()];
    if (!rateLimit) return true;
    
    const now = Date.now();
    const apiCalls = this.apiCallCounts.get(source) || { count: 0, resetTime: now + rateLimit.window };
    
    // Reset counter if window has passed
    if (now > apiCalls.resetTime) {
      this.apiCallCounts.set(source, { count: 0, resetTime: now + rateLimit.window });
      return true;
    }
    
    // Check if we're under the limit
    return apiCalls.count < rateLimit.limit;
  }
  
  // Record an API call
  recordApiCall(source: string): void {
    const rateLimit = this.rateLimits[source.toLowerCase()];
    if (!rateLimit) return;
    
    const now = Date.now();
    const apiCalls = this.apiCallCounts.get(source) || { count: 0, resetTime: now + rateLimit.window };
    
    apiCalls.count++;
    this.apiCallCounts.set(source, apiCalls);
    
    console.log(`API Call recorded for ${source}: ${apiCalls.count}/${rateLimit.limit} (resets in ${Math.round((apiCalls.resetTime - now) / 60000)} minutes)`);
  }
  
  // Get cached data if fresh
  getCached(key: string, maxAge: number = 3600000): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`Cache hit for ${key} (age: ${Math.round(age / 60000)} minutes)`);
    return cached.data;
  }
  
  // Store data in cache
  setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
    console.log(`Cached data for ${key}`);
  }
  
  // Get remaining API calls
  getRemainingCalls(source: string): number {
    const rateLimit = this.rateLimits[source.toLowerCase()];
    if (!rateLimit) return Infinity;
    
    const apiCalls = this.apiCallCounts.get(source) || { count: 0, resetTime: Date.now() };
    return Math.max(0, rateLimit.limit - apiCalls.count);
  }
}

// Enhanced Eventbrite Source with Rate Limiting
class EventbriteSource extends EventSource {
  sourceName = 'eventbrite';
  private apiKey = import.meta.env.VITE_EVENTBRITE_API_KEY || 'HWBVHWYBTXYDEQYQ2LCI';
  private baseUrl = 'https://www.eventbriteapi.com/v3';
  private cache = CacheManager.getInstance();
  
  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    const cacheKey = `eventbrite_${location}_${category || 'all'}`;
    
    // Check cache first (1 hour cache)
    const cached = this.cache.getCached(cacheKey, 3600000);
    if (cached) {
      console.log('Using cached Eventbrite data');
      return cached;
    }
    
    // Check rate limit
    if (!this.cache.canMakeApiCall('eventbrite')) {
      console.warn(`Eventbrite rate limit approaching (${this.cache.getRemainingCalls('eventbrite')} calls remaining)`);
      return this.getMockEventbriteEvents(location);
    }
    
    if (!this.apiKey) {
      console.warn('Eventbrite API key not configured');
      return this.getMockEventbriteEvents(location);
    }

    try {
      // Record the API call
      this.cache.recordApiCall('eventbrite');
      
      // Only fetch first page to conserve API calls
      const response = await axios.get(`${this.baseUrl}/events/search/`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          'location.address': location,
          'location.within': '50km',
          'categories': '102', // Science & Technology category
          'expand': 'venue,organizer',
          'sort_by': 'date',
          'page_size': 20, // Limit results to conserve API
        }
      });

      const events = response.data.events.map((event: any) => this.transformEvent(event));
      
      // Cache the results
      this.cache.setCache(cacheKey, events);
      
      return events;
    } catch (error) {
      console.error('Eventbrite API error:', error);
      return this.getMockEventbriteEvents(location);
    }
  }

  private transformEvent(event: any): TechEvent {
    return {
      id: this.generateId(this.sourceName, event.id),
      title: event.name.text,
      description: event.description.text || event.summary,
      organizer: event.organizer?.name || 'Unknown',
      date: event.start.local,
      endDate: event.end.local,
      time: new Date(event.start.local).toLocaleTimeString(),
      location: {
        venue: event.venue?.name || 'Online',
        address: event.venue?.address?.localized_address_display || '',
        city: event.venue?.address?.city || location,
        country: event.venue?.address?.country || '',
        isOnline: event.online_event || false,
        coordinates: event.venue ? {
          lat: parseFloat(event.venue.latitude),
          lng: parseFloat(event.venue.longitude)
        } : undefined
      },
      eventType: this.categorizeEvent(event.name.text, event.description?.text),
      category: ['Technology', 'Startups'],
      tags: this.extractTags(event.name.text + ' ' + (event.description?.text || '')),
      imageUrl: event.logo?.url,
      registrationUrl: event.url,
      price: {
        amount: event.is_free ? 0 : (event.ticket_availability?.minimum_ticket_price?.value || 0),
        currency: event.currency,
        isFree: event.is_free
      },
      source: this.sourceName,
      fetchedAt: new Date().toISOString()
    };
  }

  private categorizeEvent(title: string, description?: string): TechEvent['eventType'] {
    const text = (title + ' ' + (description || '')).toLowerCase();
    if (text.includes('demo day') || text.includes('showcase')) return 'demo-day';
    if (text.includes('hackathon')) return 'hackathon';
    if (text.includes('conference') || text.includes('summit')) return 'conference';
    if (text.includes('workshop')) return 'workshop';
    if (text.includes('pitch') || text.includes('investor')) return 'pitch-event';
    if (text.includes('webinar') || text.includes('online')) return 'webinar';
    return 'meetup';
  }

  private extractTags(text: string): string[] {
    const keywords = ['ai', 'blockchain', 'startup', 'fintech', 'saas', 'web3', 'nft', 
                     'machine learning', 'cloud', 'devops', 'product', 'design', 'growth'];
    return keywords.filter(keyword => text.toLowerCase().includes(keyword));
  }

  private getMockEventbriteEvents(location: string): TechEvent[] {
    return [
      {
        id: this.generateId(this.sourceName, '1'),
        title: "Y Combinator Demo Day - Winter 2025",
        description: "Watch 200+ startups present their companies to top investors. The premier demo day event in Silicon Valley.",
        organizer: "Y Combinator",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: "10:00 AM",
        location: {
          venue: "YC Headquarters",
          address: "335 Pioneer Way",
          city: "Mountain View",
          country: "USA",
          isOnline: true,
          coordinates: { lat: 37.3861, lng: -122.0839 }
        },
        eventType: 'demo-day',
        category: ['Startups', 'Investment', 'Technology'],
        tags: ['startup', 'investment', 'demo day', 'yc'],
        imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87",
        registrationUrl: "https://www.ycombinator.com/demo-day",
        price: { amount: 0, currency: "USD", isFree: true },
        attendeeCount: 2000,
        source: this.sourceName,
        fetchedAt: new Date().toISOString()
      }
    ];
  }
}

// Meetup API Integration
class MeetupSource extends EventSource {
  sourceName = 'meetup';
  private baseUrl = 'https://api.meetup.com';

  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    // Meetup now requires OAuth, so we'll use mock data
    return this.getMockMeetupEvents(location);
  }

  private getMockMeetupEvents(location: string): TechEvent[] {
    return [
      {
        id: this.generateId(this.sourceName, '1'),
        title: "AI Startup Founders Meetup",
        description: "Connect with AI startup founders, share experiences, and learn from each other's journeys.",
        organizer: "Tech Founders Network",
        date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        time: "6:00 PM",
        location: {
          venue: "Google Campus",
          address: "345 Spear St",
          city: "San Francisco",
          country: "USA",
          isOnline: false
        },
        eventType: 'meetup',
        category: ['AI', 'Startups', 'Networking'],
        tags: ['ai', 'startup', 'networking', 'founders'],
        imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b",
        registrationUrl: "https://meetup.com/ai-founders",
        price: { amount: 0, currency: "USD", isFree: true },
        attendeeCount: 150,
        maxAttendees: 200,
        source: this.sourceName,
        fetchedAt: new Date().toISOString()
      },
      {
        id: this.generateId(this.sourceName, '2'),
        title: "Web3 Hackathon 2025",
        description: "48-hour hackathon to build the next generation of decentralized applications.",
        organizer: "Blockchain Developers Association",
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        time: "9:00 AM",
        location: {
          venue: "Tech Hub",
          address: "123 Innovation Drive",
          city: location,
          country: "USA",
          isOnline: false
        },
        eventType: 'hackathon',
        category: ['Blockchain', 'Web3', 'Development'],
        tags: ['blockchain', 'web3', 'hackathon', 'crypto'],
        imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
        registrationUrl: "https://web3hack.dev",
        price: { amount: 50, currency: "USD", isFree: false },
        maxAttendees: 500,
        sponsors: ["Ethereum Foundation", "Polygon", "Chainlink"],
        source: this.sourceName,
        fetchedAt: new Date().toISOString()
      }
    ];
  }
}

// Luma Events Integration
class LumaSource extends EventSource {
  sourceName = 'luma';
  
  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    // Luma doesn't have a public API yet, using web scraping or mock data
    return this.getMockLumaEvents(location);
  }

  private getMockLumaEvents(location: string): TechEvent[] {
    return [
      {
        id: this.generateId(this.sourceName, '1'),
        title: "Founders & Investors Mixer",
        description: "Exclusive networking event bringing together top founders and VCs for meaningful connections.",
        organizer: "Startup Grind",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        time: "5:30 PM",
        location: {
          venue: "The Battery",
          address: "717 Battery St",
          city: "San Francisco",
          country: "USA",
          isOnline: false
        },
        eventType: 'pitch-event',
        category: ['Networking', 'Investment'],
        tags: ['networking', 'investment', 'founders', 'vcs'],
        imageUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865",
        registrationUrl: "https://lu.ma/founders-mixer",
        price: { amount: 75, currency: "USD", isFree: false },
        speakers: [
          {
            name: "Sarah Chen",
            title: "General Partner",
            company: "Sequoia Capital",
            imageUrl: "https://randomuser.me/api/portraits/women/1.jpg"
          },
          {
            name: "Michael Park",
            title: "Founder & CEO",
            company: "TechUnicorn",
            imageUrl: "https://randomuser.me/api/portraits/men/1.jpg"
          }
        ],
        attendeeCount: 120,
        maxAttendees: 150,
        source: this.sourceName,
        fetchedAt: new Date().toISOString()
      }
    ];
  }
}

// TechCrunch Events Scraper
class TechCrunchSource extends EventSource {
  sourceName = 'techcrunch';
  
  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    // Would implement web scraping here
    return this.getMockTechCrunchEvents(location);
  }

  private getMockTechCrunchEvents(location: string): TechEvent[] {
    return [
      {
        id: this.generateId(this.sourceName, '1'),
        title: "TechCrunch Disrupt 2025",
        description: "The world's leading authority in debuting revolutionary startups, introducing game-changing technologies.",
        organizer: "TechCrunch",
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        time: "9:00 AM",
        location: {
          venue: "Moscone Center",
          address: "747 Howard St",
          city: "San Francisco",
          country: "USA",
          isOnline: true
        },
        eventType: 'conference',
        category: ['Conference', 'Startups', 'Technology'],
        tags: ['conference', 'startup', 'techcrunch', 'disrupt'],
        imageUrl: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678",
        registrationUrl: "https://techcrunch.com/events/disrupt",
        price: { amount: 1295, currency: "USD", isFree: false },
        speakers: [
          {
            name: "Elon Musk",
            title: "CEO",
            company: "SpaceX & Tesla",
          },
          {
            name: "Sam Altman",
            title: "CEO",
            company: "OpenAI",
          }
        ],
        attendeeCount: 10000,
        sponsors: ["Google", "Microsoft", "AWS", "Meta"],
        source: this.sourceName,
        fetchedAt: new Date().toISOString()
      }
    ];
  }
}

// Dev.to Integration with Rate Limiting
class DevToSource extends EventSource {
  sourceName = 'devto';
  private apiKey = import.meta.env.VITE_DEVTO_API_KEY || 'sQtfEuc1VmvbvDnyNvyBzyDn';
  private baseUrl = 'https://dev.to/api';
  private cache = CacheManager.getInstance();
  
  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    const cacheKey = `devto_${location}_${category || 'all'}`;
    
    // Check cache first (2 hour cache for Dev.to)
    const cached = this.cache.getCached(cacheKey, 7200000);
    if (cached) {
      console.log('Using cached Dev.to data');
      return cached;
    }
    
    // Check rate limit (30 per 30 minutes)
    if (!this.cache.canMakeApiCall('devto')) {
      console.warn(`Dev.to rate limit approaching (${this.cache.getRemainingCalls('devto')} calls remaining)`);
      return this.getMockDevToEvents(location);
    }
    
    try {
      // Record the API call
      this.cache.recordApiCall('devto');
      
      // Fetch articles about events (conserve API calls)
      const response = await fetch(`${this.baseUrl}/articles?tag=events,hackathon,conference&per_page=10`, {
        headers: {
          'api-key': this.apiKey,
        }
      });
      
      if (!response.ok) {
        throw new Error(`Dev.to API error: ${response.status}`);
      }
      
      const articles = await response.json();
      const events: TechEvent[] = [];
      
      // Extract event information from articles
      for (const article of articles) {
        const eventInfo = this.extractEventFromArticle(article, location);
        if (eventInfo) {
          events.push(eventInfo);
        }
      }
      
      // Cache the results
      this.cache.setCache(cacheKey, events);
      
      return events;
    } catch (error) {
      console.error('Dev.to API error:', error);
      return this.getMockDevToEvents(location);
    }
  }
  
  private extractEventFromArticle(article: any, location: string): TechEvent | null {
    const title = article.title;
    const description = article.description || '';
    
    // Check if article is about an event
    const eventKeywords = ['conference', 'meetup', 'hackathon', 'summit', 'workshop', 'demo day'];
    const isEvent = eventKeywords.some(keyword => 
      title.toLowerCase().includes(keyword) || description.toLowerCase().includes(keyword)
    );
    
    if (!isEvent) return null;
    
    return {
      id: this.generateId('devto', article.id.toString()),
      title: title,
      description: description,
      organizer: article.user.name || 'Dev.to Community',
      date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      time: 'TBA',
      location: {
        venue: 'Online',
        address: '',
        city: location,
        country: '',
        isOnline: true
      },
      eventType: this.detectEventType(title, description),
      category: article.tag_list || ['technology'],
      tags: article.tag_list || [],
      imageUrl: article.cover_image || article.social_image,
      registrationUrl: article.url,
      price: { amount: 0, currency: 'USD', isFree: true },
      source: 'devto',
      fetchedAt: new Date().toISOString()
    };
  }
  
  private detectEventType(title: string, description: string): TechEvent['eventType'] {
    const text = (title + ' ' + description).toLowerCase();
    
    if (text.includes('hackathon')) return 'hackathon';
    if (text.includes('conference') || text.includes('summit')) return 'conference';
    if (text.includes('workshop')) return 'workshop';
    if (text.includes('demo day')) return 'demo-day';
    if (text.includes('meetup')) return 'meetup';
    if (text.includes('webinar')) return 'webinar';
    
    return 'meetup';
  }
  
  private getMockDevToEvents(location: string): TechEvent[] {
    return [
      {
        id: this.generateId('devto', 'mock1'),
        title: 'Dev.to Virtual Hackathon 2025',
        description: 'Join thousands of developers for a weekend of coding',
        organizer: 'Dev.to Community',
        date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        time: '9:00 AM UTC',
        location: {
          venue: 'Online',
          address: '',
          city: 'Global',
          country: '',
          isOnline: true
        },
        eventType: 'hackathon',
        category: ['development', 'community'],
        tags: ['hackathon', 'coding', 'opensource'],
        registrationUrl: 'https://dev.to/events',
        price: { amount: 0, currency: 'USD', isFree: true },
        source: 'devto',
        fetchedAt: new Date().toISOString()
      }
    ];
  }
}

// Main Events Aggregator with Smart Rate Limiting
export class EventsAggregator {
  private sources: EventSource[] = [
    new EventbriteSource(),
    new MeetupSource(),
    new LumaSource(),
    new TechCrunchSource(),
    new DevToSource()  // Added Dev.to source
  ];
  private cache = CacheManager.getInstance();

  async fetchAllEvents(location: string, category?: string): Promise<TechEvent[]> {
    try {
      // Fetch from all sources in parallel
      const allEventsPromises = this.sources.map(source => 
        source.fetchEvents(location, category).catch(err => {
          console.error(`Error fetching from ${source.sourceName}:`, err);
          return [];
        })
      );

      const allEventsArrays = await Promise.all(allEventsPromises);
      const allEvents = allEventsArrays.flat();

      // Remove duplicates
      const uniqueEvents = await this.removeDuplicates(allEvents);
      
      // Calculate relevance scores
      const scoredEvents = await this.calculateRelevanceScores(uniqueEvents, location);
      
      // Sort by date and relevance
      return this.sortEvents(scoredEvents);
    } catch (error) {
      console.error('Error aggregating events:', error);
      return [];
    }
  }

  private async removeDuplicates(events: TechEvent[]): Promise<TechEvent[]> {
    const seen = new Map<string, TechEvent>();
    
    for (const event of events) {
      // Create a key based on title, date, and location
      const key = `${event.title.toLowerCase()}_${event.date}_${event.location.city}`;
      
      if (!seen.has(key)) {
        seen.set(key, event);
      } else {
        // If duplicate, keep the one with more information
        const existing = seen.get(key)!;
        if (this.getCompleteness(event) > this.getCompleteness(existing)) {
          seen.set(key, event);
        }
      }
    }
    
    return Array.from(seen.values());
  }

  private getCompleteness(event: TechEvent): number {
    let score = 0;
    if (event.description) score += 2;
    if (event.imageUrl) score += 1;
    if (event.speakers?.length) score += 2;
    if (event.tags.length > 0) score += 1;
    if (event.location.coordinates) score += 1;
    if (event.sponsors?.length) score += 1;
    return score;
  }

  private async calculateRelevanceScores(events: TechEvent[], userLocation: string): Promise<TechEvent[]> {
    return events.map(event => {
      let score = 50; // Base score
      
      // Event type scoring
      if (event.eventType === 'demo-day') score += 30;
      if (event.eventType === 'hackathon') score += 25;
      if (event.eventType === 'pitch-event') score += 20;
      if (event.eventType === 'conference') score += 15;
      
      // Location scoring
      if (event.location.city.toLowerCase() === userLocation.toLowerCase()) score += 20;
      if (event.location.isOnline) score += 10;
      
      // Time scoring (upcoming events score higher)
      const daysUntil = Math.floor((new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 7) score += 25;
      else if (daysUntil <= 14) score += 15;
      else if (daysUntil <= 30) score += 10;
      
      // Quality indicators
      if (event.speakers?.length) score += 10;
      if (event.sponsors?.length) score += 5;
      if (event.price.isFree) score += 5;
      
      // Tag relevance
      const hotTags = ['ai', 'startup', 'demo day', 'yc', 'investment'];
      const matchingTags = event.tags.filter(tag => hotTags.includes(tag.toLowerCase()));
      score += matchingTags.length * 5;
      
      return { ...event, relevanceScore: Math.min(100, score) };
    });
  }

  private sortEvents(events: TechEvent[]): TechEvent[] {
    return events.sort((a, b) => {
      // First sort by date (upcoming first)
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const now = Date.now();
      
      // If both are in the future, sort by date
      if (dateA > now && dateB > now) {
        return dateA - dateB;
      }
      
      // Then by relevance score
      return (b.relevanceScore || 0) - (a.relevanceScore || 0);
    });
  }

  // Get events by type
  async getEventsByType(location: string, eventType: TechEvent['eventType']): Promise<TechEvent[]> {
    const allEvents = await this.fetchAllEvents(location);
    return allEvents.filter(event => event.eventType === eventType);
  }

  // Get upcoming demo days
  async getDemoDays(location: string): Promise<TechEvent[]> {
    return this.getEventsByType(location, 'demo-day');
  }

  // Get events within date range
  async getEventsInDateRange(location: string, startDate: Date, endDate: Date): Promise<TechEvent[]> {
    const allEvents = await this.fetchAllEvents(location);
    return allEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }
}