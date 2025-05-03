
import { Button } from "@/components/ui/button";
import { NewsArticle } from "@/services/newsService";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

interface HeroSectionProps {
  featuredArticle?: NewsArticle;
  isLoading: boolean;
}

const HeroSection = ({ featuredArticle, isLoading }: HeroSectionProps) => {
  const formattedDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <section className="bg-gradient-to-r from-elevarcBlue to-blue-700 text-white py-12 md:py-20">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-4">
              The Latest in Startup Ecosystem
            </h1>
            <p className="text-blue-100 text-lg mb-6">
              Stay updated with funding rounds, IPOs, acquisitions, and founder stories that are shaping the future of technology and business.
            </p>
            <div className="space-x-4">
              <Button className="bg-elevarcGreen text-elevarcBlue hover:bg-green-400">
                <Link to="/startup-news">Latest News</Link>
              </Button>
              <Button variant="outline" className="text-white border-white hover:bg-blue-800">
                <Link to="/tech-stacks">Tech Breakdowns</Link>
              </Button>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg shadow-lg">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-white/20 rounded w-3/4"></div>
                <div className="h-32 bg-white/20 rounded"></div>
                <div className="h-4 bg-white/20 rounded w-1/4"></div>
              </div>
            ) : featuredArticle ? (
              <div>
                <h3 className="text-xl font-bold mb-4">{featuredArticle.title}</h3>
                <p className="text-blue-100 mb-4 line-clamp-3">{featuredArticle.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-70">{formattedDate(featuredArticle.publishedAt)}</span>
                  <a 
                    href={featuredArticle.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-elevarcGreen hover:underline"
                  >
                    Read full story
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p>No featured article available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
