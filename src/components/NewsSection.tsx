
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
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
  const skeletonLoaders = Array(3).fill(0).map((_, i) => (
    <NewsCardSkeleton key={`skeleton-${i}`} />
  ));

  return (
    <section className="py-8 animate-fade-in">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-display font-bold text-elevarcBlue">{title}</h2>
            {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
          </div>
          
          {viewAllLink && (
            <Link to={viewAllLink}>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading 
            ? skeletonLoaders
            : articles.map((article, index) => (
                <NewsCard key={index} article={article} />
              ))
          }
          
          {!isLoading && articles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-500">No articles found. Please try again later.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
