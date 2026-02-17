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
  eventType:
    | "demo-day"
    | "hackathon"
    | "conference"
    | "meetup"
    | "workshop"
    | "webinar"
    | "pitch-event";
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

