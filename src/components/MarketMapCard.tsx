
import { MarketMap } from "@/types/news";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Link } from "react-router-dom";

interface MarketMapCardProps {
  marketMap: MarketMap;
}

const MarketMapCard = ({ marketMap }: MarketMapCardProps) => {
  const internalPath =
    typeof marketMap.id === "string" && marketMap.id.trim().length > 0
      ? `/market-maps/${encodeURIComponent(marketMap.id)}`
      : null;

  const card = (
    <Card className="group hover:shadow-lg transition-shadow duration-300 overflow-hidden">
      <div className="aspect-video w-full relative">
        <img 
          src={marketMap.imageUrl || 'https://placehold.co/600x400/e2e8f0/64748b?text=Market+Map'} 
          alt={marketMap.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/600x400/e2e8f0/64748b?text=Market+Map';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end">
          <div className="p-4 text-white w-full">
            <h3 className="font-bold text-lg line-clamp-2">{marketMap.title}</h3>
            <div className="flex justify-between items-center mt-2">
              <span className="badge bg-white/30 backdrop-blur-sm">{marketMap.sector}</span>
              <span className="text-white/90">{marketMap.companyCount} Companies</span>
            </div>
          </div>
        </div>
      </div>
      
      {marketMap.description && (
        <CardContent className="py-4">
          <p className="text-sm text-gray-600 line-clamp-2">{marketMap.description}</p>
        </CardContent>
      )}
      
      {internalPath ? (
        <CardFooter className="py-2 border-t">
          <span className="text-oxford hover:underline transition-colors text-sm">
            View Market Map
          </span>
        </CardFooter>
      ) : marketMap.url ? (
        <CardFooter className="py-2 border-t">
          <a 
            href={marketMap.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-oxford hover:underline transition-colors text-sm"
          >
            View Full Market Map
          </a>
        </CardFooter>
      ) : null}
    </Card>
  );

  return internalPath ? (
    <Link to={internalPath} className="block">
      {card}
    </Link>
  ) : (
    card
  );
};

export default MarketMapCard;
