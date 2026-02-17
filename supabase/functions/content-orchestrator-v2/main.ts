import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireSupabaseJwt } from "../_shared/auth.ts";

const ALLOWED_ORIGINS = [
  'https://scopedrop.com',
  'https://www.scopedrop.com',
  'https://scopedrop.lovable.app',
  'https://id-preview--4acd3d99-4555-4448-bee8-897d547c57c0.lovable.app',
  ...(Deno.env.get('ENVIRONMENT') === 'development' ? ['http://localhost:5173', 'http://localhost:8080'] : [])
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.lovable.app'))
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

interface ContentJob {
  id: string;
  type: 'news' | 'funding' | 'events' | 'ai_summary' | 'batch_fetch';
  priority: 'high' | 'medium' | 'low';
  config: {
    keywords: string[];
    count: number;
    sources: string[];
    refreshInterval?: number;
  };
}

interface BatchRequest {
  contentTypes: string[];
  keywords: string[];
  priority: 'high' | 'medium' | 'low';
  batchId: string;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? null
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? null
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? null

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    const authContext = await requireSupabaseJwt(req, {
      supabaseUrl,
      serviceRoleKey: supabaseServiceKey,
      anonKey: supabaseAnonKey,
      corsHeaders,
    })
    if (authContext instanceof Response) return authContext
    if (authContext.role !== 'service_role') {
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { action, data } = await req.json()

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    let result: any = { success: false }

    switch (action) {
      case 'schedule_job':
        result = await scheduleContentJob(supabase, data)
        break
      case 'execute_job':
        result = await executeContentJob(supabase, data)
        break
      case 'batch_fetch':
        result = await batchFetchContent(supabase, data)
        break
      case 'monitor_quotas':
        result = await monitorQuotas(supabase)
        break
      case 'cleanup_cache':
        result = await cleanupCache(supabase)
        break
      case 'update_analytics':
        result = await updateAnalytics(supabase, data)
        break
      default:
        result = { success: false, error: 'Unknown action' }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// 1. SCHEDULE CONTENT JOB
async function scheduleContentJob(supabase: any, job: ContentJob) {
  try {
    const nextRun = calculateNextRun(job.type, job.priority)
    
    await supabase.from('content_jobs').upsert({
      job_id: job.id,
      job_type: job.type,
      priority: job.priority,
      status: 'scheduled',
      config: job.config,
      next_run: nextRun.toISOString()
    })

    return { 
      success: true, 
      job_id: job.id,
      next_run: nextRun.toISOString()
    }
  } catch (error) {
    console.error('Schedule job error:', error)
    return { success: false, error: error.message }
  }
}

// 2. EXECUTE CONTENT JOB
async function executeContentJob(supabase: any, jobId: string) {
  try {
    // Get job details
    const { data: job } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (!job) {
      return { success: false, error: 'Job not found' }
    }

    // Update job status
    await updateJobStatus(supabase, jobId, 'running')

    let content: any = null

    // Execute based on job type
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
      default:
        throw new Error(`Unknown job type: ${job.job_type}`)
    }

    // Cache the content
    await cacheContent(supabase, job.job_type, content, job.config, job.priority)

    // Update job status
    await updateJobStatus(supabase, jobId, 'completed')

    return { 
      success: true, 
      content,
      job_id: jobId
    }

  } catch (error) {
    console.error('Execute job error:', error)
    await updateJobStatus(supabase, jobId, 'failed', error.message)
    return { success: false, error: error.message }
  }
}

// 3. BATCH FETCH CONTENT (Optimized API usage)
async function batchFetchContent(supabase: any, batchRequest: BatchRequest) {
  try {
    const startTime = Date.now()
    const results: any = {}

    // Group requests by similarity to minimize API calls
    const groupedRequests = groupRequestsBySimilarity(
      batchRequest.contentTypes, 
      batchRequest.keywords
    )

    // Process each group
    for (const [groupKey, requests] of Object.entries(groupedRequests)) {
      try {
        const batchResults = await makeBatchedApiCall(requests)
        results[groupKey] = batchResults
      } catch (error) {
        console.error(`Batch group ${groupKey} failed:`, error)
        results[groupKey] = []
      }
    }

    // Cache results
    for (const [contentType, content] of Object.entries(results)) {
      if (content && content.length > 0) {
        await cacheContent(supabase, contentType, content, {
          keywords: batchRequest.keywords,
          count: content.length
        }, batchRequest.priority)
      }
    }

    const responseTime = Date.now() - startTime

    return {
      success: true,
      data: results,
      batch_id: batchRequest.batchId,
      response_time: responseTime,
      cache_status: 'fresh'
    }

  } catch (error) {
    console.error('Batch fetch error:', error)
    return { success: false, error: error.message }
  }
}

// 4. MONITOR QUOTAS
async function monitorQuotas(supabase: any) {
  try {
    const { data: quotas } = await supabase
      .from('quota_management')
      .select('*')

    const quotaStatus = quotas?.map((quota: any) => ({
      api_type: quota.api_type,
      daily_limit: quota.daily_limit,
      daily_used: quota.daily_used || 0,
      hourly_limit: quota.hourly_limit,
      hourly_used: quota.hourly_used || 0,
      is_active: quota.is_active,
      reset_time: quota.reset_time
    })) || []

    return {
      success: true,
      quotas: quotaStatus,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Monitor quotas error:', error)
    return { success: false, error: error.message }
  }
}

// 5. CLEANUP CACHE
async function cleanupCache(supabase: any) {
  try {
    // Clean expired cache entries
    await supabase.rpc('cleanup_expired_cache')

    // Reset daily quotas if needed
    await supabase.rpc('reset_daily_quotas')

    return {
      success: true,
      message: 'Cache cleanup completed',
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Cleanup cache error:', error)
    return { success: false, error: error.message }
  }
}

// 6. UPDATE ANALYTICS
async function updateAnalytics(supabase: any, data: any) {
  try {
    const { cache_key, hit_type, response_time, source } = data

    await supabase.from('content_analytics').insert({
      cache_key,
      hit_type,
      response_time,
      source,
      timestamp: new Date().toISOString()
    })

    return {
      success: true,
      message: 'Analytics updated'
    }

  } catch (error) {
    console.error('Update analytics error:', error)
    return { success: false, error: error.message }
  }
}

// HELPER FUNCTIONS
async function checkQuota(supabase: any, apiType: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('quota_management')
      .select('daily_used, daily_limit, hourly_used, hourly_limit')
      .eq('api_type', apiType)
      .single()

    if (!data) return false

    return data.daily_used < data.daily_limit && data.hourly_used < data.hourly_limit
  } catch (error) {
    console.error('Quota check error:', error)
    return false
  }
}

async function fetchNewsContent(config: any): Promise<any[]> {
  try {
    const query = config.keywords.join(' OR ')
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${config.count}&apikey=${Deno.env.get('GNEWS_API_KEY')}`
    
    const response = await fetch(url)
    if (!response.ok) throw new Error(`GNews API error: ${response.status}`)
    
    const data = await response.json()
    return data.articles || []
  } catch (error) {
    console.error('News fetch error:', error)
    return []
  }
}

async function fetchFundingContent(config: any): Promise<any[]> {
  try {
    const newsContent = await fetchNewsContent(config)
    return newsContent.filter((article: any) => 
      article.title.toLowerCase().includes('funding') ||
      article.title.toLowerCase().includes('series') ||
      article.title.toLowerCase().includes('raise')
    )
  } catch (error) {
    console.error('Funding fetch error:', error)
    return []
  }
}

async function fetchEventsContent(config: any): Promise<any[]> {
  try {
    const events = []
    
    // Fetch from Meetup API
    const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=5')
    const meetupData = await meetupResponse.json()
    
    if (meetupData.events) {
      events.push(...meetupData.events.map((event: any) => ({
        name: event.name,
        date: new Date(event.time).toISOString(),
        location: event.venue?.city || 'Online',
        url: event.link,
        source: 'Meetup'
      })))
    }
    
    return events.slice(0, config.count)
  } catch (error) {
    console.error('Events fetch error:', error)
    return []
  }
}

async function generateAISummary(config: any): Promise<string> {
  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`
    
    const prompt = `Summarize the latest startup news and trends in 2-3 sentences. Focus on: ${config.keywords.join(', ')}.`

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    })
    
    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available'
  } catch (error) {
    console.error('AI summary error:', error)
    return 'Summary unavailable'
  }
}

async function cacheContent(supabase: any, type: string, content: any, config: any, priority: string = 'medium'): Promise<void> {
  try {
    const cacheKey = `${type}_${config.keywords?.join('_') || 'general'}_${content.length || 1}`
    const ttl = getTTLForPriority(priority)
    const qualityScore = calculateQualityScore(content)

    await supabase.from('content_cache').upsert({
      cache_key: cacheKey,
      cache_data: content,
      cache_type: type,
      source: 'edge_function',
      ttl: ttl,
      quality_score: qualityScore,
      metadata: {
        priority,
        keywords: config.keywords,
        count: content.length || 1,
        cached_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Cache content error:', error)
  }
}

async function getCachedContent(supabase: any, type: string, config: any): Promise<any> {
  try {
    const cacheKey = `${type}_${config.keywords?.join('_') || 'general'}_${config.count || 1}`
    
    const { data } = await supabase
      .from('content_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .single()

    if (data && isCacheValid(data)) {
      return data.cache_data
    }
    
    return null
  } catch (error) {
    return null
  }
}

async function recordApiUsage(supabase: any, apiType: string, responseTime: number, statusCode: number): Promise<void> {
  try {
    await supabase.rpc('update_quota_usage', {
      api_type_param: apiType,
      used_count: 1
    })

    await supabase.from('performance_metrics').insert({
      api_type: apiType,
      response_time: responseTime,
      status_code: statusCode,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Record API usage error:', error)
  }
}

async function updateJobStatus(supabase: any, jobId: string, status: string, errorMessage?: string): Promise<void> {
  try {
    const updateData: any = {
      status,
      last_run: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.next_run = calculateNextRun('news', 'medium').toISOString()
    }

    if (errorMessage) {
      updateData.error_message = errorMessage
    }

    await supabase
      .from('content_jobs')
      .update(updateData)
      .eq('job_id', jobId)
  } catch (error) {
    console.error('Update job status error:', error)
  }
}

function calculateNextRun(type: string, priority: string): Date {
  const now = new Date()
  const interval = getTTLForPriority(priority)
  return new Date(now.getTime() + interval)
}

function getTTLForPriority(priority: string): number {
  switch (priority) {
    case 'high': return 2 * 60 * 60 * 1000 // 2 hours
    case 'medium': return 4 * 60 * 60 * 1000 // 4 hours
    case 'low': return 12 * 60 * 60 * 1000 // 12 hours
    default: return 4 * 60 * 60 * 1000
  }
}

function calculateQualityScore(content: any): number {
  if (!content) return 0
  
  let score = 0
  
  if (Array.isArray(content) && content.length > 0) score += 30
  if (typeof content === 'object' && content !== null) score += 20
  
  if (content.publishedAt || content.timestamp) {
    const age = Date.now() - new Date(content.publishedAt || content.timestamp).getTime()
    if (age < 24 * 60 * 60 * 1000) score += 30
    else if (age < 7 * 24 * 60 * 60 * 1000) score += 20
    else score += 10
  }
  
  if (content.title && content.description) score += 20
  
  return Math.min(score, 100)
}

function isCacheValid(cacheEntry: any): boolean {
  const now = Date.now()
  const created = new Date(cacheEntry.created_at).getTime()
  return (now - created) < cacheEntry.ttl
}

function groupRequestsBySimilarity(contentTypes: string[], keywords: string[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {}
  
  // Group by content type and similar keywords
  contentTypes.forEach(type => {
    const groupKey = `${type}_${keywords.slice(0, 2).join('_')}`
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push({ type, keywords })
  })
  
  return groups
}

async function makeBatchedApiCall(requests: any[]): Promise<any[]> {
  // For now, process requests sequentially
  // In a real implementation, you might batch API calls
  const results = []
  
  for (const request of requests) {
    try {
      let content: any = null
      
      switch (request.type) {
        case 'news':
          content = await fetchNewsContent(request)
          break
        case 'funding':
          content = await fetchFundingContent(request)
          break
        case 'events':
          content = await fetchEventsContent(request)
          break
        default:
          content = []
      }
      
      results.push(...content)
    } catch (error) {
      console.error(`Request failed for ${request.type}:`, error)
    }
  }
  
  return results
}