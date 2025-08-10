import React, { useState, useMemo } from "react";
import AccountLayout from "@/components/AccountLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUserData } from "@/hooks/useUserData";
import { 
  Bookmark, 
  Search, 
  Filter, 
  FolderPlus, 
  Star, 
  Clock, 
  ExternalLink,
  Trash2,
  Edit,
  Download,
  Grid,
  List,
  SortAsc,
  Tag,
  FileText,
  Heart,
  ChevronRight,
  Plus
} from "lucide-react";
import { Link } from "react-router-dom";

const EnhancedSavedArticles = () => {
  const { 
    savedArticles, 
    removeSavedArticle, 
    toggleFavorite,
    updateArticleNotes,
    loading 
  } = useUserData();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCollection, setSelectedCollection] = useState("all");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "category">("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  // Get unique categories and collections
  const categories = useMemo(() => {
    const cats = new Set(savedArticles.map(a => a.category));
    return Array.from(cats);
  }, [savedArticles]);

  const collections = useMemo(() => {
    const colls = new Set(savedArticles.map(a => a.collection).filter(Boolean));
    return Array.from(colls);
  }, [savedArticles]);

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    let filtered = [...savedArticles];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(article => article.category === selectedCategory);
    }

    // Collection filter
    if (selectedCollection !== "all") {
      if (selectedCollection === "uncategorized") {
        filtered = filtered.filter(article => !article.collection);
      } else {
        filtered = filtered.filter(article => article.collection === selectedCollection);
      }
    }

    // Sort
    switch (sortBy) {
      case "title":
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "category":
        filtered.sort((a, b) => a.category.localeCompare(b.category));
        break;
      case "recent":
      default:
        filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }

    return filtered;
  }, [savedArticles, searchQuery, selectedCategory, selectedCollection, sortBy]);

  // Group articles by collection for tab view
  const articlesByCollection = useMemo(() => {
    const grouped: Record<string, typeof savedArticles> = {
      all: filteredArticles,
      favorites: filteredArticles.filter(a => a.isFavorite),
    };
    
    collections.forEach(collection => {
      grouped[collection] = filteredArticles.filter(a => a.collection === collection);
    });
    
    grouped.uncategorized = filteredArticles.filter(a => !a.collection);
    
    return grouped;
  }, [filteredArticles, collections]);

  const handleEditNotes = (articleId: string, currentNotes: string) => {
    setEditingNotes(articleId);
    setNoteText(currentNotes || "");
  };

  const handleSaveNotes = async () => {
    if (editingNotes) {
      await updateArticleNotes(editingNotes, noteText);
      setEditingNotes(null);
      setNoteText("");
    }
  };

  const exportArticles = () => {
    const data = filteredArticles.map(article => ({
      title: article.title,
      description: article.description,
      url: article.url,
      category: article.category,
      tags: article.tags,
      savedAt: article.savedAt,
      notes: article.notes,
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `saved_articles_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <AccountLayout title="Saved Articles" description="Loading your saved articles...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-gray-200" />
              <CardContent className="h-32 bg-gray-100" />
            </Card>
          ))}
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout 
      title="Saved Articles" 
      description="Your curated collection of startup insights"
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{savedArticles.length}</p>
              <p className="text-xs text-gray-500">Total Saved</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Heart className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{savedArticles.filter(a => a.isFavorite).length}</p>
              <p className="text-xs text-gray-500">Favorites</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{collections.length}</p>
              <p className="text-xs text-gray-500">Collections</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-gray-500">Categories</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search articles, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
            <SelectItem value="category">Category</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={exportArticles}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Collections Tabs */}
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="w-full justify-start flex-wrap h-auto p-1">
          <TabsTrigger value="all">
            All ({articlesByCollection.all?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Heart className="w-3 h-3 mr-1" />
            Favorites ({articlesByCollection.favorites?.length || 0})
          </TabsTrigger>
          {collections.map(collection => (
            <TabsTrigger key={collection} value={collection}>
              {collection} ({articlesByCollection[collection]?.length || 0})
            </TabsTrigger>
          ))}
          <TabsTrigger value="uncategorized">
            Uncategorized ({articlesByCollection.uncategorized?.length || 0})
          </TabsTrigger>
          <Button variant="ghost" size="sm" className="ml-2">
            <Plus className="w-3 h-3 mr-1" />
            New Collection
          </Button>
        </TabsList>

        {Object.entries(articlesByCollection).map(([key, articles]) => (
          <TabsContent key={key} value={key}>
            {articles.length === 0 ? (
              <Card className="p-12">
                <div className="text-center">
                  <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No articles in this collection</p>
                  <Button variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    Browse Articles
                  </Button>
                </div>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleFavorite(article.id)}
                        >
                          <Heart className={`w-4 h-4 ${article.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>
                      <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                      <CardDescription className="line-clamp-2 mt-2">
                        {article.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {article.tags?.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(article.savedAt).toLocaleDateString()}</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => handleEditNotes(article.id, article.notes || "")}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-red-500"
                            onClick={() => removeSavedArticle(article.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {article.category}
                            </Badge>
                            {article.collection && (
                              <Badge variant="secondary" className="text-xs">
                                {article.collection}
                              </Badge>
                            )}
                            {article.isFavorite && (
                              <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                            )}
                          </div>
                          <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
                          <p className="text-gray-600 text-sm mb-3">{article.description}</p>
                          
                          {article.notes && (
                            <div className="bg-gray-50 p-3 rounded-md mb-3">
                              <p className="text-sm text-gray-700">
                                <FileText className="w-3 h-3 inline mr-1" />
                                {article.notes}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(article.savedAt).toLocaleDateString()}
                            </span>
                            <div className="flex gap-1">
                              {article.tags?.map((tag, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 ml-4">
                          <Button variant="outline" size="sm" asChild>
                            <a href={article.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Read
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleFavorite(article.id)}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${article.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                            {article.isFavorite ? 'Unfavorite' : 'Favorite'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditNotes(article.id, article.notes || "")}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Notes
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => removeSavedArticle(article.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingNotes} onOpenChange={() => setEditingNotes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add personal notes or highlights for this article
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your notes here..."
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingNotes(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNotes}>
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AccountLayout>
  );
};

export default EnhancedSavedArticles;