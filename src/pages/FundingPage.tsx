import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { ArticleGrid } from "@/components/ArticleGrid";
import { fetchSection } from "@/services/sectionFeed";

const FundingPage = () => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-grow">
      <div className="bg-oxford text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <p className="text-xs font-mono text-parrot uppercase tracking-widest mb-3">Funding</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Funding Intelligence</h1>
          <p className="text-white/60 text-lg max-w-xl">
            Every raise, round, and runway that's shaping the startup landscape
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <ArticleGrid
          queryKey={["articles-funding"]}
          queryFn={() => fetchSection(["funding"])}
        />
      </div>
    </main>
    <Footer />
  </div>
);

export default FundingPage;
