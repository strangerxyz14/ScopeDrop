
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import RealTimeHeroSection from "@/components/RealTimeHeroSection";
import MarketMapsSection from "@/components/MarketMapsSection";
import EventsSection from "@/components/EventsSection";
import NewsletterCta from "@/components/NewsletterCta";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import NewsSection from "@/components/NewsSection";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePageContent, useContentRefresh, useRealTimeUpdates } from "@/hooks/useContentData";
import { useRealTimeContent } from "@/hooks/useRealTimeContent";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

const Home = () => {
  // Initialize scroll reveal animations
  useScrollReveal();

  // Use enhanced content system
  const { data: pageContent, isLoading: isLoadingContent } = usePageContent('home');
  const { refreshPage, isRefreshing } = useContentRefresh();
  const { lastUpdate } = useRealTimeUpdates(60000); // Update every minute
  const { data: rtContent, isLoading: isLoadingRt } = useRealTimeContent("news");

  const articles = (pageContent as any)?.featuredArticles || [];
  const trendingTopics = (pageContent as any)?.trendingTopics || [];
  const fallbackArticles = (rtContent as any)?.articles || [];
  const displayArticles = Array.isArray(articles) && articles.length > 0 ? articles : fallbackArticles;

  const marketMaps: any[] = [];
  const events: any[] = [];

  const isLoading = isLoadingContent || isLoadingRt;

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
        <NewsSection
          title="Recent Stories"
          subtitle={
            Array.isArray(articles) && articles.length > 0
              ? "The latest from the startup ecosystem"
              : "Live web feed (DB empty — seed Supabase to take control)"
          }
          articles={displayArticles?.slice(0, 6) || []}
          isLoading={isLoading}
          viewAllLink="/startups/news"
        />
        
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
