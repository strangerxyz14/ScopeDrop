
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { processArticleWithGemini } from "@/services/geminiService";
import { NewsArticle } from "@/types/news";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourcePageTemplateProps {
  title: string;
  description: string;
  topic: string;
  children?: React.ReactNode;
}

const ResourcePageTemplate = ({ title, description, topic, children }: ResourcePageTemplateProps) => {
  // Get AI-generated content about this topic
  const { data: content, isLoading } = useQuery({
    queryKey: ['resource', topic],
    queryFn: async () => {
      // Create a sample article to get content for
      const sampleArticle: NewsArticle = {
        title: title,
        description: description,
        url: `https://scopedrop.com/${topic}`,
        publishedAt: new Date().toISOString(),
      };
      
      // Use Gemini to get content
      return processArticleWithGemini(sampleArticle);
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">{title}</h1>
            <p className="text-xl text-blue-100 max-w-3xl">{description}</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {children || (
              isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ) : (
                <div className="prose prose-lg max-w-none" dangerouslySetInnerHTML={{ __html: content || "" }} />
              )
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResourcePageTemplate;
