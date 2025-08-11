
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsArticle } from "@/types/news";
import { getNewsArticles } from "@/services/mockDataService";
import NewsCard from "@/components/NewsCard";
import { Search as SearchIcon, Loader } from "lucide-react";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  
  const { data: articles, isLoading } = useQuery({
    queryKey: ['articles', 'search'],
    queryFn: () => getNewsArticles(12),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search delay
    setTimeout(() => {
      setIsSearching(false);
    }, 1000);
  };

  // Simple filtering based on search term - in a real app, this would be a server call
  const filteredArticles = articles ? articles.filter(article => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      article.title.toLowerCase().includes(term) || 
      article.description.toLowerCase().includes(term) ||
      (article.category && article.category.toLowerCase().includes(term)) ||
      (article.source?.name && article.source.name.toLowerCase().includes(term))
    );
  }) : [];
  
  // Further filter by tab categories
  const getTabFilteredArticles = () => {
    if (activeTab === "all") return filteredArticles;
    
    return filteredArticles.filter(article => {
      const category = article.category?.toLowerCase() || "";
      
      switch(activeTab) {
        case "funding":
          return category.includes("funding") || category.includes("venture");
        case "acquisitions":
          return category.includes("acquisition");
        case "success":
          return category.includes("success");
        case "failure":
          return category.includes("failure");
        default:
          return true;
      }
    });
  };

  const displayArticles = getTabFilteredArticles();
  const hasResults = displayArticles.length > 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex-grow">
        {/* Search Header */}
        <div className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-6 text-center">
              Search ElevArc
            </h1>
            
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
                <Input
                  type="text"
                  placeholder="Search for startups, funding news, investors..."
                  className="pl-10 py-6 rounded-md w-full bg-white text-gray-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button 
                type="submit" 
                className="bg-parrot text-oxford hover:bg-parrot-400 transition-colors"
                disabled={isSearching}
              >
                {isSearching ? <Loader className="animate-spin" size={20} /> : "Search"}
              </Button>
            </form>
          </div>
        </div>
        
        {/* Search Results */}
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-center mb-6">
              <TabsList>
                <TabsTrigger value="all">All Results</TabsTrigger>
                <TabsTrigger value="funding">Funding</TabsTrigger>
                <TabsTrigger value="acquisitions">Acquisitions</TabsTrigger>
                <TabsTrigger value="success">Success Stories</TabsTrigger>
                <TabsTrigger value="failure">Failures</TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value={activeTab} className="mt-6">
              {isLoading || isSearching ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="bg-white animate-pulse h-80 rounded-lg shadow"></div>
                  ))}
                </div>
              ) : hasResults ? (
                <>
                  <div className="mb-6 text-gray-600">
                    Found {displayArticles.length} results{searchTerm ? ` for "${searchTerm}"` : ""}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayArticles.map((article, index) => (
                      <NewsCard key={index} article={article} articleId={index} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-gray-500">
                    {searchTerm 
                      ? `No results found for "${searchTerm}". Try different keywords.` 
                      : "Enter a search term to find startup news and insights."}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Search;
