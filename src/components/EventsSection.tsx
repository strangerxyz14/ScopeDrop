
import { Button } from "@/components/ui/button";
import { Event } from "@/types/news";
import { Link } from "react-router-dom";
import EventCard from "./EventCard";
import { Calendar, ArrowRight } from "lucide-react";

interface EventsSectionProps {
  events?: Event[];
  isLoading?: boolean;
}

const EventsSection = ({ events = [], isLoading = false }: EventsSectionProps) => {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <div className="flex items-center">
              <Calendar size={24} className="text-oxford mr-2" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-oxford">
                Upcoming Demo Days & Events
              </h2>
            </div>
            <p className="text-gray-600 mt-1">
              Connect with the most innovative startups and investors
            </p>
          </div>
          <Link to="/events">
            <Button variant="ghost" className="text-oxford hover:text-oxford-400">
              View Calendar
              <ArrowRight size={16} className="ml-2" />
            </Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white animate-pulse h-80 rounded-lg shadow"></div>
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event, index) => (
              <EventCard key={index} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">No upcoming events.</p>
            <Button variant="outline" className="mt-4">
              <Link to="/events">Browse All Events</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default EventsSection;
