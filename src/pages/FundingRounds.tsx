
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import FundingCard from "@/components/FundingCard";
import { getFundingRounds } from "@/services/mockDataService";
import { FundingStage, Sector, Region } from "@/types/news";

const FundingRounds = () => {
  const [selectedStage, setSelectedStage] = useState<FundingStage | 'All'>('All');
  const [selectedSector, setSelectedSector] = useState<Sector | 'All'>('All');
  const [selectedRegion, setSelectedRegion] = useState<Region | 'All'>('All');
  
  const { data: fundingRounds, isLoading } = useQuery({
    queryKey: ['fundingRounds', 'all'],
    queryFn: () => getFundingRounds(20),
  });
  
  // Filter the funding rounds based on selected filters
  const filteredRounds = fundingRounds?.filter(round => {
    return (
      (selectedStage === 'All' || round.stage === selectedStage) &&
      (selectedSector === 'All' || round.sector === selectedSector) &&
      (selectedRegion === 'All' || round.region === selectedRegion)
    );
  });

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
        
        <section className="container mx-auto px-4 py-8">
          {/* Filter controls */}
          <div className="bg-white shadow rounded-lg p-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funding Stage
                </label>
                <select 
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as FundingStage | 'All')}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent"
                >
                  <option value="All">All Stages</option>
                  <option value="Seed">Seed</option>
                  <option value="Series A">Series A</option>
                  <option value="Series B">Series B</option>
                  <option value="Series C+">Series C+</option>
                  <option value="Growth">Growth</option>
                  <option value="IPO">IPO</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sector
                </label>
                <select 
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value as Sector | 'All')}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent"
                >
                  <option value="All">All Sectors</option>
                  <option value="AI & ML">AI & ML</option>
                  <option value="Fintech">Fintech</option>
                  <option value="Health Tech">Health Tech</option>
                  <option value="Climate Tech">Climate Tech</option>
                  <option value="SaaS">SaaS</option>
                  <option value="E-commerce">E-commerce</option>
                  <option value="Web3">Web3</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Region
                </label>
                <select 
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value as Region | 'All')}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-oxford focus:border-transparent"
                >
                  <option value="All">All Regions</option>
                  <option value="North America">North America</option>
                  <option value="Europe">Europe</option>
                  <option value="Asia">Asia</option>
                  <option value="Africa">Africa</option>
                  <option value="South America">South America</option>
                  <option value="Oceania">Oceania</option>
                  <option value="Global">Global</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array(9).fill(0).map((_, index) => (
                <div key={index} className="bg-gray-100 animate-pulse h-40 rounded-lg"></div>
              ))
            ) : filteredRounds && filteredRounds.length > 0 ? (
              filteredRounds.map((round, index) => (
                <div key={index} className="h-full">
                  <FundingCard fundingRound={round} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500 mb-4">No funding rounds match your current filters.</p>
                <Button onClick={() => {
                  setSelectedStage('All');
                  setSelectedSector('All');
                  setSelectedRegion('All');
                }}>
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default FundingRounds;
