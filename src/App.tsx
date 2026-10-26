import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { HealthCheck } from "@/components/common/HealthCheck";
import { supabaseConfig } from "@/integrations/supabase/client";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazyWithReload } from "@/lib/lazyWithReload";

// Lazy load all page components
const Home = lazyWithReload(() => import("./pages/Home"));
const NotFound = lazyWithReload(() => import("./pages/NotFound"));
const StartupNews = lazyWithReload(() => import("./pages/StartupNews"));
const TechStacks = lazyWithReload(() => import("./pages/TechStacks"));
const GrowthHacking = lazyWithReload(() => import("./pages/GrowthHacking"));
const Search = lazyWithReload(() => import("./pages/Search"));
const Newsletter = lazyWithReload(() => import("./pages/Newsletter"));
const Events = lazyWithReload(() => import("./pages/Events"));
const EventDetail = lazyWithReload(() => import("./pages/EventDetail"));
const ErrorMonitoring = lazyWithReload(() => import("./pages/ErrorMonitoring"));
const EventReview = lazyWithReload(() => import("./pages/admin/EventReview"));
const ArticleView = lazyWithReload(() => import("./pages/ArticleView"));
const FundingRounds = lazyWithReload(() => import("./pages/FundingRounds"));
const MarketMaps = lazyWithReload(() => import("./pages/MarketMaps"));
const MarketMapView = lazyWithReload(() => import("./pages/MarketMapView"));
const TopicFeedPage = lazyWithReload(() => import("./pages/TopicFeedPage"));
const MarketsPage = lazyWithReload(() => import("./pages/MarketsPage"));
const StartupsPage = lazyWithReload(() => import("./pages/StartupsPage"));
const FounderStoriesPage = lazyWithReload(() => import("./pages/FounderStoriesPage"));
const Directory = lazyWithReload(() => import("./pages/Directory"));
const Learn = lazyWithReload(() => import("./pages/Learn"));
const AIToolsPage = lazyWithReload(() => import("./pages/AIToolsPage"));
const DevToolsPage = lazyWithReload(() => import("./pages/DevToolsPage"));

// Account Pages
const Dashboard = lazyWithReload(() => import("./pages/account/Dashboard"));
const SavedArticles = lazyWithReload(() => import("./pages/account/SavedArticles"));
const EmailPreferences = lazyWithReload(() => import("./pages/account/EmailPreferences"));
const RecentlyViewed = lazyWithReload(() => import("./pages/account/RecentlyViewed"));
const Settings = lazyWithReload(() => import("./pages/account/Settings"));
const SignOut = lazyWithReload(() => import("./pages/SignOut"));

// Explore Pages
const BigFundingStories = lazyWithReload(() => import("./pages/explore/BigFundingStories"));
const EmergingTech = lazyWithReload(() => import("./pages/explore/EmergingTech"));
const FounderSpotlights = lazyWithReload(() => import("./pages/explore/FounderSpotlights"));
const CaseStudies = lazyWithReload(() => import("./pages/explore/CaseStudies"));
const GrowthStrategies = lazyWithReload(() => import("./pages/explore/GrowthStrategies"));

// Resource Pages
const Blog = lazyWithReload(() => import("./pages/resources/Blog"));
const HowWeCurate = lazyWithReload(() => import("./pages/resources/HowWeCurate"));
const ApiAccess = lazyWithReload(() => import("./pages/resources/ApiAccess"));
const StartupSubmission = lazyWithReload(() => import("./pages/resources/StartupSubmission"));
const Contact = lazyWithReload(() => import("./pages/resources/Contact"));

// Legal Pages
const PrivacyPolicy = lazyWithReload(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyWithReload(() => import("./pages/TermsOfService"));
const Sitemap = lazyWithReload(() => import("./pages/Sitemap"));

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
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <HelmetProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              {!supabaseConfig.isConfigured && (
                <div className="fixed bottom-4 left-4 z-50 max-w-sm rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                    Supabase not configured
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    Set <code className="px-1">VITE_SUPABASE_URL</code> and{" "}
                    <code className="px-1">VITE_SUPABASE_ANON_KEY</code> in your deployment env and redeploy.
                  </div>
                  {supabaseConfig.problems.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      {supabaseConfig.problems.join(" • ")}
                    </div>
                  )}
                </div>
              )}
              <BrowserRouter>
              <Suspense fallback={<PageLoadingSkeleton />}>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/article/:id" element={<ArticleView />} />
                
                {/* Category pages */}
                <Route path="/markets" element={<MarketsPage />} />
                <Route path="/startups" element={<StartupsPage />} />
                <Route path="/founder-stories" element={<FounderStoriesPage />} />
                {/* Funding and Acquisitions are All stories tabs now; keep the old URLs. */}
                <Route path="/funding" element={<Navigate to="/startups/news?c=funding" replace />} />
                <Route path="/tech/ai-tools" element={<AIToolsPage />} />
                <Route path="/tech/dev-tools" element={<DevToolsPage />} />
                
                {/* Existing Routes */}
                <Route path="/startups/news" element={<StartupNews />} />
                <Route path="/market-maps" element={<MarketMaps />} />
                <Route path="/market-maps/:id" element={<MarketMapView />} />
                <Route
                  path="/ai-trends"
                  element={
                    <TopicFeedPage
                      title="AI Trends"
                      description="Where the AI market is actually moving — product, capital, and consolidation."
                      queryTerm="ai"
                      heroImage="https://images.unsplash.com/photo-1535378620166-273708d44e4c?auto=format&fit=crop&q=80"
                    />
                  }
                />
                <Route path="/acquisitions" element={<Navigate to="/startups/news?c=acquisitions" replace />} />
                <Route path="/learn" element={<Learn />} />
                <Route path="/founders" element={<Navigate to="/founder-spotlights" replace />} />
                <Route path="/tech-stacks" element={<Navigate to="/tech/tech-stacks" replace />} />
                <Route path="/funding/rounds" element={<FundingRounds />} />
                <Route path="/tech/tech-stacks" element={<TechStacks />} />
                <Route path="/tech/growth-hacking" element={<GrowthHacking />} />
                <Route path="/search" element={<Search />} />
                <Route path="/newsletter" element={<Newsletter />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:slug" element={<EventDetail />} />
                <Route path="/admin/monitoring" element={<ErrorMonitoring />} />
                {/* Unlinked admin route — gated server-side by ADMIN_EMAIL in admin-events edge function. Not in sitemap, not in nav. */}
                <Route path="/admin/events" element={<EventReview />} />
                
                {/* Account Pages */}
                <Route path="/account/dashboard" element={<Dashboard />} />
                <Route path="/account/saves" element={<SavedArticles />} />
                <Route path="/account/emails" element={<EmailPreferences />} />
                <Route path="/account/recent" element={<RecentlyViewed />} />
                <Route path="/account/settings" element={<Settings />} />
                <Route path="/signout" element={<SignOut />} />
                <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
                <Route path="/profile" element={<Navigate to="/account/dashboard" replace />} />
                
                {/* Explore Pages */}
                <Route path="/funding/big-stories" element={<BigFundingStories />} />
                <Route path="/tech/emerging" element={<EmergingTech />} />
                <Route path="/founder-spotlights" element={<FounderSpotlights />} />
                <Route path="/case-studies" element={<CaseStudies />} />
                <Route path="/growth-strategies" element={<GrowthStrategies />} />
                <Route
                  path="/reports"
                  element={
                    <TopicFeedPage
                      title="Reports"
                      description="Snapshot analyses pulled from the live feed."
                      heroImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80"
                    />
                  }
                />
                <Route path="/directory" element={<Directory />} />
                
                {/* Resource Pages */}
                <Route path="/blog" element={<Blog />} />
                <Route path="/how-we-curate" element={<HowWeCurate />} />
                <Route path="/api-access" element={<ApiAccess />} />
                <Route path="/startup-submission" element={<StartupSubmission />} />
                <Route path="/contact" element={<Contact />} />
                
                {/* Legal Pages */}
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/sitemap" element={<Sitemap />} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </BrowserRouter>
              
              {/* Health Check Component */}
              <HealthCheck />
            </TooltipProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </React.StrictMode>
  );
};

export default App;
