
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
    <Card className="insight-card group overflow-hidden">
      <div className="aspect-video w-full relative bg-secondary">
        <img
          src={marketMap.imageUrl || 'https://placehold.co/600x400/0d1c2d/3ecf6e?text=Market+Map'}
          alt={marketMap.title}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/600x400/0d1c2d/3ecf6e?text=Market+Map';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent flex items-end">
          <div className="p-4 text-foreground w-full">
            <h3 className="font-display font-bold text-lg line-clamp-2">{marketMap.title}</h3>
            <div className="flex justify-between items-center mt-2">
              <span className="badge badge-funding">{marketMap.sector}</span>
              <span className="text-foreground/80 font-mono text-sm">{marketMap.companyCount} Companies</span>
            </div>
          </div>
        </div>
      </div>

      {marketMap.description && (
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground line-clamp-2">{marketMap.description}</p>
        </CardContent>
      )}

      {internalPath ? (
        <CardFooter className="py-2 border-t border-white/10">
          <span className="text-parrot hover:underline transition-colors text-sm">
            View Market Map
          </span>
        </CardFooter>
      ) : marketMap.url ? (
        <CardFooter className="py-2 border-t border-white/10">
          <a
            href={marketMap.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-parrot hover:underline transition-colors text-sm"
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
