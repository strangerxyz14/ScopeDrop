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

// Eventbrite API Integration
class EventbriteSource extends EventSource {
  sourceName = 'eventbrite';
  private apiKey = import.meta.env.VITE_EVENTBRITE_API_KEY || '';
  private baseUrl = 'https://www.eventbriteapi.com/v3';

  async fetchEvents(location: string, category?: string): Promise<TechEvent[]> {
    if (!this.apiKey) {
      console.warn('Eventbrite API key not configured');
      return this.getMockEventbriteEvents(location);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/events/search/`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        params: {
          'location.address': location,
          'location.within': '50km',
          'categories': '102', // Science & Technology category
          'expand': 'venue,organizer',
          'sort_by': 'date',
        }
      });

      return response.data.events.map((event: any) => this.transformEvent(event));
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

// Main Events Aggregator
export class EventsAggregator {
  private sources: EventSource[] = [
    new EventbriteSource(),
    new MeetupSource(),
    new LumaSource(),
    new TechCrunchSource()
  ];

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