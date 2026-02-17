
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import FilterBar from "@/components/FilterBar";
import NewsCard from "@/components/NewsCard";
import type { Sector, Region, FundingStage, NewsType } from "@/types/news";
import ErrorMonitor from "@/components/ErrorMonitor";
import { supabase } from "@/integrations/supabase/client";
import { mapDbArticleToNewsArticle } from "@/services/articlesService";
import { realTimeContentAggregator } from "@/services/realTimeContentAPIs";

interface Filters {
  stages: FundingStage[];
  sectors: Sector[];
  regions: Region[];
  types: NewsType[];
}

const StartupNews = () => {
  const [filters, setFilters] = useState<Filters>({
    stages: [],
    sectors: [],
    regions: [],
    types: [],
  });

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", filters],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply Category/Type filter (server-side)
      if (filters.types.length > 0) {
        const typeFilters = filters.types.map((t) => `category.ilike.%${t}%`).join(",");
        query = query.or(typeFilters);
      }

      const { data, error } = await query.limit(30);
      if (error) throw error;
      const mapped = (data ?? []).map((row: any) => mapDbArticleToNewsArticle(row));
      if (mapped.length > 0) return mapped;

      // Fallback: realtime web feed (external URLs)
      const rt = await realTimeContentAggregator.aggregateAllContent();
      const fallback = filters.types.length
        ? rt.articles.filter((a) => {
            const c = (a.category ?? "").toLowerCase();
            return filters.types.some((t) => c.includes(t.toLowerCase()));
          })
        : rt.articles;
      return fallback.slice(0, 30);
    },
  });

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const displayArticles = articles || [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Startup News</h1>
            <p className="text-blue-100 max-w-2xl">
              The latest updates from the startup ecosystem: funding rounds, product launches, 
              acquisitions, and founder stories that are shaping the future of business and technology.
            </p>
          </div>
        </div>
        
        {/* Filter Bar */}
        <FilterBar onFilterChange={handleFilterChange} />
        
        {/* News Grid */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(9).fill(0).map((_, i) => (
                <div key={i} className="bg-white animate-pulse h-80 rounded-lg shadow"></div>
              ))}
            </div>
          ) : displayArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayArticles.map((article, index) => (
                <NewsCard
                  key={article.id ?? article.slug ?? index}
                  article={article}
                  articleId={(article.slug ?? article.id ?? "").toString()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No articles match your filters. Try adjusting your criteria.</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
      <ErrorMonitor />
    </div>
  );
};

export default StartupNews;
