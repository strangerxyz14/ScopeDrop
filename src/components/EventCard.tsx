
import { Event } from "@/types/news";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  const formatEventDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch (e) {
      return dateString;
    }
  };

  const getEventTypeBadgeClass = (type: string) => {
    switch (type) {
      case "Demo Day":
        return "bg-purple-100 text-purple-800";
      case "Conference":
        return "bg-blue-100 text-blue-800";
      case "Pitch Competition":
        return "bg-green-100 text-green-800";
      case "Hackathon":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      {event.imageUrl && (
        <div className="aspect-[21/9] w-full overflow-hidden">
          <img 
            src={event.imageUrl} 
            alt={event.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/800x400/e2e8f0/64748b?text=Event';
            }} 
          />
        </div>
      )}
      
      <CardContent className="pt-4">
        <div className="mb-3">
          <span className={`badge ${getEventTypeBadgeClass(event.type)}`}>
            {event.type}
          </span>
        </div>
        <h3 className="font-bold text-lg mb-1">{event.name}</h3>
        <p className="text-sm text-gray-600 mb-3">Organized by {event.organizer}</p>
        
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <Calendar size={16} className="mr-2" />
          <span>{formatEventDate(event.date)}</span>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <MapPin size={16} className="mr-2" />
          <span>{event.location}</span>
        </div>
        
        {event.description && (
          <p className="text-sm text-gray-600 mt-3 line-clamp-2">{event.description}</p>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 pb-4">
        {event.url && (
          <a 
            href={event.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-oxford text-white px-4 py-2 rounded text-sm hover:bg-oxford-400 transition-colors w-full text-center"
          >
            Learn More
          </a>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCard;
