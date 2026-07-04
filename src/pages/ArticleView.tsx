
import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { sanitizeHtml } from "@/utils/sanitize";
import { fetchArticleById, ARTICLE_QUERY_CONFIG } from "@/services/articlesService";

const ArticleView = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: dbRow, isLoading: isLoadingArticle } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchArticleById(id);
    },
    enabled: Boolean(id),
    ...ARTICLE_QUERY_CONFIG,
  });

  const headline = (dbRow as any)?.headline ?? "Untitled";
  const summary = (dbRow as any)?.summary ?? "";
  const contentHtml = (dbRow as any)?.content_html ?? "";
  const category = (dbRow as any)?.category ?? "";
  const tags: string[] = Array.isArray((dbRow as any)?.tags) ? (dbRow as any).tags : [];
  const readTime: number = (dbRow as any)?.read_time_minutes ?? 3;
  const createdAt = (dbRow as any)?.created_at ?? new Date().toISOString();
  const imageUrl: string = (dbRow as any)?.image_url ?? "";

  useEffect(() => {
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
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />

      <main className="flex-grow pt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <Button variant="outline" asChild className="border-white/15 text-foreground hover:bg-white/5 bg-transparent">
              <Link to="/" className="inline-flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          {isLoadingArticle ? (
            <div className="max-w-2xl mx-auto space-y-4">
              <Skeleton className="h-10 w-3/4 bg-secondary" />
              <Skeleton className="h-6 w-1/4 bg-secondary" />
              <Skeleton className="h-72 w-full bg-secondary" />
              <Skeleton className="h-20 w-full bg-secondary" />
              <Skeleton className="h-20 w-full bg-secondary" />
            </div>
          ) : dbRow ? (
            <article className="max-w-2xl mx-auto">
              <div className="mb-8">
                <p className="label-caps text-parrot mb-3">
                  {category || "Intelligence"} · Live data feed
                </p>
                <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 leading-tight text-foreground">
                  {headline}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-muted-foreground text-sm mb-4 font-mono">
                  <span>ScopeDrop · {formatDate(createdAt)}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readTime} min read
                  </span>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs border-white/15 text-muted-foreground">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {imageUrl && (
                  <div className="mb-8 rounded-md overflow-hidden border border-white/10">
                    <img
                      src={imageUrl}
                      alt={headline}
                      className="w-full h-auto object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.parentElement?.classList.add("hidden");
                      }}
                    />
                  </div>
                )}

                {summary && (
                  <p className="text-lg text-muted-foreground leading-relaxed border-l-4 border-parrot pl-4 mb-8 italic">
                    {summary}
                  </p>
                )}
              </div>

              <div className="prose prose-lg prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-foreground/90 prose-a:text-parrot">
                {typeof contentHtml === "string" && contentHtml.trim().length > 0 ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(contentHtml)
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    This article is still being processed by our AI pipeline.
                  </p>
                )}
              </div>
            </article>
          ) : (
            <div className="text-center py-16">
              <h2 className="font-display text-2xl font-bold mb-2 text-foreground">Article not found</h2>
              <p className="text-muted-foreground mb-6">The article you're looking for doesn't seem to exist.</p>
              <Button asChild className="bg-parrot text-black hover:bg-parrot-300">
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
