
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FundingRounds = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        <section className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Latest Funding Rounds</h1>
              <p className="text-xl text-blue-100">
                Track the newest investments across the global startup ecosystem
              </p>
            </div>
          </div>
        </section>
        
        <section className="container mx-auto px-4 py-12">
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-3">
              Securing Intelligence...
            </p>
            <h2 className="text-xl font-semibold text-oxford mb-2">Funding feed not wired to production yet</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-6">
              This page previously used mock data. To go fully live, connect a real funding source
              (or store funding rounds in Supabase) and we’ll switch this UI to production queries.
            </p>
            <Button asChild>
              <Link to="/startups/news">Browse live articles</Link>
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default FundingRounds;
