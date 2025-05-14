
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
import ArticleView from "./pages/ArticleView";
import FundingRounds from "./pages/FundingRounds";

// Create a client outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/article/:id" element={<ArticleView />} />
              <Route path="/startups/news" element={<StartupNews />} />
              <Route path="/funding/rounds" element={<FundingRounds />} />
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
    </React.StrictMode>
  );
};

export default App;
