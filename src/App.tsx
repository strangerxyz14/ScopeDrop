
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import StartupNews from "./pages/StartupNews";
import TechStacks from "./pages/TechStacks";
import GrowthHacking from "./pages/GrowthHacking";
import Search from "./pages/Search";
import Newsletter from "./pages/Newsletter";
import Events from "./pages/Events";
import ErrorMonitoring from "./pages/ErrorMonitoring";

// Properly initialize the queryClient inside the component
const App = () => {
  // Create a client
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/startups/news" element={<StartupNews />} />
            <Route path="/tech/tech-stacks" element={<TechStacks />} />
            <Route path="/tech/growth-hacking" element={<GrowthHacking />} />
            <Route path="/search" element={<Search />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin/monitoring" element={<ErrorMonitoring />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
