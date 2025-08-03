-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create tables for real content storage

-- 1. NEWS ARTICLES TABLE
CREATE TABLE news_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL UNIQUE,
  image_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral')),
  quality_score INTEGER DEFAULT 0,
  processed_by_ai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FUNDING ROUNDS TABLE
CREATE TABLE funding_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('Seed', 'Series A', 'Series B', 'Series C+', 'Growth', 'IPO')),
  investors TEXT[] DEFAULT '{}',
  sector TEXT NOT NULL,
  region TEXT NOT NULL,
  announced_at TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  logo_url TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. EVENTS TABLE
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organizer TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('Demo Day', 'Conference', 'Pitch Competition', 'Hackathon', 'Other')),
  url TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USER PREFERENCES TABLE (for personalization)
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sectors TEXT[] DEFAULT '{}',
  regions TEXT[] DEFAULT '{}',
  funding_stages TEXT[] DEFAULT '{}',
  notification_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 5. SAVED ARTICLES TABLE
CREATE TABLE saved_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID REFERENCES news_articles(id) ON DELETE CASCADE,
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

-- 6. CONTENT ANALYTICS TABLE
CREATE TABLE content_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'funding', 'event')),
  content_id UUID NOT NULL,
  views INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TRENDING TOPICS TABLE
CREATE TABLE trending_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  frequency INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX idx_news_articles_category ON news_articles(category);
CREATE INDEX idx_news_articles_source_name ON news_articles(source_name);
CREATE INDEX idx_news_articles_url ON news_articles(url);
CREATE INDEX idx_news_articles_title_gin ON news_articles USING gin(to_tsvector('english', title));
CREATE INDEX idx_news_articles_content_gin ON news_articles USING gin(to_tsvector('english', content));

CREATE INDEX idx_funding_rounds_announced_at ON funding_rounds(announced_at DESC);
CREATE INDEX idx_funding_rounds_stage ON funding_rounds(stage);
CREATE INDEX idx_funding_rounds_sector ON funding_rounds(sector);
CREATE INDEX idx_funding_rounds_region ON funding_rounds(region);

CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_location ON events(location);

CREATE INDEX idx_saved_articles_user_id ON saved_articles(user_id);
CREATE INDEX idx_saved_articles_article_id ON saved_articles(article_id);

CREATE INDEX idx_content_analytics_content_type ON content_analytics(content_type);
CREATE INDEX idx_content_analytics_content_id ON content_analytics(content_id);

CREATE INDEX idx_trending_topics_frequency ON trending_topics(frequency DESC);
CREATE INDEX idx_trending_topics_last_seen ON trending_topics(last_seen DESC);

-- Create full-text search indexes
CREATE INDEX idx_news_articles_search ON news_articles USING gin(
  to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(content, ''))
);

-- Create functions for automatic updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic updated_at
CREATE TRIGGER update_news_articles_updated_at BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funding_rounds_updated_at BEFORE UPDATE ON funding_rounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment analytics
CREATE OR REPLACE FUNCTION increment_content_views(content_type_param TEXT, content_id_param UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO content_analytics (content_type, content_id, views)
  VALUES (content_type_param, content_id_param, 1)
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET 
    views = content_analytics.views + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to update trending topics
CREATE OR REPLACE FUNCTION update_trending_topic(topic_param TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO trending_topics (topic, frequency)
  VALUES (topic_param, 1)
  ON CONFLICT (topic)
  DO UPDATE SET 
    frequency = trending_topics.frequency + 1,
    last_seen = NOW();
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security (RLS)
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Public read access for news articles" ON news_articles
  FOR SELECT USING (true);

CREATE POLICY "Public read access for funding rounds" ON funding_rounds
  FOR SELECT USING (true);

CREATE POLICY "Public read access for events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Public read access for trending topics" ON trending_topics
  FOR SELECT USING (true);

-- Create policies for authenticated users
CREATE POLICY "Users can manage their preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their saved articles" ON saved_articles
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for analytics (read-only for public, write for authenticated)
CREATE POLICY "Public read access for analytics" ON content_analytics
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can update analytics" ON content_analytics
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Insert some sample data for testing
INSERT INTO news_articles (title, description, url, published_at, source_name, category, tags) VALUES
('OpenAI Raises $10B in Series C Funding', 'OpenAI secures massive funding round to accelerate AI development', 'https://example.com/openai-funding', NOW() - INTERVAL '2 days', 'TechCrunch', 'Funding', ARRAY['AI', 'funding', 'OpenAI', 'positive']),
('Startup Ecosystem Shows Strong Growth in Q1', 'Venture capital investments reach new heights in first quarter', 'https://example.com/ecosystem-growth', NOW() - INTERVAL '1 day', 'VentureBeat', 'General', ARRAY['startup', 'growth', 'venture capital', 'positive']);

INSERT INTO funding_rounds (company_name, amount, stage, investors, sector, region, announced_at) VALUES
('OpenAI', '$10B', 'Series C+', ARRAY['Microsoft', 'Sequoia Capital'], 'AI & ML', 'San Francisco', NOW() - INTERVAL '2 days'),
('Stripe', '$6.5B', 'Series I', ARRAY['Andreessen Horowitz', 'General Catalyst'], 'Fintech', 'San Francisco', NOW() - INTERVAL '5 days');

INSERT INTO events (name, organizer, event_date, location, event_type, description) VALUES
('TechCrunch Disrupt 2024', 'TechCrunch', NOW() + INTERVAL '30 days', 'San Francisco, CA', 'Conference', 'The premier startup conference'),
('Y Combinator Demo Day', 'Y Combinator', NOW() + INTERVAL '45 days', 'San Francisco, CA', 'Demo Day', 'Showcase of latest YC startups');