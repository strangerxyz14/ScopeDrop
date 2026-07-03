import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import NewsCard from "./NewsCard";
import NewsCardSkeleton from "./NewsCardSkeleton";
import { NewsArticle } from "@/types/news";

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
  const isUuid = (value: unknown): value is string =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(6).fill(0).map((_, i) => <NewsCardSkeleton key={i} />)}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article: NewsArticle, index: number) => {
              const articleId = isUuid(article.id) ? article.id! : (article.slug ?? String(index));
              return (
                <NewsCard
                  key={article.id ?? index}
                  article={article}
                  articleId={articleId}
                />
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground border border-border rounded-lg bg-card">
            No articles found. Add data to your Supabase articles table.
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
