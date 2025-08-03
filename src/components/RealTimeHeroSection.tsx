import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Zap, Clock, Star, ExternalLink, RefreshCw } from "lucide-react";
import { useRealTimeContent, useAPIConfiguration } from "@/hooks/useRealTimeContent";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface RealTimeHeroSectionProps {
  className?: string;
}

const RealTimeHeroSection: React.FC<RealTimeHeroSectionProps> = ({ className }) => {
  const { data: realTimeData, isLoading, isRefreshing, refreshContent, cacheStatus, quotaInfo } = useRealTimeContent('all');
  const { hasMinimumConfig, configurationPercentage } = useAPIConfiguration();
  
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  // Prepare sliding content from real-time data
  const slidingContent = React.useMemo(() => {
    if (!realTimeData) return [];

    const content = [];
    
    // Add latest articles (data is now directly an array)
    if (Array.isArray(realTimeData) && realTimeData.length > 0) {
      realTimeData.slice(0, 5).forEach((article, index) => {
        content.push({
          id: `article-${index}`,
          type: 'article',
          title: article.title,
          description: article.description,
          category: article.category || 'News',
          source: article.source?.name || 'Tech News',
          url: article.url,
          image: article.image,
          publishedAt: article.publishedAt,
          gradient: 'from-blue-600 via-purple-600 to-indigo-700'
        });
      });
    }

    return content;
  }, [realTimeData]);

  // Auto-slide every 3 seconds
  useEffect(() => {
    if (slidingContent.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % slidingContent.length);
      }, 3000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [slidingContent.length]);

  const handleRefresh = async () => {
    try {
      await refreshContent();
    } catch (error) {
      toast.error('Failed to refresh content');
    }
  };

  const currentContent = slidingContent[currentSlide];

  if (isLoading && slidingContent.length === 0) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 ${className}`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        <div className="relative container mx-auto px-4 py-16 lg:py-24">
          <div className="text-center space-y-8">
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-white/10 rounded-lg w-3/4 mx-auto"></div>
              <div className="h-6 bg-white/10 rounded-lg w-1/2 mx-auto"></div>
              <div className="h-40 bg-white/10 rounded-xl w-full max-w-4xl mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden min-h-[600px] ${className}`}>
      {/* Dynamic Background with Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentContent?.gradient || 'from-slate-900 via-purple-900 to-slate-900'} transition-all duration-1000`}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.05%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"></div>
        
        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side - Main Content */}
          <div className="space-y-8">
            {/* Status Bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge 
                variant="secondary" 
                className="bg-white/20 text-white border-white/30 backdrop-blur-sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                Real-Time Content
              </Badge>
              
              {hasMinimumConfig && (
                <Badge 
                  variant="secondary" 
                  className="bg-green-500/20 text-green-100 border-green-400/30 backdrop-blur-sm"
                >
                  <Star className="w-3 h-3 mr-1" />
                  {configurationPercentage}% APIs Active
                </Badge>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-white/80 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {cacheStatus && (
                <Badge 
                  variant="secondary" 
                  className="bg-blue-500/20 text-blue-100 border-blue-400/30 backdrop-blur-sm"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {cacheStatus === 'hit' ? 'Cached' : 'Fresh'}
                </Badge>
              )}
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
                Track the{" "}
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  Future
                </span>{" "}
                of Startups
              </h1>
              
              <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
                Get real-time startup news, funding rounds, and market insights from multiple sources. 
                Never miss the next big opportunity in the startup ecosystem.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="bg-white text-gray-900 hover:bg-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                asChild
              >
                <Link to="/startups/news">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Explore Latest News
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                asChild
              >
                <Link to="/startups/funding">
                  View Funding Rounds
                </Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">
                  {realTimeData?.articles?.length || 0}+
                </div>
                <div className="text-white/60 text-sm">Fresh Articles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">
                  {realTimeData?.trending?.length || 0}+
                </div>
                <div className="text-white/60 text-sm">Trending Projects</div>
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-white">
                  {realTimeData?.events?.length || 0}+
                </div>
                <div className="text-white/60 text-sm">Upcoming Events</div>
              </div>
            </div>
          </div>

          {/* Right Side - Sliding Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {currentContent && (
                <motion.div
                  key={currentContent.id}
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="w-full"
                >
                  <Card className="bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105">
                    <CardContent className="p-8">
                      {/* Content Header */}
                      <div className="flex items-center justify-between mb-6">
                        <Badge 
                          variant="secondary"
                          className={`${
                            currentContent.type === 'article' ? 'bg-blue-500/20 text-blue-100 border-blue-400/30' :
                            currentContent.type === 'trending' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' :
                            'bg-orange-500/20 text-orange-100 border-orange-400/30'
                          } backdrop-blur-sm`}
                        >
                          {currentContent.category}
                        </Badge>
                        
                        <div className="flex items-center gap-2 text-white/60 text-sm">
                          <Clock className="w-4 h-4" />
                          {currentContent.type === 'event' && currentContent.date ? 
                            new Date(currentContent.date).toLocaleDateString() :
                            currentContent.publishedAt ? 
                              new Date(currentContent.publishedAt).toLocaleDateString() :
                              'Recent'
                          }
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="space-y-4">
                        <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">
                          {currentContent.title}
                        </h3>
                        
                        <p className="text-white/80 leading-relaxed line-clamp-3">
                          {currentContent.description}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center justify-between pt-4">
                          <div className="flex items-center gap-4">
                            <div className="text-white/60 text-sm">
                              Source: {currentContent.source}
                            </div>
                            
                            {currentContent.stars && (
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Star className="w-4 h-4 fill-current" />
                                <span className="text-sm font-medium">{currentContent.stars}</span>
                              </div>
                            )}
                          </div>

                          {currentContent.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-white/80 hover:text-white hover:bg-white/10"
                              onClick={() => window.open(currentContent.url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slide Indicators */}
            {slidingContent.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {slidingContent.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-white shadow-lg scale-125' 
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg
            className="w-full h-16 text-white/5"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default RealTimeHeroSection;