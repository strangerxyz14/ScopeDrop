
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import RealTimeHeroSection from "@/components/RealTimeHeroSection";
import MarketMapsSection from "@/components/MarketMapsSection";
import EventsSection from "@/components/EventsSection";
import NewsletterCta from "@/components/NewsletterCta";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import NewsSection from "@/components/NewsSection";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePageContent, useTrendingTopics, useContentRefresh, useRealTimeUpdates } from "@/hooks/useContentData";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

const Home = () => {
  // Initialize scroll reveal animations
  useScrollReveal();

  // Use enhanced content system
  const { data: pageContent, isLoading: isLoadingContent, error } = usePageContent('home');
  const { data: trendingTopics, isLoading: isLoadingTopics } = useTrendingTopics();
  const { refreshPage, isRefreshing } = useContentRefresh();
  const { lastUpdate } = useRealTimeUpdates(60000); // Update every minute

  const articles = (pageContent as any)?.featuredArticles || [];
  const marketMaps: any[] = [];
  const events: any[] = [];
  
  // Select a featured article
  const featuredArticle = articles && articles.length > 0 ? articles[0] : undefined;
  const remainingArticles = articles && articles.length > 1 ? articles.slice(1) : [];

  const isLoading = isLoadingContent || isLoadingTopics;
  const isDbEmpty = !isLoading && !error && Array.isArray(articles) && articles.length === 0;

  return (
    <div className="flex flex-col min-h-screen">
      <SEO 
        title="ScopeDrop - The Intelligence Layer for Startups"
        description="Deep analysis at real-time speed. Track funding rounds, emerging technologies, and startup ecosystems with ScopeDrop."
        keywords={["startup intelligence", "funding rounds", "venture capital", "tech startups", ...(trendingTopics || [])]}
      />
      
      <Header />
      
      <main className="flex-grow">
        {/* Content Refresh Button */}
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {trendingTopics && trendingTopics.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">Trending:</span>
                  <div className="flex flex-wrap gap-1">
                    {trendingTopics.slice(0, 4).map((topic, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refreshPage('home')}
                disabled={isRefreshing}
                className="h-6 px-2"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Hero Section with News Slider and Funding Rounds */}
                      <RealTimeHeroSection />
        
        {/* Recent Stories Section */}
        {isDbEmpty ? (
          <section className="py-16 bg-background">
            <div className="container mx-auto px-4">
              <div className="border border-border rounded-lg bg-card p-10 text-center">
                <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-3">
                  Securing Intelligence...
                </p>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Your newsroom is live, but the database has no published articles yet.
                  Once Scout inserts signals into <code className="px-1">articles</code>, stories will appear here automatically.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <NewsSection
            title="Recent Stories"
            subtitle="The latest from the startup ecosystem"
            articles={remainingArticles?.slice(0, 6) || []}
            isLoading={isLoading}
            viewAllLink="/startups/news"
          />
        )}
        
        {/* Market Maps Section */}
        <MarketMapsSection 
          marketMaps={marketMaps} 
          isLoading={isLoading} 
        />
        
        {/* Newsletter CTA */}
        <NewsletterCta />
        
        {/* Events Section */}
        <EventsSection 
          events={events} 
          isLoading={isLoading} 
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
