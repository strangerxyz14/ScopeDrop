
import React from "react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getNewsArticles } from "@/services/mockDataService";

const SavedArticles = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['savedArticles'],
    queryFn: () => getNewsArticles(5),
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold mb-2">My Saved Articles</h1>
          <p className="text-gray-600 mb-8">Articles you've saved for later reading.</p>
          
          <Tabs defaultValue="all" className="space-y-8">
            <TabsList>
              <TabsTrigger value="all">All Saved</TabsTrigger>
              <TabsTrigger value="startups">Startups</TabsTrigger>
              <TabsTrigger value="funding">Funding</TabsTrigger>
              <TabsTrigger value="tech">Technology</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>All Saved Articles</CardTitle>
                  <CardDescription>Your complete reading collection</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-6">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {articles?.map((article, i) => (
                        <div key={i} className="border-b pb-4">
                          <h3 className="font-bold text-lg mb-1">{article.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{article.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Saved on May 15, 2025</span>
                            <button className="text-xs text-red-500 hover:text-red-700">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="startups">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">No startup articles saved yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="funding">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">No funding articles saved yet.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="tech">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-gray-500">No technology articles saved yet.</p>
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

export default SavedArticles;
