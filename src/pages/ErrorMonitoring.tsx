
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorMonitoringDashboard from "@/components/ErrorMonitoringDashboard";

const ErrorMonitoring = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        <ErrorMonitoringDashboard />
      </main>
      
      <Footer />
    </div>
  );
};

export default ErrorMonitoring;
