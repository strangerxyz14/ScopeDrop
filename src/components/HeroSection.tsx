
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FundingRound, NewsArticle } from "@/types/news";
import FundingCard from "./FundingCard";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  fundingRounds?: FundingRound[];
  newsArticles?: NewsArticle[];
  featuredArticle?: NewsArticle;
  isLoading?: boolean;
}

const CATEGORIES = ["All", "AI", "SaaS", "Web3", "Fintech", "Health Tech", "Climate Tech"];

const HeroSection = ({ 
  fundingRounds = [], 
  newsArticles = [], 
  featuredArticle,
  isLoading = false 
}: HeroSectionProps) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState("All");
  const [isVisible, setIsVisible] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  
  // Set up auto-rotation for news slider
  useEffect(() => {
    const interval = setInterval(() => {
      if (newsArticles.length > 0) {
        setActiveSlide((prev) => (prev + 1) % newsArticles.length);
      }
    }, 5000); // Rotate every 5 seconds
    
    return () => clearInterval(interval);
  }, [newsArticles.length]);
  
  // Handle visibility on scroll for sticky elements
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Navigate to previous slide
  const prevSlide = () => {
    if (newsArticles.length > 0) {
      setActiveSlide((prev) => (prev - 1 + newsArticles.length) % newsArticles.length);
    }
  };
  
  // Navigate to next slide
  const nextSlide = () => {
    if (newsArticles.length > 0) {
      setActiveSlide((prev) => (prev + 1) % newsArticles.length);
    }
  };

  // Filter articles by category
  const filterByCategory = (category: string) => {
    setActiveCategory(category);
    // In a real implementation, this would filter the articles
  };

  return (
    <>
      {/* Hero section with sliding news */}
      <section className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left side: Branding and intro */}
            <div className="lg:col-span-1 space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl md:text-5xl font-display font-bold">
                  Scope<span className="text-parrot">Drop</span>
                </h1>
                <p className="text-xl text-blue-100">
                  Curated intelligence on startups, funding, and tech innovation.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button asChild className="bg-parrot text-oxford hover:bg-parrot-400">
                    <Link to="/newsletter">Subscribe</Link>
                  </Button>
                  <Button variant="outline" className="text-white border-white hover:bg-white/10">
                    <Link to="/funding/rounds">Latest Funding</Link>
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Right side: Auto-rotating news slider */}
            <div className="lg:col-span-2 relative">
              <div 
                ref={sliderRef} 
                className="overflow-hidden rounded-lg bg-white/5 backdrop-blur-sm"
              >
                <div className="relative w-full h-full">
                  {isLoading ? (
                    <div className="aspect-video bg-white/10 animate-pulse rounded-lg"></div>
                  ) : newsArticles && newsArticles.length > 0 ? (
                    <div className="relative">
                      {newsArticles.map((article, index) => (
                        <div 
                          key={index}
                          className={cn(
                            "absolute top-0 left-0 w-full transition-opacity duration-500",
                            index === activeSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                          )}
                        >
                          <Link to={`/article/${index}`} className="block">
                            <div className="relative">
                              <AspectRatio ratio={16/9}>
                                <img 
                                  src={article.image || 'https://placehold.co/600x400/e2e8f0/64748b?text=ScopeDrop'} 
                                  alt={article.title}
                                  className="w-full h-full object-cover rounded-t-lg"
                                />
                              </AspectRatio>
                              <div className="absolute top-0 right-0 bg-parrot text-oxford px-2 py-1 m-3 text-xs font-semibold rounded">
                                {article.category || 'News'}
                              </div>
                            </div>
                            <div className="p-4">
                              <h2 className="text-xl font-bold mb-2">{article.title}</h2>
                              <p className="text-blue-100 line-clamp-2">{article.description}</p>
                            </div>
                          </Link>
                        </div>
                      ))}
                      
                      {/* Navigation arrows */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-20">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="rounded-full bg-black/30 border-white/20 hover:bg-black/50"
                          onClick={prevSlide}
                        >
                          <ArrowLeft className="h-5 w-5" />
                          <span className="sr-only">Previous slide</span>
                        </Button>
                      </div>
                      <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="rounded-full bg-black/30 border-white/20 hover:bg-black/50"
                          onClick={nextSlide}
                        >
                          <ArrowRight className="h-5 w-5" />
                          <span className="sr-only">Next slide</span>
                        </Button>
                      </div>
                      
                      {/* Pagination dots */}
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-20">
                        {newsArticles.map((_, index) => (
                          <button 
                            key={index}
                            className={cn(
                              "w-2 h-2 rounded-full transition-colors",
                              index === activeSlide ? "bg-parrot" : "bg-white/30"
                            )}
                            onClick={() => setActiveSlide(index)}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video flex items-center justify-center p-8 text-center">
                      <p className="text-white/60">No articles available at the moment.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Sticky Category Navigation */}
      <div className={cn(
        "bg-white border-b border-gray-200 transition-all duration-300 sticky z-30",
        isVisible ? "top-0 shadow-md" : "top-0"
      )}>
        <div className="container mx-auto px-4">
          <div className="overflow-x-auto py-3">
            <div className="flex space-x-4 min-w-max">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => filterByCategory(category)}
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded transition-colors",
                    activeCategory === category 
                      ? "bg-oxford text-white" 
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Featured Insight + Funding Rounds Section */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Featured Insight */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                <span className="bg-parrot h-6 w-1 rounded mr-3"></span>
                Featured Insight
              </h2>
              
              {featuredArticle ? (
                <Card className="overflow-hidden hover:shadow-lg transition-shadow border-gray-200">
                  <div className="relative aspect-video overflow-hidden">
                    <img 
                      src={featuredArticle.image || 'https://placehold.co/600x400/e2e8f0/64748b?text=Featured'} 
                      alt={featuredArticle.title}
                      className="w-full h-full object-cover"
                    />
                    {featuredArticle.category && (
                      <div className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium bg-oxford text-white">
                        {featuredArticle.category}
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="py-4">
                    <h3 className="font-bold text-xl mb-2">{featuredArticle.title}</h3>
                    <p className="text-gray-600 line-clamp-3">{featuredArticle.description}</p>
                    <div className="mt-4">
                      <Link 
                        to={`/article/${featuredArticle.id}`}
                        className="text-oxford hover:underline font-medium inline-flex items-center"
                      >
                        Read Full Article 
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-64 flex items-center justify-center p-8 text-center">
                  <p className="text-gray-500">No featured insight available.</p>
                </Card>
              )}
            </div>
            
            {/* Funding Rounds Panel (Sticky) */}
            <div className="lg:col-span-1">
              <div className={cn("lg:sticky transition-all duration-300", isVisible ? "top-16" : "top-0")}>
                <h2 className="text-2xl font-display font-bold mb-6 flex items-center">
                  <span className="bg-green-500 h-6 w-1 rounded mr-3"></span>
                  Latest Funding
                </h2>
                
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-gray-100 animate-pulse h-32 rounded-lg"></div>
                    ))}
                  </div>
                ) : fundingRounds.length > 0 ? (
                  <div className="space-y-4">
                    {fundingRounds.slice(0, 5).map((round, index) => (
                      <div key={index} className="hover:shadow-md transition-shadow">
                        <FundingCard fundingRound={round} />
                      </div>
                    ))}
                    <div className="pt-2">
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/funding/rounds">View All Funding</Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No funding rounds available.</p>
                    <Button variant="outline" className="mt-4">
                      <Link to="/funding/rounds">Browse All Funding</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default HeroSection;
