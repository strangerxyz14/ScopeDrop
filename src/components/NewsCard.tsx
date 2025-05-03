
import { NewsArticle } from "@/services/newsService";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface NewsCardProps {
  article: NewsArticle;
  className?: string;
}

const NewsCard = ({ article, className = "" }: NewsCardProps) => {
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

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {article.image && (
        <div className="relative aspect-video overflow-hidden">
          <img 
            src={article.image} 
            alt={article.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback for broken images
              e.currentTarget.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=600';
            }}
          />
          <div className="absolute bottom-0 left-0 bg-elevarcBlue text-white text-xs px-2 py-1">
            {article.source?.name || getDomain(article.source?.url || "")}
          </div>
        </div>
      )}
      
      <CardHeader className="py-3">
        <h3 className="font-bold text-base line-clamp-2">{article.title}</h3>
      </CardHeader>
      
      <CardContent className="py-1">
        <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
      </CardContent>
      
      <CardFooter className="py-2 flex justify-between text-xs text-gray-500">
        <span>{formattedDate(article.publishedAt)}</span>
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-elevarcBlue hover:underline"
        >
          Read more
        </a>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
