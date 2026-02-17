import SEO from "@/components/SEO";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import MarketMapsSection from "@/components/MarketMapsSection";
import type { MarketMap } from "@/types/news";

const MarketMaps = () => {
  // Market maps are not yet wired to a dedicated table.
  // This page exists to provide a professional route structure.
  const marketMaps: MarketMap[] = [
    {
      id: "ai-healthcare-2025",
      title: "AI in Healthcare Landscape (2025)",
      sector: "Health Tech",
      companyCount: 50,
      imageUrl:
        "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80",
      description: "Mapping the companies using AI to transform diagnostics, care delivery, and billing.",
    },
    {
      id: "europe-climate-tech",
      title: "Europe Climate Tech Market Map",
      sector: "Climate Tech",
      companyCount: 37,
      imageUrl:
        "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80",
      description: "The most relevant startups tackling climate through energy, mobility, and carbon markets.",
    },
    {
      id: "fintech-infrastructure",
      title: "Fintech Infrastructure Landscape",
      sector: "Fintech",
      companyCount: 64,
      imageUrl:
        "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80",
      description: "Mapping the companies building the rails for modern financial services.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title="Market Maps - ScopeDrop"
        description="Industry landscape overviews and sector maps."
        keywords={["market maps", "industry landscape", "sector intelligence", "ScopeDrop"]}
      />
      <Header />
      <main className="flex-grow">
        <MarketMapsSection marketMaps={marketMaps} isLoading={false} />
      </main>
      <Footer />
    </div>
  );
};

export default MarketMaps;

