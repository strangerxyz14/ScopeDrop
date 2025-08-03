
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { Event } from "@/types/news";
import { getEvents } from "@/services/mockDataService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EventCard from "@/components/EventCard";

const Events = () => {
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => getEvents(12),
  });

  // Filter events based on active tab
  const filteredEvents = events ? events.filter(event => {
    if (activeTab === 'all') return true;
    return event.type.toLowerCase() === activeTab.toLowerCase();
  }) : [];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">Demo Days & Events</h1>
            <p className="text-blue-100 max-w-2xl">
              Connect with the most innovative startups and investors at these upcoming demo days, 
              conferences, pitch competitions, and hackathons around the world.
            </p>
          </div>
        </div>
        
        {/* Events Grid */}
        <div className="container mx-auto px-4 py-8">
          <Tabs defaultValue="all" onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid grid-cols-5 md:w-auto max-w-md mx-auto bg-gray-100">
              <TabsTrigger value="all">All Events</TabsTrigger>
              <TabsTrigger value="demo day">Demo Days</TabsTrigger>
              <TabsTrigger value="conference">Conferences</TabsTrigger>
              <TabsTrigger value="pitch competition">Pitch Comps</TabsTrigger>
              <TabsTrigger value="hackathon">Hackathons</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array(8).fill(0).map((_, i) => (
                <div key={i} className="bg-white animate-pulse h-80 rounded-lg shadow"></div>
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredEvents.map((event, index) => (
                <EventCard key={index} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No events found for this category.</p>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Events;
