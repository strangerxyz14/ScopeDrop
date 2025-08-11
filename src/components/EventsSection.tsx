
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import EventsCarousel from "./EventsCarousel";
import { Calendar, ArrowRight, MapPin } from "lucide-react";

interface EventsSectionProps {
  events?: any[];
  isLoading?: boolean;
}

const EventsSection = ({ events = [], isLoading = false }: EventsSectionProps) => {
  const [userLocation, setUserLocation] = useState("San Francisco");
  
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center">
              <Calendar size={24} className="text-purple-600 mr-2" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">
                Upcoming Demo Days & Events
              </h2>
            </div>
            <p className="text-gray-600 mt-1">
              AI-powered discovery of startup events in your area
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
              <MapPin className="w-4 h-4 text-blue-600" />
              <select 
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                className="bg-transparent border-none focus:outline-none text-sm font-medium text-blue-600"
              >
                <option value="San Francisco">San Francisco</option>
                <option value="New York">New York</option>
                <option value="London">London</option>
                <option value="Berlin">Berlin</option>
                <option value="Singapore">Singapore</option>
              </select>
            </div>
            <Link to="/events">
              <Button variant="outline" size="sm" className="text-purple-600 border-purple-200 hover:bg-purple-50">
                View All Events
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Use the EventsCarousel component with auto-scroll */}
        <EventsCarousel 
          location={userLocation}
          autoScroll={true}
          scrollSpeed={25}
          showControls={false}
        />
      </div>
    </section>
  );
};

export default EventsSection;
