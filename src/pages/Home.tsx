
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import MarketMapsSection from "@/components/MarketMapsSection";
import EventsSection from "@/components/EventsSection";
import NewsletterCta from "@/components/NewsletterCta";
import { FundingRound, Event, MarketMap, NewsArticle } from "@/types/news";
import NewsCard from "@/components/NewsCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { getFundingRounds, getMarketMaps, getEvents, getNewsArticles } from "@/services/mockDataService";
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

  // Fallback to original data if enhanced content fails
  const { data: fallbackFunding } = useQuery({
    queryKey: ['fallbackFunding'],
    queryFn: () => getFundingRounds(5),
    enabled: !!error,
  });

  const { data: fallbackArticles } = useQuery({
    queryKey: ['fallbackArticles'],
    queryFn: () => getNewsArticles(10),
    enabled: !!error,
  });

  const { data: fallbackEvents } = useQuery({
    queryKey: ['fallbackEvents'],
    queryFn: () => getEvents(4),
    enabled: !!error,
  });

  const { data: fallbackMarketMaps } = useQuery({
    queryKey: ['fallbackMarketMaps'],
    queryFn: () => getMarketMaps(3),
    enabled: !!error,
  });

  // Use enhanced content or fallback
  const fundingRounds = pageContent?.recentFunding || fallbackFunding || [];
  const articles = pageContent?.featuredArticles || fallbackArticles || [];
  const events = pageContent?.upcomingEvents || fallbackEvents || [];
  const marketMaps = pageContent?.marketMaps || fallbackMarketMaps || [];
  
  // Select a featured article
  const featuredArticle = articles && articles.length > 0 ? articles[0] : undefined;
  const remainingArticles = articles && articles.length > 1 ? articles.slice(1) : [];

  const isLoading = isLoadingContent || isLoadingTopics;

  return (
    <div className="flex flex-col min-h-screen">
      <SEO 
        title="Startup Tracker - Latest Startup News & Funding Rounds"
        description="Stay updated with the latest startup news, funding rounds, and emerging technologies. Track your favorite companies and discover new opportunities in the startup ecosystem."
        keywords={["startup news", "funding rounds", "venture capital", "tech startups", ...(trendingTopics || [])]}
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
        <HeroSection 
          fundingRounds={fundingRounds} 
          newsArticles={articles}
          featuredArticle={featuredArticle}
          isLoading={isLoading} 
        />
        
        {/* Recent Stories Section */}
        <NewsSection
          title="Recent Stories"
          subtitle="The latest from the startup ecosystem"
          articles={remainingArticles?.slice(0, 6) || []}
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
