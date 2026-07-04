
import { Button } from "@/components/ui/button";
import { MarketMap } from "@/types/news";
import { Link } from "react-router-dom";
import MarketMapCard from "./MarketMapCard";
import { ArrowRight, Network } from "lucide-react";

interface MarketMapsSectionProps {
  marketMaps?: MarketMap[];
  isLoading?: boolean;
}

const MarketMapsSection = ({ marketMaps = [], isLoading = false }: MarketMapsSectionProps) => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground">
              Trending Market Maps
            </h2>
            <p className="text-muted-foreground mt-1">
              Visualize the landscape of emerging sectors and technologies
            </p>
          </div>
          <Link to="/market-maps">
            <Button variant="ghost" className="text-parrot hover:text-parrot-300 hover:bg-white/5">
              View All
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="insight-card animate-pulse h-72" />
            ))}
          </div>
        ) : marketMaps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketMaps.map((map, index) => (
              <MarketMapCard key={index} marketMap={map} />
            ))}
          </div>
        ) : (
          <div className="terminal-panel text-center py-16">
            <Network className="w-10 h-10 text-parrot/50 mx-auto mb-4" />
            <p className="font-display text-lg text-foreground mb-1">Market maps are generating</p>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Ecosystem clustering runs on the live intelligence feed. Check back soon for AI-curated sector maps.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MarketMapsSection;
