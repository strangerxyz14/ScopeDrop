import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EventSource {
  name: string
  apiKey?: string
  endpoint: string
  rateLimit: number
}

// Configuration for different event sources
const EVENT_SOURCES: EventSource[] = [
  {
    name: 'eventbrite',
    apiKey: Deno.env.get('EVENTBRITE_API_KEY'),
    endpoint: 'https://www.eventbriteapi.com/v3/events/search/',
    rateLimit: 1000 // per hour
  },
  {
    name: 'predicthq',
    apiKey: Deno.env.get('PREDICTHQ_API_KEY'),
    endpoint: 'https://api.predicthq.com/v1/events/',
    rateLimit: 100 // per day
  },
  {
    name: 'serpapi',
    apiKey: Deno.env.get('SERPAPI_KEY'),
    endpoint: 'https://serpapi.com/search',
    rateLimit: 100 // per month
  }
]

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Fetch from Eventbrite
async function fetchEventbriteEvents(location: string, category: string = 'technology') {
  const apiKey = Deno.env.get('EVENTBRITE_API_KEY')
  
  if (!apiKey) {
    console.log('Eventbrite API key not found, returning mock data')
    return getMockEventbriteData(location)
  }

  try {
    const response = await fetch(
      `https://www.eventbriteapi.com/v3/events/search/?location.address=${location}&location.within=50km&categories=102&expand=venue,organizer&sort_by=date`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Eventbrite API error: ${response.status}`)
    }

    const data = await response.json()
    return transformEventbriteData(data.events || [])
  } catch (error) {
    console.error('Eventbrite fetch error:', error)
    return getMockEventbriteData(location)
  }
}

// Fetch from PredictHQ
async function fetchPredictHQEvents(location: string) {
  const apiKey = Deno.env.get('PREDICTHQ_API_KEY')
  
  if (!apiKey) {
    return getMockPredictHQData(location)
  }

  try {
    const response = await fetch(
      `https://api.predicthq.com/v1/events/?category=conferences,expos,community&location_around.origin=${location}&location_around.offset=50km`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`PredictHQ API error: ${response.status}`)
    }

    const data = await response.json()
    return transformPredictHQData(data.results || [])
  } catch (error) {
    console.error('PredictHQ fetch error:', error)
    return getMockPredictHQData(location)
  }
}

// Transform Eventbrite data to our format
function transformEventbriteData(events: any[]) {
  return events.map((event: any) => ({
    id: `eventbrite_${event.id}`,
    title: event.name?.text || 'Untitled Event',
    description: event.description?.text || event.summary || '',
    date: event.start?.local || new Date().toISOString(),
    endDate: event.end?.local,
    location: {
      venue: event.venue?.name || 'TBA',
      address: event.venue?.address?.localized_address_display || '',
      city: event.venue?.address?.city || '',
      country: event.venue?.address?.country || '',
      isOnline: event.online_event || false,
      coordinates: event.venue ? {
        lat: parseFloat(event.venue.latitude),
        lng: parseFloat(event.venue.longitude)
      } : null
    },
    organizer: event.organizer?.name || 'Unknown',
    imageUrl: event.logo?.url,
    registrationUrl: event.url,
    price: {
      amount: event.is_free ? 0 : (event.ticket_availability?.minimum_ticket_price?.value || 0),
      currency: event.currency || 'USD',
      isFree: event.is_free || false
    },
    category: detectCategory(event.name?.text, event.description?.text),
    tags: extractTags(event.name?.text + ' ' + (event.description?.text || '')),
    source: 'eventbrite',
    relevanceScore: calculateRelevance(event),
    fetchedAt: new Date().toISOString()
  }))
}

// Transform PredictHQ data
function transformPredictHQData(events: any[]) {
  return events.map((event: any) => ({
    id: `predicthq_${event.id}`,
    title: event.title,
    description: event.description || '',
    date: event.start,
    endDate: event.end,
    location: {
      venue: event.entities?.find((e: any) => e.type === 'venue')?.name || 'TBA',
      address: event.location?.join(', ') || '',
      city: event.place_hierarchies?.[0]?.[1] || '',
      country: event.country || '',
      isOnline: false,
      coordinates: event.location ? {
        lat: event.location[1],
        lng: event.location[0]
      } : null
    },
    organizer: event.entities?.find((e: any) => e.type === 'organizer')?.name || 'Unknown',
    imageUrl: null,
    registrationUrl: event.predicted_event_url || '',
    price: {
      amount: 0,
      currency: 'USD',
      isFree: true
    },
    category: event.category,
    tags: event.labels || [],
    source: 'predicthq',
    relevanceScore: event.rank || 50,
    fetchedAt: new Date().toISOString()
  }))
}

// Detect event category
function detectCategory(title: string = '', description: string = '') {
  const text = (title + ' ' + description).toLowerCase()
  
  if (text.includes('demo day') || text.includes('pitch')) return 'demo-day'
  if (text.includes('hackathon')) return 'hackathon'
  if (text.includes('conference') || text.includes('summit')) return 'conference'
  if (text.includes('workshop')) return 'workshop'
  if (text.includes('meetup')) return 'meetup'
  if (text.includes('webinar')) return 'webinar'
  
  return 'general'
}

// Extract relevant tags
function extractTags(text: string): string[] {
  const keywords = [
    'ai', 'ml', 'blockchain', 'web3', 'startup', 'fintech', 
    'saas', 'cloud', 'devops', 'product', 'design', 'growth',
    'venture', 'funding', 'pitch', 'demo', 'networking'
  ]
  
  const foundTags = keywords.filter(keyword => 
    text.toLowerCase().includes(keyword)
  )
  
  return [...new Set(foundTags)]
}

// Calculate relevance score
function calculateRelevance(event: any): number {
  let score = 50
  
  // Boost for certain keywords
  const title = (event.name?.text || '').toLowerCase()
  if (title.includes('demo day')) score += 30
  if (title.includes('yc') || title.includes('y combinator')) score += 25
  if (title.includes('pitch')) score += 20
  if (title.includes('startup')) score += 15
  if (title.includes('ai') || title.includes('artificial intelligence')) score += 15
  
  // Boost for free events
  if (event.is_free) score += 10
  
  // Boost for online events (more accessible)
  if (event.online_event) score += 5
  
  return Math.min(100, score)
}

// Mock data generators
function getMockEventbriteData(location: string) {
  return [
    {
      id: 'mock_eb_1',
      title: 'Y Combinator Demo Day - Winter 2025',
      description: 'Watch 200+ startups present to top investors',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        venue: 'YC Headquarters',
        address: '335 Pioneer Way',
        city: 'Mountain View',
        country: 'USA',
        isOnline: true,
        coordinates: { lat: 37.3861, lng: -122.0839 }
      },
      organizer: 'Y Combinator',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87',
      registrationUrl: 'https://www.ycombinator.com/demo-day',
      price: { amount: 0, currency: 'USD', isFree: true },
      category: 'demo-day',
      tags: ['startup', 'investment', 'demo day', 'yc'],
      source: 'eventbrite',
      relevanceScore: 100,
      fetchedAt: new Date().toISOString()
    },
    {
      id: 'mock_eb_2',
      title: 'AI Startup Founders Meetup',
      description: 'Network with AI startup founders in your area',
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        venue: 'Google Campus',
        address: '345 Spear St',
        city: location,
        country: 'USA',
        isOnline: false,
        coordinates: null
      },
      organizer: 'Tech Founders Network',
      imageUrl: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b',
      registrationUrl: '#',
      price: { amount: 0, currency: 'USD', isFree: true },
      category: 'meetup',
      tags: ['ai', 'startup', 'networking'],
      source: 'eventbrite',
      relevanceScore: 85,
      fetchedAt: new Date().toISOString()
    }
  ]
}

function getMockPredictHQData(location: string) {
  return [
    {
      id: 'mock_phq_1',
      title: 'TechCrunch Disrupt 2025',
      description: 'The premier startup conference',
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      location: {
        venue: 'Moscone Center',
        address: '747 Howard St',
        city: 'San Francisco',
        country: 'USA',
        isOnline: true,
        coordinates: { lat: 37.7749, lng: -122.4194 }
      },
      organizer: 'TechCrunch',
      imageUrl: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678',
      registrationUrl: 'https://techcrunch.com/events/disrupt',
      price: { amount: 1295, currency: 'USD', isFree: false },
      category: 'conference',
      tags: ['startup', 'conference', 'techcrunch'],
      source: 'predicthq',
      relevanceScore: 95,
      fetchedAt: new Date().toISOString()
    }
  ]
}

// Main handler
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const location = url.searchParams.get('location') || 'San Francisco'
    const forceRefresh = url.searchParams.get('refresh') === 'true'
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const { data: cachedEvents, error: cacheError } = await supabase
        .from('event_cache')
        .select('*')
        .eq('location', location)
        .gte('expires_at', new Date().toISOString())
        .single()

      if (cachedEvents && !cacheError) {
        console.log('Returning cached events')
        return new Response(
          JSON.stringify({ 
            events: cachedEvents.events,
            cached: true,
            cachedAt: cachedEvents.created_at
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Fetch fresh events from all sources
    console.log(`Fetching fresh events for ${location}`)
    
    const [eventbriteEvents, predicthqEvents] = await Promise.all([
      fetchEventbriteEvents(location),
      fetchPredictHQEvents(location)
    ])

    // Combine and deduplicate events
    const allEvents = [...eventbriteEvents, ...predicthqEvents]
    
    // Remove duplicates based on title and date
    const uniqueEvents = allEvents.reduce((acc: any[], event) => {
      const isDuplicate = acc.some(e => 
        e.title === event.title && 
        e.date === event.date
      )
      if (!isDuplicate) {
        acc.push(event)
      }
      return acc
    }, [])

    // Sort by relevance and date
    uniqueEvents.sort((a, b) => {
      // First by relevance
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore
      }
      // Then by date (upcoming first)
      return new Date(a.date).getTime() - new Date(b.date).getTime()
    })

    // Cache the results (1 hour expiry)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    await supabase
      .from('event_cache')
      .upsert({
        location,
        events: uniqueEvents,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'location'
      })

    return new Response(
      JSON.stringify({ 
        events: uniqueEvents,
        cached: false,
        totalEvents: uniqueEvents.length,
        sources: ['eventbrite', 'predicthq']
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error in fetch-events function:', error)
    
    // Return mock data on error
    const mockEvents = [
      ...getMockEventbriteData('San Francisco'),
      ...getMockPredictHQData('San Francisco')
    ]
    
    return new Response(
      JSON.stringify({ 
        events: mockEvents,
        error: true,
        message: 'Using mock data due to error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})