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

// Account Pages
import Dashboard from "./pages/account/Dashboard";
import SavedArticles from "./pages/account/SavedArticles";
import EmailPreferences from "./pages/account/EmailPreferences";
import RecentlyViewed from "./pages/account/RecentlyViewed";
import Settings from "./pages/account/Settings";
import SignOut from "./pages/SignOut";

// Explore Pages
import BigFundingStories from "./pages/explore/BigFundingStories";
import EmergingTech from "./pages/explore/EmergingTech";
import FounderSpotlights from "./pages/explore/FounderSpotlights";
import CaseStudies from "./pages/explore/CaseStudies";
import GrowthStrategies from "./pages/explore/GrowthStrategies";

// Resource Pages
import Blog from "./pages/resources/Blog";
import HowWeCurate from "./pages/resources/HowWeCurate";
import ApiAccess from "./pages/resources/ApiAccess";
import StartupSubmission from "./pages/resources/StartupSubmission";
import Contact from "./pages/resources/Contact";

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
              
              {/* Existing Routes */}
              <Route path="/startups/news" element={<StartupNews />} />
              <Route path="/funding/rounds" element={<FundingRounds />} />
              <Route path="/tech/tech-stacks" element={<TechStacks />} />
              <Route path="/tech/growth-hacking" element={<GrowthHacking />} />
              <Route path="/search" element={<Search />} />
              <Route path="/newsletter" element={<Newsletter />} />
              <Route path="/events" element={<Events />} />
              <Route path="/admin/monitoring" element={<ErrorMonitoring />} />
              
              {/* Account Pages */}
              <Route path="/account/dashboard" element={<Dashboard />} />
              <Route path="/account/saves" element={<SavedArticles />} />
              <Route path="/account/emails" element={<EmailPreferences />} />
              <Route path="/account/recent" element={<RecentlyViewed />} />
              <Route path="/account/settings" element={<Settings />} />
              <Route path="/signout" element={<SignOut />} />
              
              {/* Explore Pages */}
              <Route path="/funding/big-stories" element={<BigFundingStories />} />
              <Route path="/tech/emerging" element={<EmergingTech />} />
              <Route path="/founder-spotlights" element={<FounderSpotlights />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/growth-strategies" element={<GrowthStrategies />} />
              
              {/* Resource Pages */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/how-we-curate" element={<HowWeCurate />} />
              <Route path="/api-access" element={<ApiAccess />} />
              <Route path="/startup-submission" element={<StartupSubmission />} />
              <Route path="/contact" element={<Contact />} />
              
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
