
import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getNewsArticles } from "@/services/mockDataService";
import { processArticleWithGemini } from "@/services/geminiService";

const ArticleView = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: articles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles'],
    queryFn: () => getNewsArticles(20),
  });
  
  const article = articles?.find((_, index) => index.toString() === id);
  
  const { data: processedContent, isLoading: isProcessingContent } = useQuery({
    queryKey: ['articleContent', id, article?.title],
    queryFn: async () => {
      if (!article) return "";
      return processArticleWithGemini(article);
    },
    enabled: !!article && !article.processedByAI,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  useEffect(() => {
    // Scroll to top when article loads
    window.scrollTo(0, 0);
  }, [id]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return 'Recently';
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link to="/" className="inline-flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
          
          {isLoadingArticles ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : article ? (
            <article className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">{article.title}</h1>
                <div className="flex items-center text-gray-600 text-sm mb-6">
                  <span className="mr-4">
                    {article.source?.name || 'ScopeDrop'} • {formatDate(article.publishedAt)}
                  </span>
                  {article.category && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {article.category}
                    </span>
                  )}
                </div>
                
                {article.image && (
                  <div className="mb-6">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-auto rounded-lg object-cover aspect-video"
                    />
                  </div>
                )}
              </div>
              
              <div className="prose prose-lg max-w-none">
                {isProcessingContent ? (
                  <div className="space-y-4 my-8">
                    <p className="text-gray-600 italic">Processing with AI for enhanced insights...</p>
                    <div className="flex space-x-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                ) : (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: (article.processedByAI ? article.content : processedContent) || article.description 
                    }} 
                  />
                )}
                
                {article.url && (
                  <div className="mt-8 pt-4 border-t">
                    <p className="text-gray-700">
                      <strong>Read the original article: </strong>
                      <a 
                        href={article.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-oxford hover:underline"
                      >
                        {article.source?.name || 'Source'}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </article>
          ) : (
            <div className="text-center py-16">
              <h2 className="text-2xl font-bold mb-2">Article not found</h2>
              <p className="text-gray-600 mb-6">The article you're looking for doesn't seem to exist.</p>
              <Button asChild>
                <Link to="/">Return to Homepage</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ArticleView;
