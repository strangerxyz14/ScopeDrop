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
import { RequireAuth } from "@/components/auth/RequireAuth";

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
const MarketMaps = React.lazy(() => import("./pages/MarketMaps"));
const MarketMapView = React.lazy(() => import("./pages/MarketMapView"));
const TopicFeedPage = React.lazy(() => import("./pages/TopicFeedPage"));
const Login = React.lazy(() => import("./pages/Login"));
const ForgotPassword = React.lazy(() => import("./pages/ForgotPassword"));

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

// Legal Pages
const PrivacyPolicy = React.lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = React.lazy(() => import("./pages/TermsOfService"));
const Sitemap = React.lazy(() => import("./pages/Sitemap"));

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
                
                {/* Existing Routes */}
                <Route path="/startups/news" element={<StartupNews />} />
                <Route path="/market-maps" element={<MarketMaps />} />
                <Route path="/market-maps/:id" element={<MarketMapView />} />
                {/* Header nav aliases (prevent 404s) */}
                <Route path="/funding" element={<FundingRounds />} />
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
                <Route
                  path="/acquisitions"
                  element={
                    <TopicFeedPage
                      title="Acquisitions"
                      description="M&A, acquihires, and competitive roll-ups — the deals and the incentives behind them."
                      queryTerm="acquisition"
                      heroImage="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&q=80"
                    />
                  }
                />
                <Route path="/founders" element={<Navigate to="/founder-spotlights" replace />} />
                <Route path="/tech-stacks" element={<Navigate to="/tech/tech-stacks" replace />} />
                <Route path="/funding/rounds" element={<FundingRounds />} />
                <Route path="/tech/tech-stacks" element={<TechStacks />} />
                <Route path="/tech/growth-hacking" element={<GrowthHacking />} />
                <Route path="/search" element={<Search />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/newsletter" element={<Newsletter />} />
                <Route path="/events" element={<Events />} />
                <Route path="/admin/monitoring" element={<ErrorMonitoring />} />
                
                {/* Account Pages */}
                <Route path="/account/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/account/saves" element={<RequireAuth><SavedArticles /></RequireAuth>} />
                <Route path="/account/emails" element={<RequireAuth><EmailPreferences /></RequireAuth>} />
                <Route path="/account/recent" element={<RequireAuth><RecentlyViewed /></RequireAuth>} />
                <Route path="/account/settings" element={<RequireAuth><Settings /></RequireAuth>} />
                <Route path="/signout" element={<RequireAuth><SignOut /></RequireAuth>} />
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
                <Route
                  path="/directory"
                  element={
                    <TopicFeedPage
                      title="Directory"
                      description="Company and ecosystem discovery (currently backed by the live feed)."
                      heroImage="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&q=80"
                    />
                  }
                />
                
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
