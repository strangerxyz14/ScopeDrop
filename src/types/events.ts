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

  // ── Phase 1 additive fields ─────────────────────────────────────
  // Populated as scheduled_events rows carry the new schema. All
  // optional so existing consumers of TechEvent don't break.
  status?:
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'validated'
    | 'awaiting_enrichment'
    | 'enriched'
    | 'published'
    | 'enrichment_failed';
  highlights?: string;
  scopeAnalysis?: string;
  logoUrl?: string;
  logoSource?:
    | 'json_ld'
    | 'og_logo'
    | 'favicon'
    | 'logo_dev'
    | 'scopedrop_default'
    | 'unresolved';
  heroImageSource?:
    | 'og_image'
    | 'json_ld'
    | 'page_image'
    | 'scopedrop_library'
    | 'unresolved';
  timezone?: string;
  sourceUrl?: string;
  canonicalUrl?: string;
  slug?: string;
}

