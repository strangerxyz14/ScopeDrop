
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getStartupNews, NewsArticle } from "@/services/newsService";
import NewsCard from "@/components/NewsCard";
import NewsCardSkeleton from "@/components/NewsCardSkeleton";
import ErrorMonitor from "@/components/ErrorMonitor";

const StartupNews = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const articles = await getStartupNews(12);
        setNews(articles);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Create skeleton loader array when loading
  const skeletonLoaders = Array(9).fill(0).map((_, i) => (
    <NewsCardSkeleton key={`skeleton-${i}`} />
  ));

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-elevarcBlue to-blue-700 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold">Startup News</h1>
            <p className="mt-2 text-blue-100">The latest updates from the startup ecosystem</p>
          </div>
        </div>
        
        {/* News Grid */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading 
              ? skeletonLoaders
              : news.map((article, index) => (
                  <NewsCard key={index} article={article} />
                ))
            }
            
            {!loading && news.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No articles found. Please try again later.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
      <ErrorMonitor />
    </div>
  );
};

export default StartupNews;
