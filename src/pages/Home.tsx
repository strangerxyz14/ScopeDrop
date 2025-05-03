
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

const Home = () => {
  const { data: fundingRounds, isLoading: isLoadingFunding } = useQuery({
    queryKey: ['fundingRounds'],
    queryFn: () => getFundingRounds(3),
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
    queryFn: () => getNewsArticles(6),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section with Funding Carousel */}
        <HeroSection 
          fundingRounds={fundingRounds} 
          isLoading={isLoadingFunding} 
        />
        
        {/* Recent Stories Section */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-oxford">
                Recent Stories
              </h2>
              <Link to="/startups/news">
                <Button variant="ghost" className="text-oxford hover:text-oxford-400">
                  View All Stories
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </Link>
            </div>
            
            {isLoadingArticles ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white animate-pulse h-80 rounded-lg shadow"></div>
                ))}
              </div>
            ) : articles && articles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article, index) => (
                  <NewsCard key={index} article={article} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No articles available at the moment.</p>
              </div>
            )}
          </div>
        </section>
        
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
