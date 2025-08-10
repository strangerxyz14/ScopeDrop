import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RefreshCw,
  Filter
} from 'lucide-react';
import { TechEvent, EventsAggregator } from '@/services/eventsFetcher';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface EventsCarouselProps {
  location?: string;
  category?: string;
  autoScroll?: boolean;
  scrollSpeed?: number;
  showControls?: boolean;
}

export const EventsCarousel: React.FC<EventsCarouselProps> = ({
  location = 'San Francisco',
  category,
  autoScroll = true,
  scrollSpeed = 30, // pixels per second
  showControls = true
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Fetch events using the aggregator
  const { data: events, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['events', location, category],
    queryFn: async () => {
      const aggregator = new EventsAggregator();
      return aggregator.fetchAllEvents(location, category);
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 3 * 60 * 1000, // Consider data stale after 3 minutes
  });

  // Filter events by type
  const filteredEvents = events?.filter(event => 
    selectedType === 'all' || event.eventType === selectedType
  ) || [];

  // Duplicate events for infinite scroll effect
  const displayEvents = [...filteredEvents, ...filteredEvents];

  // Auto-scroll animation
  useEffect(() => {
    if (!autoScroll || isPaused || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let scrollPosition = 0;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      // Calculate scroll distance based on time elapsed
      const scrollDistance = (scrollSpeed * deltaTime) / 1000;
      scrollPosition += scrollDistance;

      // Reset scroll when reaching halfway (seamless loop)
      const maxScroll = container.scrollWidth / 2;
      if (scrollPosition >= maxScroll) {
        scrollPosition = 0;
      }

      container.scrollLeft = scrollPosition;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        lastTimeRef.current = 0;
      }
    };
  }, [autoScroll, isPaused, scrollSpeed, displayEvents.length]);

  // Pause on hover
  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  // Manual scroll controls
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
    }
  };

  // Event type badges with colors
  const getEventTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      'demo-day': { label: 'Demo Day', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      'hackathon': { label: 'Hackathon', className: 'bg-green-100 text-green-700 border-green-200' },
      'conference': { label: 'Conference', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      'meetup': { label: 'Meetup', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      'workshop': { label: 'Workshop', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      'pitch-event': { label: 'Pitch Event', className: 'bg-red-100 text-red-700 border-red-200' },
      'webinar': { label: 'Webinar', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    };
    return badges[type] || { label: type, className: 'bg-gray-100 text-gray-700' };
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="min-w-[350px] animate-pulse">
              <CardHeader>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Controls Bar */}
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {filteredEvents.length} Events
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Event Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-sm border rounded-md px-3 py-1"
            >
              <option value="all">All Events</option>
              <option value="demo-day">Demo Days</option>
              <option value="hackathon">Hackathons</option>
              <option value="conference">Conferences</option>
              <option value="meetup">Meetups</option>
              <option value="pitch-event">Pitch Events</option>
            </select>

            {/* Playback Controls */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            
            <Button variant="ghost" size="icon" onClick={scrollLeft}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={scrollRight}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Events Carousel */}
      <div className="relative group">
        {/* Gradient Overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-hidden py-2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          style={{ scrollBehavior: 'auto' }}
        >
          {displayEvents.length === 0 ? (
            <div className="w-full text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No events found for this location</p>
            </div>
          ) : (
            displayEvents.map((event, index) => (
              <EventCard
                key={`${event.id}-${index}`}
                event={event}
                getEventTypeBadge={getEventTypeBadge}
                formatDate={formatDate}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Individual Event Card Component
interface EventCardProps {
  event: TechEvent;
  getEventTypeBadge: (type: string) => { label: string; className: string };
  formatDate: (date: string) => string;
}

const EventCard: React.FC<EventCardProps> = ({ event, getEventTypeBadge, formatDate }) => {
  const typeBadge = getEventTypeBadge(event.eventType);
  
  return (
    <Card className="min-w-[350px] max-w-[350px] hover:shadow-lg transition-all duration-300 group cursor-pointer">
      {/* Event Image or Gradient Background */}
      <div className="relative h-32 overflow-hidden rounded-t-lg">
        {event.imageUrl ? (
          <img 
            src={event.imageUrl} 
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={cn(
            "w-full h-full",
            "bg-gradient-to-br",
            event.eventType === 'demo-day' ? "from-purple-400 to-purple-600" :
            event.eventType === 'hackathon' ? "from-green-400 to-green-600" :
            event.eventType === 'conference' ? "from-blue-400 to-blue-600" :
            "from-gray-400 to-gray-600"
          )} />
        )}
        
        {/* Overlay with Event Type */}
        <div className="absolute top-2 left-2">
          <Badge className={cn("shadow-md", typeBadge.className)}>
            {typeBadge.label}
          </Badge>
        </div>

        {/* Relevance Score */}
        {event.relevanceScore && event.relevanceScore > 80 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-yellow-500 text-white">
              🔥 Hot
            </Badge>
          </div>
        )}
      </div>

      <CardHeader className="pb-3">
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        <p className="text-sm text-gray-600">{event.organizer}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Date & Time */}
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span className="font-medium">{formatDate(event.date)}</span>
          <Clock className="w-4 h-4 ml-3 mr-1" />
          <span>{event.time}</span>
        </div>

        {/* Location */}
        <div className="flex items-center text-sm text-gray-600">
          {event.location.isOnline ? (
            <>
              <Globe className="w-4 h-4 mr-2" />
              <span>Online Event</span>
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">
                {event.location.venue}, {event.location.city}
              </span>
            </>
          )}
        </div>

        {/* Price & Attendees */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <DollarSign className="w-4 h-4 mr-1" />
            <span className={event.price.isFree ? "text-green-600 font-medium" : ""}>
              {event.price.isFree ? 'Free' : `$${event.price.amount}`}
            </span>
          </div>
          {event.attendeeCount && (
            <div className="flex items-center text-gray-600">
              <Users className="w-4 h-4 mr-1" />
              <span>{event.attendeeCount}+ attending</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Register Button */}
        <Button 
          className="w-full mt-3 group-hover:bg-blue-600 group-hover:text-white transition-colors"
          variant="outline"
          size="sm"
          asChild
        >
          <a 
            href={event.registrationUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Register
            <ExternalLink className="w-3 h-3 ml-2" />
          </a>
        </Button>
      </CardContent>
    </Card>
  );
};

export default EventsCarousel;