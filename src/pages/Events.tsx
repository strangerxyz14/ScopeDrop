
import React, { useState } from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import EventsCarousel from "@/components/EventsCarousel";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, TrendingUp, Sparkles } from "lucide-react";
import SEO from "@/components/SEO";

const Events = () => {
  const [userLocation, setUserLocation] = useState("San Francisco");

  // Popular tech hubs for quick selection
  const techHubs = [
    "San Francisco",
    "New York",
    "London",
    "Berlin",
    "Singapore",
    "Austin",
    "Seattle",
    "Boston"
  ];

  return (
    <>
      <SEO
        title="Demo Days & Startup Events - ScopeDrop"
        description="Discover upcoming demo days, hackathons, conferences, and startup events in your area. Never miss important networking opportunities."
        keywords={["demo day", "startup events", "tech conferences", "hackathons", "networking events"]}
      />
      
      <div className="flex flex-col min-h-screen">
        <Header />
        
        <main className="flex-grow bg-gradient-to-b from-gray-50 to-white">
          <div className="container mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <Calendar className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4">Demo Days & Startup Events</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                AI-powered event discovery for startup founders, investors, and tech enthusiasts.
                Never miss the next big demo day or networking opportunity.
              </p>
            </div>

            {/* Location Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Current Location:</span>
                <select 
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  className="bg-transparent border-none focus:outline-none font-semibold text-blue-600"
                >
                  {techHubs.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="sm">
                Use My Location
              </Button>
            </div>

            {/* Featured Section - Demo Days */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold">Featured Demo Days</h2>
                </div>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <EventsCarousel 
                location={userLocation}
                category="demo-day"
                autoScroll={true}
                scrollSpeed={40}
              />
            </div>

            {/* Tabs for Different Event Types */}
            <Tabs defaultValue="all" className="space-y-8">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
                <TabsTrigger value="conferences">Conferences</TabsTrigger>
                <TabsTrigger value="meetups">Meetups</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Trending in {userLocation}</h3>
                </div>
                <EventsCarousel 
                  location={userLocation}
                  autoScroll={true}
                  scrollSpeed={30}
                />
              </TabsContent>
              
              <TabsContent value="hackathons">
                <EventsCarousel 
                  location={userLocation}
                  category="hackathon"
                  autoScroll={true}
                  scrollSpeed={30}
                />
              </TabsContent>
              
              <TabsContent value="conferences">
                <EventsCarousel 
                  location={userLocation}
                  category="conference"
                  autoScroll={true}
                  scrollSpeed={30}
                />
              </TabsContent>
              
              <TabsContent value="meetups">
                <EventsCarousel 
                  location={userLocation}
                  category="meetup"
                  autoScroll={true}
                  scrollSpeed={30}
                />
              </TabsContent>
              
              <TabsContent value="online">
                <Card className="p-6">
                  <CardContent className="text-center">
                    <p className="text-gray-500">Online events from all locations coming soon!</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">50+</div>
                <div className="text-sm text-gray-600">Events This Week</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">15</div>
                <div className="text-sm text-gray-600">Demo Days</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">8</div>
                <div className="text-sm text-gray-600">Cities Covered</div>
              </Card>
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">24/7</div>
                <div className="text-sm text-gray-600">Auto Updates</div>
              </Card>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Events;
