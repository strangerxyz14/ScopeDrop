
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
        
        <main className="flex-grow bg-background pt-16">
          <div className="container mx-auto px-4 py-8">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border border-parrot/30 bg-parrot/10">
                <Calendar className="w-8 h-8 text-parrot" />
              </div>
              <h1 className="font-display text-4xl font-bold text-foreground mb-4">Demo Days & Startup Events</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                AI-powered event discovery for startup founders, investors, and tech enthusiasts.
                Never miss the next big demo day or networking opportunity.
              </p>
            </div>

            {/* Location Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-secondary/60">
                <MapPin className="w-4 h-4 text-parrot" />
                <span className="text-sm font-medium text-foreground">Current Location:</span>
                <select
                  value={userLocation}
                  onChange={(e) => setUserLocation(e.target.value)}
                  className="bg-transparent border-none focus:outline-none font-semibold text-parrot"
                >
                  {techHubs.map(city => (
                    <option key={city} value={city} className="bg-oxford text-foreground">{city}</option>
                  ))}
                </select>
              </div>
              <Button variant="outline" size="sm" className="border-white/15 text-foreground hover:bg-white/5 bg-transparent">
                Use My Location
              </Button>
            </div>

            {/* Featured Section - Demo Days */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-amber" />
                  <h2 className="font-display text-2xl font-bold text-foreground">Featured Demo Days</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-parrot hover:bg-white/5">View All</Button>
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
              <TabsList className="grid w-full grid-cols-5 bg-secondary/60 border border-white/10">
                <TabsTrigger value="all">All Events</TabsTrigger>
                <TabsTrigger value="hackathons">Hackathons</TabsTrigger>
                <TabsTrigger value="conferences">Conferences</TabsTrigger>
                <TabsTrigger value="meetups">Meetups</TabsTrigger>
                <TabsTrigger value="online">Online</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-parrot" />
                  <h3 className="text-lg font-semibold text-foreground">Trending in {userLocation}</h3>
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
                <Card className="insight-card p-6">
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">Online events from all locations coming soon!</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Stats Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
              <Card className="insight-card p-4 text-center">
                <div className="font-mono text-2xl font-bold text-parrot">50+</div>
                <div className="text-sm text-muted-foreground">Events This Week</div>
              </Card>
              <Card className="insight-card p-4 text-center">
                <div className="font-mono text-2xl font-bold text-parrot">15</div>
                <div className="text-sm text-muted-foreground">Demo Days</div>
              </Card>
              <Card className="insight-card p-4 text-center">
                <div className="font-mono text-2xl font-bold text-parrot">8</div>
                <div className="text-sm text-muted-foreground">Cities Covered</div>
              </Card>
              <Card className="insight-card p-4 text-center">
                <div className="font-mono text-2xl font-bold text-amber">24/7</div>
                <div className="text-sm text-muted-foreground">Auto Updates</div>
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
