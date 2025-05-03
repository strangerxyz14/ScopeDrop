
import { NewsArticle } from "@/types/news";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

  const getCategoryBadgeClass = (category?: string) => {
    if (!category) return "bg-gray-100 text-gray-800";
    
    switch (category.toLowerCase()) {
      case "funding":
        return "bg-green-100 text-green-800";
      case "acquisitions":
        return "bg-purple-100 text-purple-800";
      case "success stories":
        return "bg-blue-100 text-blue-800";
      case "failures":
        return "bg-red-100 text-red-800";
      case "venture capital":
        return "bg-amber-100 text-amber-800";
      case "global markets":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
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
              e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=ElevArc';
            }}
          />
          {article.category && (
            <div className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${getCategoryBadgeClass(article.category)}`}>
              {article.category}
            </div>
          )}
          <div className="absolute bottom-0 left-0 bg-oxford text-white text-xs px-2 py-1">
            {article.source?.name || getDomain(article.source?.url || "")}
          </div>
        </div>
      )}
      
      <CardContent className="py-4">
        <h3 className="font-bold text-lg line-clamp-2 mb-2">{article.title}</h3>
        <p className="text-sm text-gray-600 line-clamp-3">{article.description}</p>
      </CardContent>
      
      <CardFooter className="py-3 border-t flex justify-between text-xs text-gray-500">
        <span>{formattedDate(article.publishedAt)}</span>
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-oxford hover:underline transition-colors"
        >
          Read more
        </a>
      </CardFooter>
    </Card>
  );
};

export default NewsCard;
