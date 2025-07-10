
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
  // Create skeleton loader array when loading
  const skeletonLoaders = Array(6).fill(0).map((_, i) => (
    <NewsCardSkeleton key={`skeleton-${i}`} />
  ));

  return (
    <section className="py-16 bg-background relative scroll-reveal">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="heading-section mb-4">{title}</h2>
          {subtitle && <p className="text-muted max-w-2xl mx-auto">{subtitle}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {isLoading 
            ? skeletonLoaders
            : articles.map((article, index) => (
                <NewsCard key={index} article={article} articleId={index} />
              ))
          }
          
          {!isLoading && articles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No articles found. Please try again later.</p>
            </div>
          )}
        </div>

        {viewAllLink && !isLoading && articles.length > 0 && (
          <div className="text-center mt-12">
            <Button asChild className="btn-accent group">
              <Link to={viewAllLink}>
                View All Stories
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
