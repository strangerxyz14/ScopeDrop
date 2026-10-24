import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { ArticleGrid } from "@/components/ArticleGrid";
import { fetchSectionPreferTag } from "@/services/sectionFeed";

const FounderStoriesPage = () => {
  const queryFn = () => fetchSectionPreferTag(["startups"], "founder");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow">
        <div className="bg-oxford text-white py-14 px-4">
          <div className="container mx-auto max-w-4xl">
            <p className="text-xs font-mono text-parrot uppercase tracking-widest mb-3">Founders</p>
            <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Founder Stories</h1>
            <p className="text-white/60 text-lg max-w-xl">
              The people building the future — their decisions, mistakes, and breakthroughs
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-10 max-w-6xl">
          <ArticleGrid
            queryKey={["articles-founder-stories"]}
            queryFn={queryFn}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default FounderStoriesPage;
