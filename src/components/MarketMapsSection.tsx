
import { Button } from "@/components/ui/button";
import { MarketMap } from "@/types/news";
import { Link } from "react-router-dom";
import MarketMapCard from "./MarketMapCard";
import { ArrowRight } from "lucide-react";

interface MarketMapsSectionProps {
  marketMaps?: MarketMap[];
  isLoading?: boolean;
}

const MarketMapsSection = ({ marketMaps = [], isLoading = false }: MarketMapsSectionProps) => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-oxford">
              Trending Market Maps
            </h2>
            <p className="text-gray-600 mt-1">
              Visualize the landscape of emerging sectors and technologies
            </p>
          </div>
          <Link to="/market-maps">
            <Button variant="ghost" className="text-oxford hover:text-oxford-400">
              View All
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white animate-pulse h-72 rounded-lg shadow"></div>
            ))}
          </div>
        ) : marketMaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketMaps.map((map, index) => (
              <MarketMapCard key={index} marketMap={map} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No market maps available.</p>
            <Button variant="outline" className="mt-4">
              <Link to="/market-maps">Browse Market Maps</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MarketMapsSection;
