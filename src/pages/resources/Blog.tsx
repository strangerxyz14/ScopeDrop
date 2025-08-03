import React from "react";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { processArticleWithGemini } from "@/services/geminiService";
import { NewsArticle } from "@/types/news";
import { useQuery } from "@tanstack/react-query";

const Blog = () => {
  // Get AI-generated blog posts
  const { data: blogPosts } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: async () => {
      // Array to store blog posts
      const posts = [];
      
      // Topics for blog posts
      const topics = [
        "How AI is transforming startup analysis",
        "The future of venture capital funding",
        "Building a data-driven startup culture",
        "Navigating startup acquisitions: A founder's guide",
        "Sustainable growth strategies for early-stage startups"
      ];
      
      // Generate a blog post for each topic
      for (const topic of topics) {
        const sampleArticle: NewsArticle = {
          title: topic,
          description: `ScopeDrop blog post about ${topic}`,
          url: `https://scopedrop.com/blog/${topic.toLowerCase().replace(/\s+/g, '-')}`,
          publishedAt: new Date().toISOString(),
        };
        
        // Use Gemini to get content
        const content = await processArticleWithGemini(sampleArticle);
        posts.push({
          title: topic,
          content,
          author: "ScopeDrop Team",
          date: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          category: ["Startups", "Analysis", "Insights"][Math.floor(Math.random() * 3)]
        });
      }
      
      return posts;
    },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">ScopeDrop Blog</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Insights, analysis, and perspectives on the global startup ecosystem
            </p>
          </div>
        </div>
        
        {/* Blog Content */}
        <div className="container mx-auto px-4 py-12">
          <Tabs defaultValue="all" className="space-y-8">
            <TabsList className="flex flex-wrap justify-center">
              <TabsTrigger value="all">All Posts</TabsTrigger>
              <TabsTrigger value="startups">Startups</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="interviews">Interviews</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {blogPosts?.map((post, index) => (
                  <Card key={index} className="overflow-hidden">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">{post.category}</Badge>
                        <span className="text-sm text-gray-500">{post.date}</span>
                      </div>
                      <CardTitle className="text-2xl">{post.title}</CardTitle>
                      <CardDescription>
                        A detailed look into this trending topic in the startup ecosystem
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none line-clamp-3" dangerouslySetInnerHTML={{ __html: post.content || "" }} />
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="https://github.com/shadcn.png" alt="Author" />
                          <AvatarFallback>ST</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{post.author}</span>
                      </div>
                      <div>
                        <button className="text-oxford hover:text-parrot transition-colors text-sm font-medium">
                          Read More
                        </button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            {/* Other tabs would have similar content */}
            {['startups', 'analysis', 'insights', 'interviews'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <div className="text-center py-12">
                  <p className="text-gray-500">No posts in this category yet.</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Blog;
