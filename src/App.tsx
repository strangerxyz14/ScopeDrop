import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { HelmetProvider } from "react-helmet-async";
import ErrorBoundary from "@/components/ErrorBoundary";

// Import content scheduler to auto-start real-time content fetching
import "./services/contentScheduler";

// Lazy load all page components
const Home = React.lazy(() => import("./pages/Home"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const StartupNews = React.lazy(() => import("./pages/StartupNews"));
const TechStacks = React.lazy(() => import("./pages/TechStacks"));
const GrowthHacking = React.lazy(() => import("./pages/GrowthHacking"));
const Search = React.lazy(() => import("./pages/Search"));
const Newsletter = React.lazy(() => import("./pages/Newsletter"));
const Events = React.lazy(() => import("./pages/Events"));
const ErrorMonitoring = React.lazy(() => import("./pages/ErrorMonitoring"));
const ArticleView = React.lazy(() => import("./pages/ArticleView"));
const FundingRounds = React.lazy(() => import("./pages/FundingRounds"));

// Account Pages
const Dashboard = React.lazy(() => import("./pages/account/Dashboard"));
const SavedArticles = React.lazy(() => import("./pages/account/SavedArticles"));
const EmailPreferences = React.lazy(() => import("./pages/account/EmailPreferences"));
const RecentlyViewed = React.lazy(() => import("./pages/account/RecentlyViewed"));
const Settings = React.lazy(() => import("./pages/account/Settings"));
const SignOut = React.lazy(() => import("./pages/SignOut"));

// Explore Pages
const BigFundingStories = React.lazy(() => import("./pages/explore/BigFundingStories"));
const EmergingTech = React.lazy(() => import("./pages/explore/EmergingTech"));
const FounderSpotlights = React.lazy(() => import("./pages/explore/FounderSpotlights"));
const CaseStudies = React.lazy(() => import("./pages/explore/CaseStudies"));
const GrowthStrategies = React.lazy(() => import("./pages/explore/GrowthStrategies"));

// Resource Pages
const Blog = React.lazy(() => import("./pages/resources/Blog"));
const HowWeCurate = React.lazy(() => import("./pages/resources/HowWeCurate"));
const ApiAccess = React.lazy(() => import("./pages/resources/ApiAccess"));
const StartupSubmission = React.lazy(() => import("./pages/resources/StartupSubmission"));
const Contact = React.lazy(() => import("./pages/resources/Contact"));

// Loading component for Suspense fallbacks
const PageLoadingSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-64 mb-4" />
      <Skeleton className="h-4 w-96 mb-8" />
      <div className="grid gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Create a client outside the component
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
              <Suspense fallback={<PageLoadingSkeleton />}>
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
                </Suspense>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );
};

export default App;
