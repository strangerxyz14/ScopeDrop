
import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AccountPageTemplateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const AccountPageTemplate = ({ title, description, children }: AccountPageTemplateProps) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-display font-bold mb-2">{title}</h1>
          <p className="text-gray-600 mb-8">{description}</p>
          
          <Card>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              {children}
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountPageTemplate;
