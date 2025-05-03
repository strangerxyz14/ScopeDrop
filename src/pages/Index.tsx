
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import NewsSection from "@/components/NewsSection";
import ErrorMonitor from "@/components/ErrorMonitor";
import { getStartupNews, getFundingNews, getIPONews, NewsArticle } from "@/services/newsService";

const Index = () => {
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [fundingNews, setFundingNews] = useState<NewsArticle[]>([]);
  const [ipoNews, setIpoNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState({
    latest: true,
    funding: true,
    ipo: true
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch latest startup news
      try {
        const news = await getStartupNews(6);
        setLatestNews(news);
      } finally {
        setLoading(prev => ({ ...prev, latest: false }));
      }

      // Fetch funding news
      try {
        const funding = await getFundingNews(3);
        setFundingNews(funding);
      } finally {
        setLoading(prev => ({ ...prev, funding: false }));
      }

      // Fetch IPO news
      try {
        const ipo = await getIPONews(3);
        setIpoNews(ipo);
      } finally {
        setLoading(prev => ({ ...prev, ipo: false }));
      }
    };

    fetchData();
  }, []);

  // Featured article is the first article from latest news
  const featuredArticle = latestNews.length > 0 ? latestNews[0] : undefined;
  
  // Remove the featured article from the latest news list
  const remainingNews = latestNews.slice(1);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        <HeroSection 
          featuredArticle={featuredArticle} 
          isLoading={loading.latest} 
        />
        
        <NewsSection 
          title="Latest Startup News" 
          subtitle="The most recent happenings in the startup world"
          articles={remainingNews}
          isLoading={loading.latest}
          viewAllLink="/startup-news"
        />
        
        <div className="bg-gray-100 py-4">
          <NewsSection 
            title="Funding & Investment News" 
            articles={fundingNews}
            isLoading={loading.funding}
            viewAllLink="/funding-news"
          />
        </div>
        
        <NewsSection 
          title="IPO & Exit Stories" 
          articles={ipoNews}
          isLoading={loading.ipo}
          viewAllLink="/ipo-news"
        />
      </main>
      
      <Footer />
      <ErrorMonitor />
    </div>
  );
};

export default Index;
