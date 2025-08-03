import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      case 'schedule_job':
        return await scheduleContentJob(supabaseClient, data)
      
      case 'execute_job':
        return await executeContentJob(supabaseClient, data)
      
      case 'batch_fetch':
        return await batchFetchContent(supabaseClient, data)
      
      case 'monitor_quotas':
        return await monitorQuotas(supabaseClient)
      
      case 'cleanup_cache':
        return await cleanupCache(supabaseClient)
      
      case 'update_analytics':
        return await updateAnalytics(supabaseClient, data)
      
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

// 1. SCHEDULE CONTENT JOB
async function scheduleContentJob(supabase: any, job: ContentJob) {
  const nextRun = calculateNextRun(job.type, job.priority);
  
  const { data, error } = await supabase
    .from('content_jobs')
    .upsert({
      job_id: job.id,
      job_type: job.type,
      priority: job.priority,
      status: 'scheduled',
      config: job.config,
      next_run: nextRun.toISOString(),
      created_at: new Date().toISOString()
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ 
      success: true, 
      job_id: job.id,
      next_run: nextRun.toISOString()
    }),
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

  // Update job status to running
  await supabase
    .from('content_jobs')
    .update({ status: 'running', updated_at: new Date().toISOString() })
    .eq('job_id', jobId)

  try {
    // Check quota before making API calls
    const canMakeCall = await checkQuota(supabase, job.job_type === 'ai_summary' ? 'gemini' : 'gnews');
    
    if (!canMakeCall) {
      console.log(`🚫 Quota exceeded for ${job.job_type}, using cached content`);
      await updateJobStatus(supabase, jobId, 'completed', 'Quota exceeded, used cached content');
      return await getCachedContent(supabase, job.job_type, job.config);
    }

    // Fetch fresh content
    let content;
    const startTime = Date.now();
    
    switch (job.job_type) {
      case 'news':
        content = await fetchNewsContent(job.config);
        break
      case 'funding':
        content = await fetchFundingContent(job.config);
        break
      case 'events':
        content = await fetchEventsContent(job.config);
        break
      case 'ai_summary':
        content = await generateAISummary(job.config);
        break
      default:
        throw new Error(`Unknown job type: ${job.job_type}`)
    }

    const responseTime = Date.now() - startTime;

    // Cache the content
    await cacheContent(supabase, job.job_type, content, job.config, job.priority);

    // Record API usage
    await recordApiUsage(supabase, job.job_type === 'ai_summary' ? 'gemini' : 'gnews', responseTime, 200);

    // Update job status
    await updateJobStatus(supabase, jobId, 'completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        content, 
        cached: false,
        response_time: responseTime,
        job_id: jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error(`Error executing job ${jobId}:`, error);
    
    // Update job status to failed
    await updateJobStatus(supabase, jobId, 'failed', error.message);
    
    // Return cached content as fallback
    const cachedContent = await getCachedContent(supabase, job.job_type, job.config);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        content: cachedContent,
        cached: true,
        job_id: jobId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

// 3. BATCH FETCH CONTENT (Optimized API usage)
async function batchFetchContent(supabase: any, batchRequest: BatchRequest) {
  const { contentTypes, keywords, priority, batchId } = batchRequest;
  
  console.log(`🔄 Starting batch fetch: ${batchId} (${contentTypes.join(', ')})`);

  // Group similar requests to minimize API calls
  const groupedRequests = groupRequestsBySimilarity(contentTypes, keywords);
  
  const results: any = {};
  const totalStartTime = Date.now();
  
  for (const [groupKey, requests] of Object.entries(groupedRequests)) {
    const cacheKey = `batch_${groupKey}_${batchId}`;
    
    // Check cache first
    const cached = await getCachedContent(supabase, 'batch', { cacheKey });
    if (cached) {
      results[groupKey] = cached;
      continue;
    }

    // Check quota for this group
    const canMakeCall = await checkQuota(supabase, 'gnews');
    if (!canMakeCall) {
      console.log(`🚫 Quota exceeded for batch ${groupKey}, using cached content`);
      const cachedGroup = await getCachedContent(supabase, groupKey, { keywords });
      results[groupKey] = cachedGroup || [];
      continue;
    }

    // Make single API call for group
    const startTime = Date.now();
    const batchContent = await makeBatchedApiCall(requests);
    const responseTime = Date.now() - startTime;
    
    // Cache batch result
    await cacheContent(supabase, 'batch', batchContent, { cacheKey }, priority);
    
    // Record API usage
    await recordApiUsage(supabase, 'gnews', responseTime, 200);
    
    results[groupKey] = batchContent;
  }

  const totalResponseTime = Date.now() - totalStartTime;

  return new Response(
    JSON.stringify({ 
      success: true, 
      results,
      batch_id: batchId,
      total_response_time: totalResponseTime,
      cached_entries: Object.keys(results).filter(key => results[key]?.cached).length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// 4. MONITOR QUOTAS
async function monitorQuotas(supabase: any) {
  const { data: quotas, error } = await supabase
    .from('quota_management')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;

  const quotaStatus = quotas.map(quota => ({
    api_type: quota.api_type,
    daily_used: quota.daily_used,
    daily_limit: quota.daily_limit,
    hourly_used: quota.hourly_used,
    hourly_limit: quota.hourly_limit,
    daily_percentage: Math.round((quota.daily_used / quota.daily_limit) * 100),
    hourly_percentage: Math.round((quota.hourly_used / quota.hourly_limit) * 100),
    reset_time: quota.reset_time
  }));

  return new Response(
    JSON.stringify({ 
      success: true, 
      quotas: quotaStatus,
      timestamp: new Date().toISOString()
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// 5. CLEANUP CACHE
async function cleanupCache(supabase: any) {
  try {
    // Clean up expired cache
    await supabase.rpc('cleanup_expired_cache');
    
    // Reset daily quotas if needed
    await supabase.rpc('reset_daily_quotas');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cache cleanup completed',
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Cache cleanup failed: ${error.message}`);
  }
}

// 6. UPDATE ANALYTICS
async function updateAnalytics(supabase: any, data: any) {
  const { content_type, content_id, cache_key, metric_type, metric_value, metadata } = data;
  
  try {
    await supabase.from('performance_metrics').insert({
      metric_type,
      metric_name: `${content_type}_${metric_type}`,
      metric_value,
      metadata: { content_id, cache_key, ...metadata },
      recorded_at: new Date().toISOString()
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analytics updated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    throw new Error(`Analytics update failed: ${error.message}`);
  }
}

// HELPER FUNCTIONS

async function checkQuota(supabase: any, apiType: string): Promise<boolean> {
  const { data: quota, error } = await supabase
    .from('quota_management')
    .select('*')
    .eq('api_type', apiType)
    .single();

  if (error || !quota) return false;

  const now = new Date();
  const resetTime = new Date(quota.reset_time);

  // Reset if past reset time
  if (now > resetTime) {
    await supabase.rpc('reset_daily_quotas');
    return true;
  }

  return quota.daily_used < quota.daily_limit && quota.hourly_used < quota.hourly_limit;
}

async function fetchNewsContent(config: any): Promise<any[]> {
  const { keywords, count } = config;
  const query = keywords.join(' OR ');
  
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${count}&apikey=${Deno.env.get('GNEWS_API_KEY')}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GNews API error: ${response.status}`);
  
  const data = await response.json();
  return data.articles || [];
}

async function fetchFundingContent(config: any): Promise<any[]> {
  const newsContent = await fetchNewsContent(config);
  
  return newsContent.filter(article => 
    article.title.toLowerCase().includes('funding') ||
    article.title.toLowerCase().includes('series') ||
    article.title.toLowerCase().includes('raise') ||
    article.title.toLowerCase().includes('investment')
  );
}

async function fetchEventsContent(config: any): Promise<any[]> {
  const events = [];
  
  // Meetup API
  const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=10');
  const meetupData = await meetupResponse.json();
  
  if (meetupData.events) {
    events.push(...meetupData.events.map((event: any) => ({
      name: event.name,
      date: new Date(event.time).toISOString(),
      location: event.venue?.city || 'Online',
      url: event.link,
      source: 'Meetup'
    })));
  }
  
  return events;
}

async function generateAISummary(config: any): Promise<string> {
  const newsContent = await fetchNewsContent(config);
  
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${Deno.env.get('GEMINI_API_KEY')}`;
  
  const prompt = `Analyze these startup news articles and provide a comprehensive summary:

${newsContent.map(article => `- ${article.title}: ${article.description}`).join('\n')}

Provide:
1. Key trends and insights
2. Notable companies and funding amounts
3. Market analysis
4. Future predictions

Format: Clear, engaging, startup-focused (300-500 words)`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      }
    })
  });
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';
}

async function cacheContent(supabase: any, type: string, content: any, config: any, priority: string = 'medium'): Promise<void> {
  const cacheKey = `${type}_${JSON.stringify(config)}`;
  const ttl = getTTLForPriority(priority);
  
  await supabase
    .from('content_cache')
    .upsert({
      cache_key: cacheKey,
      cache_data: content,
      cache_type: type,
      source: type === 'ai_summary' ? 'gemini' : 'gnews',
      ttl: ttl,
      quality_score: calculateQualityScore(content),
      metadata: { priority, config },
      created_at: new Date().toISOString()
    }, { onConflict: 'cache_key' });
}

async function getCachedContent(supabase: any, type: string, config: any): Promise<any> {
  const cacheKey = `${type}_${JSON.stringify(config)}`;
  
  const { data } = await supabase
    .from('content_cache')
    .select('*')
    .eq('cache_key', cacheKey)
    .single();
  
  if (data && isCacheValid(data)) {
    return data.cache_data;
  }
  
  return null;
}

async function recordApiUsage(supabase: any, apiType: string, responseTime: number, statusCode: number): Promise<void> {
  await supabase.rpc('update_quota_usage', {
    api_type_param: apiType,
    used_count: 1
  });

  await supabase.from('api_usage').insert({
    api_type: apiType,
    endpoint: 'content_fetch',
    response_time: responseTime,
    status_code: statusCode,
    created_at: new Date().toISOString()
  });
}

async function updateJobStatus(supabase: any, jobId: string, status: string, errorMessage?: string): Promise<void> {
  await supabase
    .from('content_jobs')
    .update({
      status,
      last_run: new Date().toISOString(),
      next_run: calculateNextRun('news', 'medium').toISOString(),
      error_message: errorMessage,
      updated_at: new Date().toISOString()
    })
    .eq('job_id', jobId);
}

function calculateNextRun(type: string, priority: string): Date {
  const now = Date.now();
  const intervals = {
    high: { news: 4 * 60 * 60 * 1000, funding: 2 * 60 * 60 * 1000, events: 6 * 60 * 60 * 1000 },
    medium: { news: 4 * 60 * 60 * 1000, funding: 2 * 60 * 60 * 1000, events: 12 * 60 * 60 * 1000 },
    low: { news: 8 * 60 * 60 * 1000, funding: 4 * 60 * 60 * 1000, events: 24 * 60 * 60 * 1000 }
  };
  
  const interval = intervals[priority as keyof typeof intervals][type as keyof typeof intervals.high];
  return new Date(now + interval);
}

function getTTLForPriority(priority: string): number {
  const ttls = {
    high: 2 * 60 * 60 * 1000, // 2 hours
    medium: 4 * 60 * 60 * 1000, // 4 hours
    low: 12 * 60 * 60 * 1000 // 12 hours
  };
  
  return ttls[priority as keyof typeof ttls] || 6 * 60 * 60 * 1000;
}

function calculateQualityScore(content: any): number {
  let score = 0;
  
  if (Array.isArray(content)) {
    score += content.length * 2;
    score += content.filter(item => item.title && item.description).length * 5;
  }
  
  if (typeof content === 'object' && content.title) {
    score += content.title.length > 20 ? 10 : 5;
    score += content.description ? 15 : 0;
  }
  
  return Math.min(score, 100);
}

function isCacheValid(cacheEntry: any): boolean {
  const age = Date.now() - new Date(cacheEntry.created_at).getTime();
  return age < cacheEntry.ttl;
}

function groupRequestsBySimilarity(contentTypes: string[], keywords: string[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  contentTypes.forEach(type => {
    const groupKey = `${type}_${keywords.sort().join('_')}`;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push({ type, keywords });
  });
  
  return groups;
}

async function makeBatchedApiCall(requests: any[]): Promise<any[]> {
  // Combine similar requests into single API call
  const allKeywords = [...new Set(requests.flatMap(req => req.keywords))];
  const query = allKeywords.join(' OR ');
  
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=50&apikey=${Deno.env.get('GNEWS_API_KEY')}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Batch API error: ${response.status}`);
  
  const data = await response.json();
  return data.articles || [];
}