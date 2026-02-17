import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Zap, Clock, RefreshCw } from "lucide-react";
import { useRealTimeContent, useAPIConfiguration } from "@/hooks/useRealTimeContent";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface RealTimeHeroSectionProps {
  className?: string;
}

const RealTimeHeroSection: React.FC<RealTimeHeroSectionProps> = ({ className }) => {
  const { data: realTimeData, isLoading: isRTLoading, refreshContent } = useRealTimeContent('all');
  const { hasMinimumConfig } = useAPIConfiguration();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch articles from Supabase
  const { data: supabaseArticles, isLoading: isDbLoading } = useQuery({
    queryKey: ['supabase-articles-hero'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshContent();
      toast.success('Content refreshed!');
    } catch {
      toast.error('Failed to refresh content');
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = isRTLoading && isDbLoading;

  return (
    <div className={`relative overflow-hidden bg-oxford ${className}`}>
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      <div className="relative container mx-auto px-4 py-20 lg:py-28">
        <div className="grid lg:grid-cols-5 gap-12 items-start">
          
          {/* Left Side - Hero Copy (3 cols) */}
          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-parrot/10 text-parrot border-parrot/20 font-mono text-xs uppercase tracking-widest">
                <Zap className="w-3 h-3 mr-1" />
                Live Feed
              </Badge>
            </div>

            <h1 className="font-serif text-5xl lg:text-7xl text-white leading-[1.1] tracking-tight">
              The Intelligence Layer{" "}
              <span className="text-parrot">for Startups.</span>
            </h1>
            
            <p className="text-lg text-white/60 max-w-xl leading-relaxed font-light">
              Deep analysis at real-time speed.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button 
                size="lg" 
                className="bg-parrot text-oxford hover:bg-parrot-300 font-semibold"
                asChild
              >
                <Link to="/startups/news">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Browse Feed
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-white/20 text-white hover:bg-white/5"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh Intel
              </Button>
            </div>
          </div>

          {/* Right Side - Latest Intel Feed (2 cols) */}
          <div className="lg:col-span-2">
            <div className="border border-white/10 rounded-lg overflow-hidden bg-oxford-800/50 backdrop-blur">
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Latest Intel</span>
                <div className="w-2 h-2 rounded-full bg-parrot animate-pulse" />
              </div>
              
              <div className="divide-y divide-white/5">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="px-4 py-3 animate-pulse">
                      <div className="h-3 bg-white/10 rounded w-3/4 mb-2" />
                      <div className="h-2 bg-white/5 rounded w-1/2" />
                    </div>
                  ))
                ) : (
                  <>
                    {/* Show Supabase articles first, then real-time data */}
                    {(supabaseArticles || []).slice(0, 3).map((article, i) => (
                      <motion.div
                        key={`db-${article.id}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate group-hover:text-parrot transition-colors">
                              {article.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-parrot/60 font-mono">{article.category}</span>
                              <span className="text-xs text-white/30">·</span>
                              <span className="text-xs text-white/30">{article.source_name || 'ScopeDrop'}</span>
                            </div>
                          </div>
                          <Clock className="w-3 h-3 text-white/20 mt-1 flex-shrink-0" />
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Fallback to real-time articles */}
                    {(!supabaseArticles || supabaseArticles.length === 0) && realTimeData?.articles?.slice(0, 4).map((article, i) => (
                      <motion.div
                        key={`rt-${i}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate group-hover:text-parrot transition-colors">
                              {article.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-parrot/60 font-mono">{article.category || 'News'}</span>
                              <span className="text-xs text-white/30">·</span>
                              <span className="text-xs text-white/30">{article.source?.name || 'Feed'}</span>
                            </div>
                          </div>
                          <Clock className="w-3 h-3 text-white/20 mt-1 flex-shrink-0" />
                        </div>
                      </motion.div>
                    ))}
                    
                    {(!supabaseArticles || supabaseArticles.length === 0) && (!realTimeData?.articles || realTimeData.articles.length === 0) && (
                      <div className="px-4 py-6 text-center text-white/30 text-sm">
                        No articles yet. Add data to your articles table.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeHeroSection;
