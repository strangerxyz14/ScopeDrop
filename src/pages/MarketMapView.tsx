import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const MarketMapView = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="flex flex-col min-h-screen">
      <SEO
        title={id ? `Market Map - ${id} | ScopeDrop` : "Market Map | ScopeDrop"}
        description="Market map detail view."
        keywords={["market map", "industry landscape", "ScopeDrop"]}
      />
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-10 max-w-4xl">
          <div className="mb-6">
            <Button variant="outline" asChild>
              <Link to="/market-maps">Back to Market Maps</Link>
            </Button>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-oxford">Market Map</h1>
          <p className="text-muted-foreground mt-2">
            ID: <span className="font-mono">{id ?? "unknown"}</span>
          </p>

          <Card className="mt-8 p-6">
            <p className="text-sm text-muted-foreground">
              Placeholder view. Wire this to your Market Maps dataset/table and render the actual landscape,
              companies, and categories here.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketMapView;

