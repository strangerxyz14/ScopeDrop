import React from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { ArticleGrid } from "@/components/ArticleGrid";
import { supabase } from "@/integrations/supabase/client";

const AcquisitionsPage = () => (
  <div className="flex flex-col min-h-screen">
    <Header />
    <main className="flex-grow">
      <div className="bg-oxford text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <p className="text-xs font-mono text-parrot uppercase tracking-widest mb-3">M&amp;A</p>
          <h1 className="font-serif text-4xl lg:text-5xl font-bold mb-4">Acquisitions</h1>
          <p className="text-white/60 text-lg max-w-xl">
            Who's buying what, and what it means for the ecosystem
          </p>
        </div>
      </div>
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <ArticleGrid
          queryKey={["articles-acquisitions"]}
          queryFn={async () => {
            const { data, error } = await supabase
              .from("articles")
              .select("*")
              .eq("category", "acquisitions")
              .order("created_at", { ascending: false })
              .limit(12);
            if (error) throw error;
            return data ?? [];
          }}
        />
      </div>
    </main>
    <Footer />
  </div>
);

export default AcquisitionsPage;
