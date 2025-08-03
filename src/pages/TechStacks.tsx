
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorMonitor from "@/components/ErrorMonitor";

const TechStacks = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-elevarcBlue to-blue-700 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold">Tech Stacks</h1>
            <p className="mt-2 text-blue-100">Explore the technology powering successful startups</p>
          </div>
        </div>
        
        {/* Placeholder Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              We're working on bringing you detailed analysis of startup tech stacks.
              Check back soon for in-depth breakdowns and comparisons.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
      <ErrorMonitor />
    </div>
  );
};

export default TechStacks;
