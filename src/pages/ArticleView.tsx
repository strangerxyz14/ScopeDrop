
import React, { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { sanitizeHtml } from "@/utils/sanitize";
import { fetchArticleByIdOrSlug, mapDbArticleToNewsArticle } from "@/services/articlesService";

const ArticleView = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: dbRow, isLoading: isLoadingArticle } = useQuery({
    queryKey: ["article", id],
    queryFn: async () => {
      if (!id) return null;
      return fetchArticleByIdOrSlug(id);
    },
    enabled: Boolean(id),
  });

  const article = dbRow ? mapDbArticleToNewsArticle(dbRow as any) : null;
  const contentHtml = (dbRow as any)?.content_html;
  const summaryText = (dbRow as any)?.summary ?? (dbRow as any)?.description ?? article?.description ?? "";
  const analysisMetadata = (dbRow as any)?.ai_analysis_metadata;
  const disruptor = analysisMetadata && typeof analysisMetadata === "object" && !Array.isArray(analysisMetadata)
    ? (analysisMetadata as any).disruptor
    : null;
  const primarySourceUrl =
    Array.isArray((dbRow as any)?.source_urls) && typeof (dbRow as any).source_urls[0] === "string"
      ? (dbRow as any).source_urls[0]
      : null;

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
          
          {isLoadingArticle ? (
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
                {typeof contentHtml === "string" && contentHtml.trim().length > 0 ? (
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeHtml(
                        contentHtml
                      )
                    }} 
                  />
                ) : disruptor && typeof disruptor === "object" ? (
                  <div className="space-y-8">
                    {typeof disruptor.contrarian_take === "string" && disruptor.contrarian_take.trim().length > 0 && (
                      <section>
                        <h2 className="text-xl font-semibold">Contrarian Take</h2>
                        <p>{disruptor.contrarian_take}</p>
                      </section>
                    )}

                    {Array.isArray(disruptor.asymmetric_risks) && disruptor.asymmetric_risks.length > 0 && (
                      <section>
                        <h2 className="text-xl font-semibold">Asymmetric Risks</h2>
                        <ul>
                          {disruptor.asymmetric_risks.slice(0, 10).map((r: any, idx: number) => (
                            <li key={idx}>{String(r)}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {Array.isArray(disruptor.founder_playbooks) && disruptor.founder_playbooks.length > 0 && (
                      <section>
                        <h2 className="text-xl font-semibold">Founder Playbook</h2>
                        <ol>
                          {disruptor.founder_playbooks.slice(0, 10).map((p: any, idx: number) => (
                            <li key={idx}>{String(p)}</li>
                          ))}
                        </ol>
                      </section>
                    )}

                    {Array.isArray(disruptor.disconfirming_signals) && disruptor.disconfirming_signals.length > 0 && (
                      <section>
                        <h2 className="text-xl font-semibold">Disconfirming Signals</h2>
                        <ul>
                          {disruptor.disconfirming_signals.slice(0, 10).map((s: any, idx: number) => (
                            <li key={idx}>{String(s)}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {typeof summaryText === "string" && summaryText.trim().length > 0 && (
                      <section>
                        <h2 className="text-xl font-semibold">Context</h2>
                        <p className="text-muted-foreground">{summaryText}</p>
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 my-8">
                    <p className="text-muted-foreground">
                      This story has been scouted, but analysis content hasn’t been published yet.
                    </p>
                    {typeof summaryText === "string" && summaryText.trim().length > 0 && (
                      <p className="text-muted-foreground">{summaryText}</p>
                    )}
                  </div>
                )}
                
                {primarySourceUrl && (
                  <div className="mt-8 pt-4 border-t">
                    <p className="text-gray-700">
                      <strong>Read the original article: </strong>
                      <a 
                        href={primarySourceUrl} 
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
