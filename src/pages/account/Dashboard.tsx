
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processArticleWithGemini } from "@/services/geminiService";
import { NewsArticle } from "@/types/news";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getNewsArticles } from "@/services/mockDataService";
import { sanitizeHtml } from "@/utils/sanitize";

const Dashboard = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['dashboardArticles'],
    queryFn: () => getNewsArticles(3),
  });

  // Get personalized recommendations using Gemini
  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ['recommendations'],
    queryFn: async () => {
      if (!articles || articles.length === 0) return [];
      
      // Create a sample article to get recommendations based on
      const sampleArticle: NewsArticle = {
        title: "AI-Powered Startup Dashboard",
        description: "How ScopeDrop uses AI to curate personalized startup news",
        url: "https://scopedrop.com/dashboard",
        publishedAt: new Date().toISOString(),
      };
      
      // Use Gemini to get recommendation text
      const recommendationText = await processArticleWithGemini(sampleArticle);
      return recommendationText;
    },
    enabled: !!articles && articles.length > 0,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold mb-2">My Dashboard</h1>
          <p className="text-gray-600 mb-8">Welcome back. Here's your startup intelligence at a glance.</p>
          
          <Tabs defaultValue="overview" className="space-y-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="reading-list">Reading List</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Reading Activity</CardTitle>
                    <CardDescription>Your weekly reading stats</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Articles Read</span>
                        <span className="font-bold">12</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time Spent</span>
                        <span className="font-bold">1h 45m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Top Category</span>
                        <span className="font-bold">Fintech</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Saved Items</CardTitle>
                    <CardDescription>Articles you've bookmarked</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Articles</span>
                        <span className="font-bold">8</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Startups</span>
                        <span className="font-bold">5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Market Maps</span>
                        <span className="font-bold">2</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Newsletter Status</CardTitle>
                    <CardDescription>Your email subscription details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Plan</span>
                        <span className="font-bold">Weekly Digest</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Next Delivery</span>
                        <span className="font-bold">Sunday</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Open Rate</span>
                        <span className="font-bold">92%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Personalized Recommendations</CardTitle>
                  <CardDescription>Based on your reading history</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingRecommendations ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : (
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(recommendations || "") }} />
                  )}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Articles you've recently viewed</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {articles?.map((article, i) => (
                        <li key={i} className="border-b pb-3">
                          <h4 className="font-medium">{article.title}</h4>
                          <p className="text-sm text-gray-500">Viewed 2 hours ago</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reading-list">
              <Card>
                <CardHeader>
                  <CardTitle>Your Reading List</CardTitle>
                  <CardDescription>Articles you want to read later</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">You have no articles in your reading list yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle>Dashboard Preferences</CardTitle>
                  <CardDescription>Customize your dashboard experience</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-500">Preference settings coming soon.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
