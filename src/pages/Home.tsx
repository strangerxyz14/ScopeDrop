
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
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { getFundingRounds, getMarketMaps, getEvents, getNewsArticles } from "@/services/mockDataService";
import NewsSection from "@/components/NewsSection";

const Home = () => {
  const { data: fundingRounds, isLoading: isLoadingFunding } = useQuery({
    queryKey: ['fundingRounds'],
    queryFn: () => getFundingRounds(5),
  });

  const { data: marketMaps, isLoading: isLoadingMarketMaps } = useQuery({
    queryKey: ['marketMaps'],
    queryFn: () => getMarketMaps(3),
  });

  const { data: events, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => getEvents(4),
  });

  const { data: articles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles'],
    queryFn: () => getNewsArticles(10),
  });

  // Select a featured article (in a real app, this might be determined by other factors)
  const featuredArticle = articles && articles.length > 0 ? articles[0] : undefined;
  
  // Remaining articles for other sections
  const remainingArticles = articles && articles.length > 1 ? articles.slice(1) : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section with News Slider and Funding Rounds */}
        <HeroSection 
          fundingRounds={fundingRounds} 
          newsArticles={articles}
          featuredArticle={featuredArticle}
          isLoading={isLoadingFunding || isLoadingArticles} 
        />
        
        {/* Recent Stories Section */}
        <NewsSection
          title="Recent Stories"
          subtitle="The latest from the startup ecosystem"
          articles={remainingArticles?.slice(0, 6) || []}
          isLoading={isLoadingArticles}
          viewAllLink="/startups/news"
        />
        
        {/* Market Maps Section */}
        <MarketMapsSection 
          marketMaps={marketMaps} 
          isLoading={isLoadingMarketMaps} 
        />
        
        {/* Newsletter CTA */}
        <NewsletterCta />
        
        {/* Events Section */}
        <EventsSection 
          events={events} 
          isLoading={isLoadingEvents} 
        />
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;
