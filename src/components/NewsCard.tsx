
import type { ReactNode } from "react";
import { NewsArticle } from "@/types/news";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface NewsCardProps {
  article: NewsArticle;
  // UUID or slug from Supabase (never an array index).
  articleId: string;
  className?: string;
}

const NewsCard = ({ article, articleId, className = "" }: NewsCardProps) => {
  const formattedDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  // Extract domain from source URL
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  const getBadgeClass = (category?: string) => {
    if (!category) return "badge-funding";
    
    switch (category.toLowerCase()) {
      case "funding":
        return "badge-funding";
      case "acquisitions":
      case "acquisition":
      case "ipo":
        return "badge-acquisition";
      case "success stories":
      case "launch":
      case "startup":
        return "badge-ipo";
      case "failures":
      case "founder":
      case "interview":
        return "badge-founder";
      case "venture capital":
        return "badge-funding";
      default:
        return "badge-funding";
    }
  };

  const isExternalUrl = (url: unknown): url is string =>
    typeof url === "string" && /^https?:\/\//i.test(url);

  const isUuid = (value: unknown): value is string =>
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  // Prefer internal routing for DB-backed rows (UUID id),
  // even when the mapped `article.url` is an external source link.
  const isDbBacked = isUuid(article.id);

  const internalTo = `/article/${encodeURIComponent(articleId)}`;
  const externalHref = !isDbBacked && isExternalUrl(article.url) ? article.url : null;

  const Wrapper = ({ children }: { children: ReactNode }) =>
    externalHref ? (
      <a href={externalHref} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ) : (
      <Link to={internalTo}>{children}</Link>
    );

  return (
    <Wrapper>
      <Card className={`insight-card group cursor-pointer ${className}`}>
        {article.image && (
          <div className="relative overflow-hidden aspect-video">
            <img 
              src={article.image} 
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                // Fallback for broken images
                e.currentTarget.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=600&h=400&fit=crop&crop=center';
              }}
            />
            {article.category && (
              <div className="absolute top-3 left-3">
                <Badge className={getBadgeClass(article.category)}>
                  {article.category}
                </Badge>
              </div>
            )}
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded">
              {article.source?.name || getDomain(article.source?.url || "")}
            </div>
          </div>
        )}
        
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg line-clamp-2 mb-3 group-hover:text-accent transition-colors">
            {article.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {article.description}
          </p>
        </CardContent>
        
        <CardFooter className="px-6 pb-6 pt-0 flex justify-between text-xs text-muted-foreground">
          <span className="font-medium">
            {formattedDate(article.publishedAt)}
          </span>
          <span className="text-accent font-medium group-hover:underline">
            Read more
          </span>
        </CardFooter>
      </Card>
    </Wrapper>
  );
};

export default NewsCard;
