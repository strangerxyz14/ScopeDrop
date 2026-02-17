# 🚀 ScopeDrop Optimized Content System - Complete Setup Guide

## 📋 Overview

This guide will walk you through implementing all three phases of the optimized content system:

- **Phase 1**: Supabase Foundation & Database Setup
- **Phase 2**: Enhanced Cache Manager & Edge Functions Integration  
- **Phase 3**: Component Integration & Testing

## 🎯 Phase 1: Supabase Foundation (Days 1-2)

### Step 1: Install Dependencies

```bash
# Install Supabase CLI globally
npm install -g supabase

# Install project dependencies
npm install

# Make setup scripts executable
chmod +x scripts/setup-supabase.sh
chmod +x scripts/test-cache.js
chmod +x scripts/test-api.js
chmod +x scripts/clean-cache.js
```

### Step 2: Set Up Environment Variables

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your actual API keys
nano .env
```

**Required Environment Variables:**
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Environment Configuration
NODE_ENV=development
VITE_APP_ENV=staging
```

**Backend-only secrets (Supabase Edge Functions):**
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- Your scout/news provider key (if applicable)

### Step 3: Initialize Supabase Project

```bash
# Run the automated setup script
npm run setup:supabase

# Or manually:
supabase init
supabase start
```

### Step 4: Run Database Migrations

```bash
# Apply the cache system schema
supabase db reset

# Verify the setup
supabase status
```

### Step 5: Deploy Edge Functions

```bash
# Deploy the content orchestrator
npm run supabase:deploy

# Verify deployment
curl -X POST "http://localhost:54321/functions/v1/content-orchestrator-v2" \
  -H "Content-Type: application/json" \
  -d '{"action":"monitor_quotas"}'
```

## 🎯 Phase 2: Enhanced Cache Manager Integration (Days 3-4)

### Step 1: Test Cache System

```bash
# Test the enhanced cache manager
npm run test:cache

# Expected output:
# ✅ Cache set and get successful
# ✅ Cache invalidation successful
# ✅ Priority-based TTL working
# ✅ Environment detected: staging
# ✅ API call allowed: true
# ✅ Cache cleanup completed
```

### Step 2: Test API Integration

```bash
# Test API integration and quota management
npm run test:api

# Expected output:
# ✅ GNews API quota available: true
# ✅ Gemini API quota available: true
# ✅ API usage recorded successfully
# ✅ Environment: staging
# ✅ News content fetched: 5 articles
# ✅ Funding content fetched: 3 articles
# ✅ Events content fetched: 2 events
# ✅ AI summary generated successfully
```

### Step 3: Verify Edge Function Integration

```bash
# Test Edge Function health
curl -X POST "http://localhost:54321/functions/v1/content-orchestrator-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-anon-key" \
  -d '{"action":"monitor_quotas"}'

# Expected response:
# {
#   "success": true,
#   "quotas": [...],
#   "timestamp": "..."
# }
```

## 🎯 Phase 3: Component Integration & Testing (Days 5-7)

### Step 1: Start Development Server

```bash
# Start the development server
npm run dev

# The application should now use the enhanced cache system
```

### Step 2: Verify Component Integration

1. **Check RealTimeHeroSection**: Should display cache status badges
2. **Check useRealTimeContent**: Should use enhanced smart content hook
3. **Check API Configuration**: Should show new API status

### Step 3: Test Content Loading

1. Navigate to the homepage
2. Check browser console for cache logs:
   ```
   📦 Browser cache hit: news_startup_tech_20
   🗄️ Database cache hit: news_startup_tech_20
   🔄 Content needs refresh: news_startup_tech_20 (high priority)
   ```

### Step 4: Test Cache Management

```bash
# Generate cache report
npm run cache:clean -- --report

# Clean browser cache
npm run cache:clean -- --browser

# Clean database cache
npm run cache:clean -- --database

# Clean all caches
npm run cache:clean -- --all
```

## 🔧 Configuration Options

### Cache Configuration

The system supports different cache configurations:

```typescript
// High priority content (funding news)
{
  type: 'funding',
  priority: 'high',
  refreshInterval: 2 * 60 * 60 * 1000 // 2 hours
}

// Medium priority content (general news)
{
  type: 'news',
  priority: 'medium', 
  refreshInterval: 4 * 60 * 60 * 1000 // 4 hours
}

// Low priority content (events)
{
  type: 'events',
  priority: 'low',
  refreshInterval: 12 * 60 * 60 * 1000 // 12 hours
}
```

### API Quota Management

Staging environment has reduced limits for testing:

```typescript
// Staging limits
{
  gnews: { dailyLimit: 100, hourlyLimit: 10 },
  gemini: { dailyLimit: 1500, hourlyLimit: 150 }
}

// Production limits (uncomment in .env)
{
  gnews: { dailyLimit: 1000, hourlyLimit: 100 },
  gemini: { dailyLimit: 15000, hourlyLimit: 1500 }
}
```

## 📊 Monitoring & Analytics

### Performance Metrics

The system tracks various performance metrics:

```bash
# Check cache hit rates
npm run test:cache

# Check API usage
npm run test:api

# Monitor quotas
curl -X POST "http://localhost:54321/functions/v1/content-orchestrator-v2" \
  -H "Content-Type: application/json" \
  -d '{"action":"monitor_quotas"}'
```

### Expected Performance

- **Cache Hit Rate**: > 80%
- **API Call Reduction**: > 80%
- **Response Time**: < 500ms (cached), < 2s (fresh)
- **Uptime**: 99.9%

## 🚨 Troubleshooting

### Common Issues

1. **Supabase Connection Failed**
   ```bash
   # Check Supabase status
   supabase status
   
   # Restart Supabase
   supabase stop
   supabase start
   ```

2. **Edge Functions Not Working**
   ```bash
   # Redeploy Edge Functions
   npm run supabase:deploy
   
   # Check logs
   supabase functions logs content-orchestrator-v2
   ```

3. **API Quota Exceeded**
   ```bash
   # Check quota status
   npm run test:api
   
   # Reset quotas (if needed)
   npm run cache:clean -- --quotas
   ```

4. **Cache Not Working**
   ```bash
   # Test cache system
   npm run test:cache
   
   # Clean and reset cache
   npm run cache:clean -- --all
   ```

### Debug Mode

Enable debug logging by setting in `.env`:
```env
VITE_ENABLE_DEBUG_LOGGING=true
VITE_ENABLE_CACHE_DEBUG=true
VITE_ENABLE_API_DEBUG=true
```

## 🎉 Success Criteria

### Phase 1 Complete When:
- [ ] Supabase project initialized
- [ ] Database migrations applied
- [ ] Edge Functions deployed
- [ ] Environment variables configured

### Phase 2 Complete When:
- [ ] Cache tests pass
- [ ] API tests pass
- [ ] Edge Function tests pass
- [ ] Quota management working

### Phase 3 Complete When:
- [ ] Components using enhanced hooks
- [ ] Cache status displayed in UI
- [ ] Content loading from cache
- [ ] Performance metrics tracked

## 📈 Next Steps

After completing all phases:

1. **Production Deployment**
   ```bash
   # Update environment to production
   VITE_APP_ENV=production
   
   # Deploy to production
   npm run build
   ```

2. **Monitoring Setup**
   - Set up alerts for quota thresholds
   - Monitor cache hit rates
   - Track API usage patterns

3. **Optimization**
   - Fine-tune cache TTL values
   - Optimize batch processing
   - Implement advanced analytics

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Verify all environment variables are set correctly
4. Ensure Supabase is running and accessible

---

**🎯 Ready to implement? Start with Phase 1 and work through each step systematically!**