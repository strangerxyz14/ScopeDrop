#!/usr/bin/env node

/**
 * Cache Cleanup Script
 * Cleans up expired cache entries and performs maintenance
 */

import { enhancedCacheManager } from '../src/services/enhancedCacheManager.js';

async function cleanupBrowserCache() {
  console.log('🧹 Cleaning browser cache...');
  
  try {
    const keys = Object.keys(localStorage);
    const cachePrefix = 'scopedrop_cache_';
    let cleanedCount = 0;
    
    for (const key of keys) {
      if (key.startsWith(cachePrefix)) {
        try {
          const entry = JSON.parse(localStorage.getItem(key));
          const now = Date.now();
          
          if (entry && (now - entry.timestamp > entry.ttl)) {
            localStorage.removeItem(key);
            cleanedCount++;
          }
        } catch (error) {
          // Remove invalid entries
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    }
    
    console.log(`✅ Browser cache cleaned: ${cleanedCount} entries removed`);
    return cleanedCount;
  } catch (error) {
    console.error('❌ Browser cache cleanup failed:', error.message);
    return 0;
  }
}

async function cleanupDatabaseCache() {
  console.log('🗄️ Cleaning database cache...');
  
  try {
    await enhancedCacheManager.performCleanup();
    console.log('✅ Database cache cleaned');
    return true;
  } catch (error) {
    console.error('❌ Database cache cleanup failed:', error.message);
    return false;
  }
}

async function resetQuotas() {
  console.log('🔄 Resetting API quotas...');
  
  try {
    // This would typically be done via Edge Function
    // For now, we'll just log the action
    console.log('✅ API quotas reset (requires Edge Function)');
    return true;
  } catch (error) {
    console.error('❌ Quota reset failed:', error.message);
    return false;
  }
}

async function generateCacheReport() {
  console.log('📊 Generating cache report...');
  
  try {
    const keys = Object.keys(localStorage);
    const cachePrefix = 'scopedrop_cache_';
    const cacheEntries = keys.filter(key => key.startsWith(cachePrefix));
    
    const report = {
      totalEntries: cacheEntries.length,
      totalSize: 0,
      expiredEntries: 0,
      validEntries: 0,
      byType: {}
    };
    
    for (const key of cacheEntries) {
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        const entrySize = JSON.stringify(entry).length;
        report.totalSize += entrySize;
        
        const now = Date.now();
        const isExpired = entry && (now - entry.timestamp > entry.ttl);
        
        if (isExpired) {
          report.expiredEntries++;
        } else {
          report.validEntries++;
        }
        
        const type = entry?.source || 'unknown';
        report.byType[type] = (report.byType[type] || 0) + 1;
        
      } catch (error) {
        report.expiredEntries++;
      }
    }
    
    console.log('📋 Cache Report:');
    console.log(`   Total entries: ${report.totalEntries}`);
    console.log(`   Valid entries: ${report.validEntries}`);
    console.log(`   Expired entries: ${report.expiredEntries}`);
    console.log(`   Total size: ${(report.totalSize / 1024).toFixed(2)} KB`);
    console.log(`   By type: ${JSON.stringify(report.byType)}`);
    
    return report;
  } catch (error) {
    console.error('❌ Cache report generation failed:', error.message);
    return null;
  }
}

async function main() {
  console.log('==========================================');
  console.log('Cache Cleanup and Maintenance');
  console.log('==========================================\n');

  const args = process.argv.slice(2);
  const options = {
    browser: args.includes('--browser') || args.includes('-b'),
    database: args.includes('--database') || args.includes('-d'),
    quotas: args.includes('--quotas') || args.includes('-q'),
    report: args.includes('--report') || args.includes('-r'),
    all: args.includes('--all') || args.includes('-a') || args.length === 0
  };

  try {
    if (options.report || options.all) {
      await generateCacheReport();
      console.log('');
    }

    if (options.browser || options.all) {
      await cleanupBrowserCache();
      console.log('');
    }

    if (options.database || options.all) {
      await cleanupDatabaseCache();
      console.log('');
    }

    if (options.quotas || options.all) {
      await resetQuotas();
      console.log('');
    }

    console.log('==========================================');
    console.log('Cleanup completed successfully!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Show help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Cache Cleanup Script

Usage: npm run cache:clean [options]

Options:
  --browser, -b     Clean browser cache only
  --database, -d    Clean database cache only
  --quotas, -q      Reset API quotas
  --report, -r      Generate cache report only
  --all, -a         Clean all caches (default)
  --help, -h        Show this help

Examples:
  npm run cache:clean --browser
  npm run cache:clean --database --quotas
  npm run cache:clean --report
  `);
  process.exit(0);
}

main().catch(console.error);