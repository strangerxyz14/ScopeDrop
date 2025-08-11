
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import ErrorMonitor from "@/components/ErrorMonitor";

const GrowthHacking = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Page Header */}
        <div className="bg-gradient-to-r from-elevarcBlue to-blue-700 text-white py-12">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-display font-bold">Growth Hacking</h1>
            <p className="mt-2 text-blue-100">Strategies and tactics for exponential startup growth</p>
          </div>
        </div>
        
        {/* Placeholder Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold mb-4">Coming Soon</h2>
            <p className="text-gray-600">
              Our team is compiling the most effective growth hacking strategies from successful startups.
              We'll be launching this section with actionable insights very soon.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
      <ErrorMonitor />
    </div>
  );
};

export default GrowthHacking;
