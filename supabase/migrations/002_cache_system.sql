-- Cache System Database Schema
-- This migration sets up the complete caching infrastructure

-- 1. CONTENT CACHE TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('news', 'funding', 'events', 'ai_summary', 'ai_batch', 'ai_seo', 'ai_trending')),
  source TEXT NOT NULL CHECK (source IN ('gnews', 'gemini', 'reddit', 'hn', 'rss', 'meetup')),
  ttl INTEGER NOT NULL DEFAULT 21600000, -- 6 hours in milliseconds
  quality_score INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE GENERATED ALWAYS AS (created_at + (ttl || interval '6 hours')) STORED
);

-- 2. API USAGE TRACKING TABLE
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_type TEXT NOT NULL CHECK (api_type IN ('gnews', 'gemini', 'reddit', 'hn', 'rss', 'meetup')),
  endpoint TEXT NOT NULL,
  response_time INTEGER, -- milliseconds
  status_code INTEGER,
  quota_remaining INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- 3. CONTENT JOBS TABLE (For Edge Function Orchestration)
CREATE TABLE IF NOT EXISTS content_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('news', 'funding', 'events', 'ai_summary', 'batch_fetch')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
  config JSONB NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONTENT ANALYTICS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'funding', 'event', 'ai_summary')),
  content_id UUID NOT NULL,
  cache_key TEXT,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. QUOTA MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS quota_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_type TEXT NOT NULL CHECK (api_type IN ('gnews', 'gemini', 'reddit', 'hn', 'rss', 'meetup')),
  daily_limit INTEGER NOT NULL,
  hourly_limit INTEGER NOT NULL,
  daily_used INTEGER DEFAULT 0,
  hourly_used INTEGER DEFAULT 0,
  reset_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PERFORMANCE METRICS TABLE
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('cache_hit_rate', 'api_response_time', 'content_freshness', 'user_engagement')),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metadata JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_content_cache_key ON content_cache(cache_key);
CREATE INDEX idx_content_cache_type ON content_cache(cache_type);
CREATE INDEX idx_content_cache_expires ON content_cache(expires_at);
CREATE INDEX idx_content_cache_source ON content_cache(source);

CREATE INDEX idx_api_usage_type_time ON api_usage(api_type, created_at);
CREATE INDEX idx_api_usage_status ON api_usage(status_code);

CREATE INDEX idx_content_jobs_status ON content_jobs(status);
CREATE INDEX idx_content_jobs_next_run ON content_jobs(next_run);
CREATE INDEX idx_content_jobs_type_priority ON content_jobs(job_type, priority);

CREATE INDEX idx_content_analytics_type ON content_analytics(content_type);
CREATE INDEX idx_content_analytics_engagement ON content_analytics(engagement_score DESC);

CREATE INDEX idx_quota_management_type ON quota_management(api_type);
CREATE INDEX idx_quota_management_reset ON quota_management(reset_time);

CREATE INDEX idx_performance_metrics_type_time ON performance_metrics(metric_type, recorded_at);

-- FULL-TEXT SEARCH INDEXES
CREATE INDEX idx_content_cache_search ON content_cache USING gin(to_tsvector('english', cache_key));

-- FUNCTIONS FOR AUTOMATION

-- 1. AUTO-CLEANUP EXPIRED CACHE
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM content_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 2. UPDATE QUOTA USAGE
CREATE OR REPLACE FUNCTION update_quota_usage(api_type_param TEXT, used_count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE quota_management 
  SET 
    daily_used = daily_used + used_count,
    hourly_used = hourly_used + used_count,
    updated_at = NOW()
  WHERE api_type = api_type_param;
END;
$$ LANGUAGE plpgsql;

-- 3. RESET DAILY QUOTAS
CREATE OR REPLACE FUNCTION reset_daily_quotas()
RETURNS void AS $$
BEGIN
  UPDATE quota_management 
  SET 
    daily_used = 0,
    reset_time = NOW() + INTERVAL '24 hours',
    updated_at = NOW()
  WHERE reset_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. CALCULATE CACHE HIT RATE
CREATE OR REPLACE FUNCTION calculate_cache_hit_rate()
RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_requests INTEGER;
  cache_hits INTEGER;
  hit_rate DECIMAL(5,2);
BEGIN
  -- This would be calculated from analytics data
  -- For now, return a placeholder
  RETURN 85.50;
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS FOR AUTOMATION

-- 1. AUTO-UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_content_cache_updated_at BEFORE UPDATE ON content_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_jobs_updated_at BEFORE UPDATE ON content_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quota_management_updated_at BEFORE UPDATE ON quota_management
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. AUTO-CLEANUP TRIGGER (Daily)
CREATE OR REPLACE FUNCTION schedule_cache_cleanup()
RETURNS void AS $$
BEGIN
  -- This would be called by a cron job
  PERFORM cleanup_expired_cache();
END;
$$ LANGUAGE plpgsql;

-- ROW LEVEL SECURITY
ALTER TABLE content_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_management ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- POLICIES FOR PUBLIC READ ACCESS
CREATE POLICY "Public read access for content cache" ON content_cache
  FOR SELECT USING (true);

CREATE POLICY "Public read access for content analytics" ON content_analytics
  FOR SELECT USING (true);

CREATE POLICY "Public read access for performance metrics" ON performance_metrics
  FOR SELECT USING (true);

-- POLICIES FOR AUTHENTICATED WRITE ACCESS
CREATE POLICY "Authenticated users can update cache" ON content_cache
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert analytics" ON content_analytics
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- INSERT INITIAL QUOTA CONFIGURATION
INSERT INTO quota_management (api_type, daily_limit, hourly_limit, reset_time) VALUES
('gnews', 1000, 100, NOW() + INTERVAL '24 hours'),
('gemini', 15000, 1500, NOW() + INTERVAL '24 hours'),
('reddit', 1000, 60, NOW() + INTERVAL '24 hours'),
('hn', 1000, 30, NOW() + INTERVAL '24 hours'),
('rss', 10000, 1000, NOW() + INTERVAL '24 hours'),
('meetup', 1000, 200, NOW() + INTERVAL '24 hours')
ON CONFLICT (api_type) DO NOTHING;

-- INSERT SAMPLE CONTENT JOBS
INSERT INTO content_jobs (job_id, job_type, priority, status, config, next_run) VALUES
('news_refresh_high', 'news', 'high', 'scheduled', '{"keywords": ["startup", "funding"], "count": 20}', NOW() + INTERVAL '4 hours'),
('funding_refresh_high', 'funding', 'high', 'scheduled', '{"keywords": ["funding", "series"], "count": 15}', NOW() + INTERVAL '2 hours'),
('events_refresh_medium', 'events', 'medium', 'scheduled', '{"keywords": ["startup events"], "count": 10}', NOW() + INTERVAL '12 hours'),
('ai_summary_daily', 'ai_summary', 'low', 'scheduled', '{"keywords": ["startup trends"], "count": 10}', NOW() + INTERVAL '24 hours')
ON CONFLICT (job_id) DO NOTHING;