
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

interface ResourcePageTemplateProps {
  title: string;
  description: string;
  topic: string;
  children?: React.ReactNode;
}

const ResourcePageTemplate = ({ title, description, topic, children }: ResourcePageTemplateProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-16">
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">{title}</h1>
            <p className="text-xl text-blue-100 max-w-3xl">{description}</p>
          </div>
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {children || (
              <div className="space-y-4">
                <p className="text-muted-foreground text-lg leading-relaxed">
                  {description}
                </p>
                <div className="space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-5/6" />
                </div>
                <p className="text-sm text-muted-foreground">
                  This resource page is waiting for agent-generated content to be published into Supabase.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ResourcePageTemplate;
