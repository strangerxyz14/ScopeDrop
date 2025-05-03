
import { FundingRound } from "@/types/news";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface FundingCardProps {
  fundingRound: FundingRound;
}

const FundingCard = ({ fundingRound }: FundingCardProps) => {
  const formattedDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return "Recently";
    }
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case "Seed":
        return "bg-green-100 text-green-800";
      case "Series A":
        return "bg-blue-100 text-blue-800";
      case "Series B":
        return "bg-purple-100 text-purple-800";
      case "Series C+":
        return "bg-indigo-100 text-indigo-800";
      case "Growth":
        return "bg-teal-100 text-teal-800";
      case "IPO":
        return "bg-amber-100 text-amber-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border-l-4 border-l-oxford">
      <div className="flex p-4">
        <div className="mr-4 flex-shrink-0">
          {fundingRound.logoUrl ? (
            <img 
              src={fundingRound.logoUrl} 
              alt={fundingRound.companyName} 
              className="h-16 w-16 rounded-md object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/200x200/e2e8f0/64748b?text=ElevArc';
              }} 
            />
          ) : (
            <div className="h-16 w-16 rounded-md bg-oxford-100 text-oxford flex items-center justify-center">
              {fundingRound.companyName.charAt(0)}
            </div>
          )}
        </div>
        <div className="flex-grow">
          <h3 className="font-bold text-lg mb-1">{fundingRound.companyName}</h3>
          <div className="flex flex-wrap gap-2 mb-2">
            <span className={`badge ${getStageBadgeClass(fundingRound.stage)}`}>
              {fundingRound.stage}
            </span>
            <span className="badge bg-gray-100 text-gray-700">
              {fundingRound.sector}
            </span>
            <span className="badge bg-gray-100 text-gray-700">
              {fundingRound.region}
            </span>
          </div>
          <p className="text-lg font-bold text-oxford">
            {fundingRound.amount}
          </p>
        </div>
      </div>
      
      {fundingRound.description && (
        <CardContent className="pt-0 pb-2">
          <p className="text-sm text-gray-600 line-clamp-2">{fundingRound.description}</p>
        </CardContent>
      )}
      
      <CardFooter className="py-2 text-xs text-gray-500 flex justify-between border-t">
        <span>{formattedDate(fundingRound.date)}</span>
        {fundingRound.url && (
          <a 
            href={fundingRound.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-oxford hover:underline transition-colors"
          >
            Read more
          </a>
        )}
      </CardFooter>
    </Card>
  );
};

export default FundingCard;
