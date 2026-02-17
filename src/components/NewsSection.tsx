import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, ExternalLink } from "lucide-react";
import NewsCardSkeleton from "./NewsCardSkeleton";
import { NewsArticle } from "@/types/news";
import { formatDistanceToNow } from "date-fns";

interface NewsSectionProps {
  title: string;
  subtitle?: string;
  articles: NewsArticle[];
  isLoading: boolean;
  viewAllLink?: string;
}

const NewsSection = ({
  title,
  subtitle,
  articles,
  isLoading,
  viewAllLink,
}: NewsSectionProps) => {
  const displayArticles = articles;
  const loading = isLoading;

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <section className="py-16 bg-background relative scroll-reveal">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight">{title}</h2>
            {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {viewAllLink && (
            <Button variant="ghost" asChild className="text-sm">
              <Link to={viewAllLink}>
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        
        {/* List / Terminal View */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {loading ? (
            <div className="divide-y divide-border">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-4 bg-muted rounded flex-1" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              ))}
            </div>
          ) : displayArticles.length > 0 ? (
            <div className="divide-y divide-border">
              {displayArticles.map((article: NewsArticle, index: number) => {
                const articleTitle = article.title;
                const articleCategory = article.category || "Business";
                const articleSource = article.source?.name || "ScopeDrop";
                const articleDate = article.publishedAt;
                const articleUrl = article.url;
                const articleDescription = article.description;

                return (
                  <div
                    key={article.id ?? index}
                    className="px-6 py-4 hover:bg-muted/50 transition-colors group flex items-start gap-4"
                  >
                    {/* Category tag */}
                    <Badge variant="outline" className="text-xs font-mono shrink-0 mt-0.5 min-w-[80px] justify-center">
                      {articleCategory}
                    </Badge>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={articleUrl ? articleUrl : `/article/${index}`}
                        className="block"
                        target={articleUrl?.startsWith('http') ? '_blank' : undefined}
                      >
                        <h3 className="font-medium text-foreground group-hover:text-accent transition-colors truncate text-sm md:text-base">
                          {articleTitle}
                        </h3>
                        {articleDescription && (
                          <p className="text-muted-foreground text-xs mt-1 line-clamp-1 hidden md:block">
                            {articleDescription}
                          </p>
                        )}
                      </Link>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span className="hidden sm:inline">{articleSource}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(articleDate)}
                      </span>
                      {articleUrl?.startsWith('http') && (
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              No articles found. Add data to your Supabase articles table.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
