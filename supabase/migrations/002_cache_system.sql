-- Cache System Database Schema
-- This migration sets up the complete caching infrastructure

-- 1. CONTENT CACHE TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS content_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT UNIQUE NOT NULL,
  cache_data JSONB NOT NULL,
  cache_type TEXT NOT NULL CHECK (cache_type IN ('news', 'funding', 'events', 'ai_summary', 'ai_batch', 'ai_seo', 'ai_trending')),
  source TEXT NOT NULL CHECK (source IN ('gnews', 'gemini', 'reddit', 'hn', 'rss', 'meetup', 'edge_function')),
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
  api_type TEXT NOT NULL,
  daily_used INTEGER DEFAULT 0,
  hourly_used INTEGER DEFAULT 0,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CONTENT JOBS TABLE (For Edge Function Orchestration)
CREATE TABLE IF NOT EXISTS content_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id TEXT UNIQUE NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('news', 'funding', 'events', 'ai_summary', 'batch_fetch')),
  priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed')),
  config JSONB NOT NULL DEFAULT '{}',
  next_run TIMESTAMP WITH TIME ZONE NOT NULL,
  last_run TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONTENT ANALYTICS TABLE (Enhanced)
CREATE TABLE IF NOT EXISTS content_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT NOT NULL,
  hit_type TEXT NOT NULL CHECK (hit_type IN ('hit', 'miss', 'stale')),
  source TEXT,
  response_time INTEGER, -- in milliseconds
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. QUOTA MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS quota_management (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_type TEXT UNIQUE NOT NULL,
  daily_limit INTEGER NOT NULL,
  hourly_limit INTEGER NOT NULL,
  daily_used INTEGER DEFAULT 0,
  hourly_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  reset_time TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. PERFORMANCE METRICS TABLE
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cache_key TEXT,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  content_type TEXT,
  priority TEXT,
  api_type TEXT,
  response_time INTEGER,
  status_code INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_content_cache_key ON content_cache(cache_key);
CREATE INDEX idx_content_cache_type ON content_cache(cache_type);
CREATE INDEX idx_content_cache_source ON content_cache(source);
CREATE INDEX idx_content_cache_expires ON content_cache(expires_at);
CREATE INDEX idx_content_cache_created ON content_cache(created_at);

CREATE INDEX idx_api_usage_type ON api_usage(api_type);
CREATE INDEX idx_api_usage_reset ON api_usage(last_reset);

CREATE INDEX idx_content_jobs_id ON content_jobs(job_id);
CREATE INDEX idx_content_jobs_type ON content_jobs(job_type);
CREATE INDEX idx_content_jobs_status ON content_jobs(status);
CREATE INDEX idx_content_jobs_next_run ON content_jobs(next_run);

CREATE INDEX idx_content_analytics_key ON content_analytics(cache_key);
CREATE INDEX idx_content_analytics_type ON content_analytics(hit_type);
CREATE INDEX idx_content_analytics_timestamp ON content_analytics(timestamp);

CREATE INDEX idx_quota_management_type ON quota_management(api_type);
CREATE INDEX idx_quota_management_reset ON quota_management(reset_time);

CREATE INDEX idx_performance_metrics_key ON performance_metrics(cache_key);
CREATE INDEX idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- FULL-TEXT SEARCH INDEXES
CREATE INDEX idx_content_cache_search ON content_cache USING gin(
  to_tsvector('english', cache_key)
);

-- FUNCTIONS FOR AUTOMATION
-- 1. AUTO-CLEANUP EXPIRED CACHE
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
  DELETE FROM content_cache 
  WHERE expires_at < NOW();
  
  -- Log cleanup
  INSERT INTO performance_metrics (metric_type, metric_value, timestamp)
  VALUES ('cache_cleanup', EXTRACT(EPOCH FROM NOW()), NOW());
END;
$$ LANGUAGE plpgsql;

-- 2. UPDATE QUOTA USAGE
CREATE OR REPLACE FUNCTION update_quota_usage(api_type_param TEXT, used_count INTEGER DEFAULT 1) RETURNS void AS $$
BEGIN
  UPDATE quota_management 
  SET 
    daily_used = daily_used + used_count,
    hourly_used = hourly_used + used_count,
    updated_at = NOW()
  WHERE api_type = api_type_param;
  
  -- Reset hourly quota if needed
  UPDATE quota_management 
  SET hourly_used = 0
  WHERE api_type = api_type_param 
    AND EXTRACT(EPOCH FROM (NOW() - updated_at)) > 3600;
END;
$$ LANGUAGE plpgsql;

-- 3. RESET DAILY QUOTAS
CREATE OR REPLACE FUNCTION reset_daily_quotas() RETURNS void AS $$
BEGIN
  UPDATE quota_management 
  SET 
    daily_used = 0,
    hourly_used = 0,
    reset_time = NOW() + INTERVAL '24 hours',
    updated_at = NOW()
  WHERE reset_time < NOW();
END;
$$ LANGUAGE plpgsql;

-- 4. CALCULATE CACHE HIT RATE
CREATE OR REPLACE FUNCTION calculate_cache_hit_rate() RETURNS DECIMAL(5,2) AS $$
DECLARE
  total_requests INTEGER;
  cache_hits INTEGER;
  hit_rate DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO total_requests FROM content_analytics;
  SELECT COUNT(*) INTO cache_hits FROM content_analytics WHERE hit_type = 'hit';
  
  IF total_requests = 0 THEN
    RETURN 0.00;
  END IF;
  
  hit_rate := (cache_hits::DECIMAL / total_requests::DECIMAL) * 100;
  RETURN ROUND(hit_rate, 2);
END;
$$ LANGUAGE plpgsql;

-- TRIGGERS FOR AUTOMATION
-- 1. AUTO-UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_content_cache_updated_at BEFORE UPDATE ON content_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_api_usage_updated_at BEFORE UPDATE ON api_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_jobs_updated_at BEFORE UPDATE ON content_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quota_management_updated_at BEFORE UPDATE ON quota_management FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. AUTO-CLEANUP TRIGGER (Daily)
CREATE OR REPLACE FUNCTION schedule_cache_cleanup() RETURNS void AS $$
BEGIN
  -- This would be called by a cron job or scheduled task
  PERFORM cleanup_expired_cache();
  PERFORM reset_daily_quotas();
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
CREATE POLICY "Public read access for content cache" ON content_cache FOR SELECT USING (true);
CREATE POLICY "Public read access for api usage" ON api_usage FOR SELECT USING (true);
CREATE POLICY "Public read access for content jobs" ON content_jobs FOR SELECT USING (true);
CREATE POLICY "Public read access for content analytics" ON content_analytics FOR SELECT USING (true);
CREATE POLICY "Public read access for quota management" ON quota_management FOR SELECT USING (true);
CREATE POLICY "Public read access for performance metrics" ON performance_metrics FOR SELECT USING (true);

-- POLICIES FOR AUTHENTICATED WRITE ACCESS
CREATE POLICY "Authenticated users can update cache" ON content_cache FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert cache" ON content_cache FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete cache" ON content_cache FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update api usage" ON api_usage FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert api usage" ON api_usage FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update content jobs" ON content_jobs FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert content jobs" ON content_jobs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert analytics" ON content_analytics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update quota management" ON quota_management FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert quota management" ON quota_management FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert performance metrics" ON performance_metrics FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- INSERT INITIAL QUOTA CONFIGURATION
INSERT INTO quota_management (api_type, daily_limit, hourly_limit, reset_time) VALUES
('gnews', 1000, 100, NOW() + INTERVAL '24 hours'),
('gemini', 15000, 1500, NOW() + INTERVAL '24 hours'),
('reddit', 1000, 60, NOW() + INTERVAL '24 hours'),
('hn', 1000, 30, NOW() + INTERVAL '24 hours'),
('rss', 10000, 1000, NOW() + INTERVAL '20 hours'),
('meetup', 1000, 200, NOW() + INTERVAL '24 hours')
ON CONFLICT (api_type) DO NOTHING;

-- INSERT SAMPLE CONTENT JOBS
INSERT INTO content_jobs (job_id, job_type, priority, status, config, next_run) VALUES
('news_refresh_high', 'news', 'high', 'scheduled', '{"keywords": ["startup", "funding"], "count": 20}', NOW() + INTERVAL '4 hours'),
('funding_refresh_high', 'funding', 'high', 'scheduled', '{"keywords": ["funding", "series"], "count": 15}', NOW() + INTERVAL '2 hours'),
('events_refresh_medium', 'events', 'medium', 'scheduled', '{"keywords": ["startup events"], "count": 10}', NOW() + INTERVAL '12 hours'),
('ai_summary_daily', 'ai_summary', 'low', 'scheduled', '{"keywords": ["startup trends"], "count": 10}', NOW() + INTERVAL '24 hours')
ON CONFLICT (job_id) DO NOTHING;