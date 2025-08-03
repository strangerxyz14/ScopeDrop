
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import FilterBar from "@/components/FilterBar";
import NewsCard from "@/components/NewsCard";
import { NewsArticle, Sector, Region, FundingStage, NewsType } from "@/types/news";
import { getNewsArticles } from "@/services/mockDataService";
import ErrorMonitor from "@/components/ErrorMonitor";

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
    queryKey: ['articles', 'all'],
    queryFn: () => getNewsArticles(12),
  });

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    // In a real app, we would re-fetch data with these filters
    console.log("Filters changed:", newFilters);
  };

  // Filter function - in a real app, this would be handled on the server
  const filteredArticles = articles ? articles.filter(article => {
    // This is simplified - in a real app category mapping would be more sophisticated
    if (filters.types.length > 0) {
      const type = article.category?.toLowerCase() || "";
      if (!filters.types.some(t => type.includes(t.toLowerCase()))) {
        return false;
      }
    }
    
    // We'd need metadata on articles for these filters
    // This is just a placeholder for the mockup
    return true;
  }) : [];

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
          ) : filteredArticles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article, index) => (
                <NewsCard key={index} article={article} articleId={index} />
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
