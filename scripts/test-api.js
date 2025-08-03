#!/usr/bin/env node

/**
 * API Integration Test Script
 * Tests the API integration and quota management functionality
 */

import { enhancedCacheManager } from '../src/services/enhancedCacheManager.js';

const testConfigs = {
  news: {
    keywords: ['startup', 'tech'],
    count: 5,
    priority: 'high'
  },
  funding: {
    keywords: ['funding', 'venture capital'],
    count: 3,
    priority: 'high'
  },
  events: {
    keywords: ['startup events'],
    count: 2,
    priority: 'medium'
  }
};

async function testApiQuotaManagement() {
  console.log('🧪 Testing API Quota Management...\n');

  try {
    // Test 1: Check API Quota
    console.log('1. Testing API Quota Check...');
    const gnewsQuota = await enhancedCacheManager.canMakeApiCall('gnews');
    const geminiQuota = await enhancedCacheManager.canMakeApiCall('gemini');
    
    console.log(`✅ GNews API quota available: ${gnewsQuota}`);
    console.log(`✅ Gemini API quota available: ${geminiQuota}`);

    // Test 2: Record API Usage
    console.log('\n2. Testing API Usage Recording...');
    await enhancedCacheManager.recordApiCall('gnews', 150, 200);
    await enhancedCacheManager.recordApiCall('gemini', 2000, 200);
    console.log('✅ API usage recorded successfully');

    // Test 3: Environment Limits
    console.log('\n3. Testing Environment Limits...');
    const environment = enhancedCacheManager.getEnvironment();
    const gnewsLimits = enhancedCacheManager.getApiLimits('gnews');
    const geminiLimits = enhancedCacheManager.getApiLimits('gemini');
    
    console.log(`✅ Environment: ${environment}`);
    console.log(`✅ GNews limits: ${JSON.stringify(gnewsLimits)}`);
    console.log(`✅ Gemini limits: ${JSON.stringify(geminiLimits)}`);

  } catch (error) {
    console.error('❌ API quota test failed:', error.message);
  }
}

async function testContentFetching() {
  console.log('\n📡 Testing Content Fetching...\n');

  try {
    // Test 1: News Content
    console.log('1. Testing News Content Fetch...');
    const newsContent = await fetchNewsContent(testConfigs.news);
    
    if (newsContent && newsContent.length > 0) {
      console.log(`✅ News content fetched: ${newsContent.length} articles`);
      console.log(`   Sample: ${newsContent[0].title}`);
    } else {
      console.log('❌ News content fetch failed');
    }

    // Test 2: Funding Content
    console.log('\n2. Testing Funding Content Fetch...');
    const fundingContent = await fetchFundingContent(testConfigs.funding);
    
    if (fundingContent && fundingContent.length > 0) {
      console.log(`✅ Funding content fetched: ${fundingContent.length} articles`);
      console.log(`   Sample: ${fundingContent[0].title}`);
    } else {
      console.log('❌ Funding content fetch failed');
    }

    // Test 3: Events Content
    console.log('\n3. Testing Events Content Fetch...');
    const eventsContent = await fetchEventsContent(testConfigs.events);
    
    if (eventsContent && eventsContent.length > 0) {
      console.log(`✅ Events content fetched: ${eventsContent.length} events`);
      console.log(`   Sample: ${eventsContent[0].name}`);
    } else {
      console.log('❌ Events content fetch failed');
    }

  } catch (error) {
    console.error('❌ Content fetching test failed:', error.message);
  }
}

async function testAIIntegration() {
  console.log('\n🤖 Testing AI Integration...\n');

  try {
    // Test 1: AI Summary Generation
    console.log('1. Testing AI Summary Generation...');
    const testArticles = [
      {
        title: "Startup Raises $10M in Series A",
        description: "Tech startup secures funding to expand operations"
      },
      {
        title: "New AI Platform Launches",
        description: "Innovative AI solution hits the market"
      }
    ];

    const summary = await generateAISummary(testArticles);
    
    if (summary && summary.length > 0) {
      console.log('✅ AI summary generated successfully');
      console.log(`   Length: ${summary.length} characters`);
      console.log(`   Preview: ${summary.substring(0, 100)}...`);
    } else {
      console.log('❌ AI summary generation failed');
    }

  } catch (error) {
    console.error('❌ AI integration test failed:', error.message);
  }
}

async function testEdgeFunctionIntegration() {
  console.log('\n⚡ Testing Edge Function Integration...\n');

  try {
    const edgeFunctionUrl = process.env.VITE_SUPABASE_URL + '/functions/v1/content-orchestrator-v2';
    
    // Test 1: Edge Function Health Check
    console.log('1. Testing Edge Function Health...');
    const healthResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'monitor_quotas'
      })
    });

    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Edge Function is healthy');
      console.log(`   Quotas: ${JSON.stringify(healthData.quotas)}`);
    } else {
      console.log('❌ Edge Function health check failed');
    }

    // Test 2: Content Job Scheduling
    console.log('\n2. Testing Content Job Scheduling...');
    const jobResponse = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        action: 'schedule_job',
        data: {
          id: `test_job_${Date.now()}`,
          type: 'news',
          priority: 'high',
          config: {
            keywords: ['startup'],
            count: 5,
            sources: ['gnews']
          }
        }
      })
    });

    if (jobResponse.ok) {
      const jobData = await jobResponse.json();
      console.log('✅ Content job scheduled successfully');
      console.log(`   Job ID: ${jobData.job_id}`);
    } else {
      console.log('❌ Content job scheduling failed');
    }

  } catch (error) {
    console.error('❌ Edge Function integration test failed:', error.message);
  }
}

// Helper functions for content fetching
async function fetchNewsContent(config) {
  const query = config.keywords.join(' OR ');
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&country=us&max=${config.count}&apikey=${process.env.VITE_GNEWS_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GNews API error: ${response.status}`);
  
  const data = await response.json();
  return data.articles || [];
}

async function fetchFundingContent(config) {
  const newsContent = await fetchNewsContent(config);
  return newsContent.filter(article => 
    article.title.toLowerCase().includes('funding') ||
    article.title.toLowerCase().includes('series') ||
    article.title.toLowerCase().includes('raise')
  );
}

async function fetchEventsContent(config) {
  const events = [];
  
  const meetupResponse = await fetch('https://api.meetup.com/find/upcoming_events?lat=37.7749&lon=-122.4194&radius=25&text=startup&page=5');
  const meetupData = await meetupResponse.json();
  
  if (meetupData.events) {
    events.push(...meetupData.events.map(event => ({
      name: event.name,
      date: new Date(event.time).toISOString(),
      location: event.venue?.city || 'Online',
      url: event.link,
      source: 'Meetup'
    })));
  }
  
  return events.slice(0, config.count);
}

async function generateAISummary(articles) {
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.VITE_GEMINI_API_KEY}`;
  
  const prompt = `Summarize these startup news articles in 2-3 sentences:

${articles.map(article => `- ${article.title}: ${article.description}`).join('\n')}

Focus on key insights and trends.`;

  const response = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  
  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);
  
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available';
}

async function main() {
  console.log('==========================================');
  console.log('API Integration Test Suite');
  console.log('==========================================\n');

  await testApiQuotaManagement();
  await testContentFetching();
  await testAIIntegration();
  await testEdgeFunctionIntegration();

  console.log('\n==========================================');
  console.log('API Test Suite Completed');
  console.log('==========================================');
}

main().catch(console.error);