import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ContentJob {
  id: string;
  type: 'news' | 'funding' | 'events' | 'ai_summary';
  priority: 'high' | 'medium' | 'low';
  lastRun: number;
  nextRun: number;
  config: {
    keywords: string[];
    count: number;
    sources: string[];
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { action, data } = await req.json()

    switch (action) {
      case 'schedule_content_job':
        return await scheduleContentJob(supabaseClient, data)
      
      case 'execute_content_job':
        return await executeContentJob(supabaseClient, data)
      
      case 'batch_fetch_content':
        return await batchFetchContent(supabaseClient, data)
      
      case 'update_cache_metadata':
        return await updateCacheMetadata(supabaseClient, data)
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// 1. SCHEDULE CONTENT JOBS
async function scheduleContentJob(supabase: any, job: ContentJob) {
  const { data, error } = await supabase
    .from('content_jobs')
    .upsert({
      job_id: job.id,
      job_type: job.type,
      priority: job.priority,
      last_run: new Date(job.lastRun).toISOString(),
      next_run: new Date(job.nextRun).toISOString(),
      config: job.config,
      status: 'scheduled'
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, job_id: job.id }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// 2. EXECUTE CONTENT JOB
async function executeContentJob(supabase: any, jobId: string) {
  // Get job details
  const { data: job, error: jobError } = await supabase
    .from('content_jobs')
    .select('*')
    .eq('job_id', jobId)
    .single()

  if (jobError) throw jobError

  // Check if we can make API calls
  const apiUsage = await getApiUsage(supabase, job.job_type)
  if (!canMakeApiCall(job.job_type, apiUsage)) {
    console.log(`🚫 API limit reached for ${job.job_type}, using cached content`)
    return await getCachedContent(supabase, job.job_type, job.config)
  }

  // Fetch fresh content
  let content
  switch (job.job_type) {
    case 'news':
      content = await fetchNewsContent(job.config)
      break
    case 'funding':
      content = await fetchFundingContent(job.config)
      break
    case 'events':
      content = await fetchEventsContent(job.config)
      break
    case 'ai_summary':
      content = await generateAISummary(job.config)
      break
  }

  // Cache the content
  await cacheContent(supabase, job.job_type, content, job.config)

  // Update job status
  await supabase
    .from('content_jobs')
    .update({
      last_run: new Date().toISOString(),
      next_run: calculateNextRun(job.job_type, job.priority),
      status: 'completed'
    })
    .eq('job_id', jobId)

  return new Response(
    JSON.stringify({ success: true, content, cached: false }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// 3. BATCH FETCH CONTENT (Optimize API calls)
async function batchFetchContent(supabase: any, config: any) {
  const { contentTypes, keywords } = config

  // Group similar requests to minimize API calls
  const batchedRequests = groupRequests(contentTypes, keywords)
  
  const results = {}
  
  for (const [batchKey, requests] of Object.entries(batchedRequests)) {
    const cacheKey = `batch_${batchKey}_${Date.now()}`
    
    // Check cache first
    const cached = await getCachedContent(supabase, 'batch', { cacheKey })
    if (cached) {
      results[batchKey] = cached
      continue
    }

    // Make single API call for batch
    const batchContent = await makeBatchedApiCall(requests)
    
    // Cache batch result
    await cacheContent(supabase, 'batch', batchContent, { cacheKey })
    
    results[batchKey] = batchContent
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// 4. UPDATE CACHE METADATA
async function updateCacheMetadata(supabase: any, data: any) {
  const { cacheKey, metadata } = data

  const { error } = await supabase
    .from('content_cache')
    .update({
      metadata: metadata,
      updated_at: new Date().toISOString()
    })
    .eq('cache_key', cacheKey)

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// HELPER FUNCTIONS

async function fetchNewsContent(config: any) {
  const { keywords, count, sources } = config
  
  // Use GNews API efficiently
  const query = keywords.join(' OR ')
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${count}&apikey=${Deno.env.get('GNEWS_API_KEY')}`
  
  const response = await fetch(url)
  const data = await response.json()
  
  return data.articles || []
}

async function fetchFundingContent(config: any) {
  // Extract funding news from general news
  const newsContent = await fetchNewsContent(config)
  
  return newsContent.filter(article => 
    article.title.toLowerCase().includes('funding') ||
    article.title.toLowerCase().includes('series') ||
    article.title.toLowerCase().includes('raise') ||
    article.title.toLowerCase().includes('investment')
  )
}

async function fetchEventsContent(config: any) {
  // Use free APIs for events
  const events = []
  
  // Meetup API
  const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=10')
  const meetupData = await meetupResponse.json()
  
  if (meetupData.events) {
    events.push(...meetupData.events.map(event => ({
      name: event.name,
      date: new Date(event.time).toISOString(),
      location: event.venue?.city || 'Online',
      url: event.link,
      source: 'Meetup'
    })))
  }
  
  return events
}

async function generateAISummary(config: any) {
  const { content, prompt } = config
  
  // Use Gemini API efficiently
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
  
  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `${prompt}\n\nContent: ${JSON.stringify(content)}`
        }]
      }]
    })
  })
  
  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function getApiUsage(supabase: any, apiType: string) {
  const { data } = await supabase
    .from('api_usage')
    .select('*')
    .eq('api_type', apiType)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  return data || []
}

function canMakeApiCall(apiType: string, usage: any[]): boolean {
  const limits = {
    gnews: { daily: 1000, hourly: 100 },
    gemini: { daily: 15000, hourly: 1500 }
  }
  
  const now = Date.now()
  const hourlyUsage = usage.filter(u => now - new Date(u.created_at).getTime() < 60 * 60 * 1000).length
  const dailyUsage = usage.length
  
  const limit = limits[apiType as keyof typeof limits]
  if (!limit) return true
  
  return hourlyUsage < limit.hourly && dailyUsage < limit.daily
}

async function getCachedContent(supabase: any, type: string, config: any) {
  const cacheKey = `${type}_${JSON.stringify(config)}`
  
  const { data } = await supabase
    .from('content_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .single()
  
  if (data && isCacheValid(data)) {
    return data.cache_data
  }
  
  return null
}

async function cacheContent(supabase: any, type: string, content: any, config: any) {
  const cacheKey = `${type}_${JSON.stringify(config)}`
  
  await supabase
    .from('content_cache')
    .upsert({
      cache_key: cacheKey,
      cache_data: content,
      cache_type: type,
      ttl: getTTL(type),
      created_at: new Date().toISOString()
    })
}

function calculateNextRun(type: string, priority: string): Date {
  const now = Date.now()
  const intervals = {
    high: { news: 2 * 60 * 60 * 1000, funding: 1 * 60 * 60 * 1000, events: 6 * 60 * 60 * 1000 },
    medium: { news: 4 * 60 * 60 * 1000, funding: 2 * 60 * 60 * 1000, events: 12 * 60 * 60 * 1000 },
    low: { news: 8 * 60 * 60 * 1000, funding: 4 * 60 * 60 * 1000, events: 24 * 60 * 60 * 1000 }
  }
  
  const interval = intervals[priority as keyof typeof intervals][type as keyof typeof intervals.high]
  return new Date(now + interval)
}

function groupRequests(contentTypes: string[], keywords: string[]) {
  // Group similar requests to minimize API calls
  const groups = {}
  
  contentTypes.forEach(type => {
    const groupKey = `${type}_${keywords.sort().join('_')}`
    if (!groups[groupKey]) {
      groups[groupKey] = { type, keywords }
    }
  })
  
  return groups
}

function isCacheValid(cacheEntry: any): boolean {
  const age = Date.now() - new Date(cacheEntry.created_at).getTime()
  return age < cacheEntry.ttl
}

function getTTL(type: string): number {
  const ttls = {
    news: 4 * 60 * 60 * 1000, // 4 hours
    funding: 2 * 60 * 60 * 1000, // 2 hours
    events: 12 * 60 * 60 * 1000, // 12 hours
    ai_summary: 24 * 60 * 60 * 1000 // 24 hours
  }
  
  return ttls[type as keyof typeof ttls] || 6 * 60 * 60 * 1000
}