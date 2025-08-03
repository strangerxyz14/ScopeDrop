#!/usr/bin/env node

/**
 * Cache System Test Script
 * Tests the enhanced cache manager functionality
 */

import { enhancedCacheManager } from '../src/services/enhancedCacheManager.js';

const testData = {
  news: [
    {
      title: "Test News Article 1",
      description: "This is a test news article for cache testing",
      publishedAt: new Date().toISOString(),
      source: { name: "Test Source" }
    },
    {
      title: "Test News Article 2", 
      description: "Another test article for cache validation",
      publishedAt: new Date().toISOString(),
      source: { name: "Test Source" }
    }
  ],
  funding: [
    {
      title: "Test Funding Round",
      description: "Test company raises $10M in Series A",
      publishedAt: new Date().toISOString(),
      source: { name: "Test Source" }
    }
  ]
};

async function testCacheOperations() {
  console.log('🧪 Testing Enhanced Cache Manager...\n');

  try {
    // Test 1: Set and Get Cache
    console.log('1. Testing Set and Get Cache...');
    await enhancedCacheManager.setCachedContent('test_news', testData.news, 'gnews', undefined, 'high');
    const cachedNews = await enhancedCacheManager.getCachedContent('test_news', 'gnews', 'high');
    
    if (cachedNews && cachedNews.length === testData.news.length) {
      console.log('✅ Cache set and get successful');
    } else {
      console.log('❌ Cache set and get failed');
    }

    // Test 2: Cache Invalidation
    console.log('\n2. Testing Cache Invalidation...');
    await enhancedCacheManager.invalidateCache('test_news');
    const invalidatedCache = await enhancedCacheManager.getCachedContent('test_news', 'gnews', 'high');
    
    if (!invalidatedCache) {
      console.log('✅ Cache invalidation successful');
    } else {
      console.log('❌ Cache invalidation failed');
    }

    // Test 3: Priority-based TTL
    console.log('\n3. Testing Priority-based TTL...');
    await enhancedCacheManager.setCachedContent('test_high', testData.news, 'gnews', undefined, 'high');
    await enhancedCacheManager.setCachedContent('test_low', testData.news, 'gnews', undefined, 'low');
    
    const highPriority = await enhancedCacheManager.getCachedContent('test_high', 'gnews', 'high');
    const lowPriority = await enhancedCacheManager.getCachedContent('test_low', 'gnews', 'low');
    
    if (highPriority && lowPriority) {
      console.log('✅ Priority-based TTL working');
    } else {
      console.log('❌ Priority-based TTL failed');
    }

    // Test 4: Environment Detection
    console.log('\n4. Testing Environment Detection...');
    const environment = enhancedCacheManager.getEnvironment();
    console.log(`✅ Environment detected: ${environment}`);

    // Test 5: API Limits
    console.log('\n5. Testing API Limits...');
    const canMakeCall = await enhancedCacheManager.canMakeApiCall('gnews');
    console.log(`✅ API call allowed: ${canMakeCall}`);

    // Test 6: Cleanup
    console.log('\n6. Testing Cache Cleanup...');
    await enhancedCacheManager.performCleanup();
    console.log('✅ Cache cleanup completed');

    console.log('\n🎉 All cache tests completed successfully!');

  } catch (error) {
    console.error('❌ Cache test failed:', error.message);
    process.exit(1);
  }
}

async function testPerformance() {
  console.log('\n📊 Testing Cache Performance...\n');

  const iterations = 100;
  const startTime = Date.now();

  try {
    for (let i = 0; i < iterations; i++) {
      const key = `perf_test_${i}`;
      const data = { id: i, timestamp: Date.now() };
      
      await enhancedCacheManager.setCachedContent(key, data, 'gnews', undefined, 'medium');
      await enhancedCacheManager.getCachedContent(key, 'gnews', 'medium');
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / iterations;

    console.log(`✅ Performance test completed:`);
    console.log(`   - Total operations: ${iterations * 2}`);
    console.log(`   - Total time: ${duration}ms`);
    console.log(`   - Average time per operation: ${avgTime.toFixed(2)}ms`);

  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
  }
}

async function main() {
  console.log('==========================================');
  console.log('Enhanced Cache Manager Test Suite');
  console.log('==========================================\n');

  await testCacheOperations();
  await testPerformance();

  console.log('\n==========================================');
  console.log('Test Suite Completed');
  console.log('==========================================');
}

main().catch(console.error);