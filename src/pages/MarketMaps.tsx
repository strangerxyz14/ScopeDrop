import SEO from "@/components/SEO";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import MarketMapsSection from "@/components/MarketMapsSection";

const MarketMaps = () => {
  // Market maps are not yet wired to a dedicated table.
  // This page exists to provide a professional route structure.
  const marketMaps: any[] = [];

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

