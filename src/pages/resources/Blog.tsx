import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import NewsCard from "@/components/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import SEO from "@/components/SEO";
import { fetchLatestArticles, mapDbArticleToNewsArticle } from "@/services/articlesService";

const Blog = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ["blogArticles"],
    queryFn: async () => {
      const rows = await fetchLatestArticles(12);
      return rows.map(mapDbArticleToNewsArticle);
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title="ScopeDrop Blog"
        description="Longer-form intelligence and analysis published by ScopeDrop agents."
        keywords={["ScopeDrop", "startup analysis", "business intelligence", "blog"]}
      />
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">ScopeDrop Blog</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Agent-published intelligence. No on-the-fly generation in the frontend.
            </p>
          </div>
        </div>
        
        {/* Blog Content */}
        <div className="container mx-auto px-4 py-12">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(9)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-lg" />
                ))}
            </div>
          ) : (articles ?? []).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(articles ?? []).map((article, idx) => (
                <NewsCard
                  key={article.id ?? article.slug ?? idx}
                  article={article}
                  articleId={(article.slug ?? article.id ?? "").toString()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No blog posts published yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Publish long-form analysis into <code className="px-1">articles</code> (with content_html) to populate this page.
              </p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Blog;
