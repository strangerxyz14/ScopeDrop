
import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { processArticleWithGemini } from "@/services/geminiService";
import { useQuery } from "@tanstack/react-query";
import { getNewsArticles } from "@/services/mockDataService";
import { NewsArticle } from "@/types/news";
import { Skeleton } from "@/components/ui/skeleton";
import NewsCard from "@/components/NewsCard";

interface ContentPageTemplateProps {
  title: string;
  description: string;
  topic: string;
  heroImage?: string;
}

const ContentPageTemplate = ({ title, description, topic, heroImage }: ContentPageTemplateProps) => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', topic],
    queryFn: () => getNewsArticles(8),
  });

  // Get AI-generated content about this topic
  const { data: introContent, isLoading: isLoadingIntro } = useQuery({
    queryKey: ['intro', topic],
    queryFn: async () => {
      // Create a sample article to get content for
      const sampleArticle: NewsArticle = {
        title: title,
        description: description,
        url: `https://scopedrop.com/${topic}`,
        publishedAt: new Date().toISOString(),
      };
      
      // Use Gemini to get recommendation text
      const content = await processArticleWithGemini(sampleArticle);
      return content;
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div 
          className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16"
          style={heroImage ? {
            backgroundImage: `linear-gradient(to right, rgba(0, 33, 71, 0.9), rgba(0, 33, 71, 0.8)), url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : undefined}
        >
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">{title}</h1>
            <p className="text-xl text-blue-100 max-w-3xl">{description}</p>
          </div>
        </div>
        
        {/* Introduction */}
        <div className="container mx-auto px-4 py-12">
          {isLoadingIntro ? (
            <div className="max-w-3xl mx-auto space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-2/3" />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto prose prose-lg">
              <div dangerouslySetInnerHTML={{ __html: introContent || "" }} />
            </div>
          )}
        </div>
        
        {/* Articles Grid */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-display font-bold mb-8">Latest {title}</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles?.map((article, i) => (
                <NewsCard key={i} article={article} />
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ContentPageTemplate;
