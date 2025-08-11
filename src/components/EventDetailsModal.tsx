import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar, 
  MapPin, 
  Users, 
  DollarSign, 
  Clock,
  ExternalLink,
  Globe,
  Building,
  User,
  Star,
  Share2,
  Bookmark
} from 'lucide-react';
import { TechEvent } from '@/services/eventsFetcher';

interface EventDetailsModalProps {
  event: TechEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({ event, isOpen, onClose }) => {
  if (!event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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

  const typeBadge = getEventTypeBadge(event.eventType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header Image */}
        {event.imageUrl && (
          <div className="relative h-48 -mx-6 -mt-6 mb-4 overflow-hidden rounded-t-lg">
            <img 
              src={event.imageUrl} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
            <Badge className={`absolute top-4 left-4 ${typeBadge.className}`}>
              {typeBadge.label}
            </Badge>
            {event.relevanceScore && event.relevanceScore > 80 && (
              <Badge className="absolute top-4 right-4 bg-yellow-500 text-white">
                🔥 Hot Event
              </Badge>
            )}
          </div>
        )}

        <DialogHeader>
          <DialogTitle className="text-2xl font-bold pr-8">{event.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {event.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Key Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">{formatDate(event.date)}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.time}
                </p>
                {event.endDate && (
                  <p className="text-sm text-gray-600">
                    Ends: {formatDate(event.endDate)}
                  </p>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3">
              {event.location.isOnline ? (
                <>
                  <Globe className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Online Event</p>
                    <p className="text-sm text-gray-600">Join from anywhere</p>
                  </div>
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{event.location.venue}</p>
                    <p className="text-sm text-gray-600">{event.location.address}</p>
                    <p className="text-sm text-gray-600">
                      {event.location.city}, {event.location.country}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Organizer */}
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">{event.organizer}</p>
                <p className="text-sm text-gray-600">Event Organizer</p>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className={`font-medium ${event.price.isFree ? 'text-green-600' : ''}`}>
                  {event.price.isFree ? 'Free Event' : `${event.price.currency} ${event.price.amount}`}
                </p>
                {event.attendeeCount && (
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.attendeeCount}+ attending
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Speakers */}
          {event.speakers && event.speakers.length > 0 && (
            <>
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Featured Speakers
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {event.speakers.map((speaker, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      {speaker.imageUrl && (
                        <img 
                          src={speaker.imageUrl} 
                          alt={speaker.name}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium text-sm">{speaker.name}</p>
                        <p className="text-xs text-gray-600">
                          {speaker.title}{speaker.company && `, ${speaker.company}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Topics</h4>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Sponsors */}
          {event.sponsors && event.sponsors.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Event Sponsors</h4>
                <div className="flex flex-wrap gap-3">
                  {event.sponsors.map((sponsor, index) => (
                    <Badge key={index} variant="outline">
                      {sponsor}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button asChild className="flex-1">
              <a 
                href={event.registrationUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Register Now
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
            <Button variant="outline" size="icon">
              <Bookmark className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsModal;