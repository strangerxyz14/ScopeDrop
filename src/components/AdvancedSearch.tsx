import React, { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Filter, 
  X, 
  Clock, 
  TrendingUp, 
  Calendar,
  MapPin,
  DollarSign,
  Building,
  Tag
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FundingStage, Sector, Region } from "@/types/news";

interface SearchFilters {
  sectors: Sector[];
  regions: Region[];
  fundingStages: FundingStage[];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  amountRange: {
    min?: number;
    max?: number;
  };
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  suggestions?: string[];
  isLoading?: boolean;
  className?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  suggestions = [],
  isLoading = false,
  className
}) => {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>({
    sectors: [],
    regions: [],
    fundingStages: [],
    dateRange: {},
    amountRange: {}
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeFilters, setActiveFilters] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from sessionStorage (avoid persistent localStorage)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("searchHistory");
      if (saved) setSearchHistory(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Save search history to sessionStorage
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
    setSearchHistory(newHistory);
    try {
      sessionStorage.setItem("searchHistory", JSON.stringify(newHistory));
    } catch {
      // ignore
    }
  };

  // Count active filters
  useEffect(() => {
    const count = filters.sectors.length + 
                 filters.regions.length + 
                 filters.fundingStages.length +
                 (filters.dateRange.from ? 1 : 0) +
                 (filters.amountRange.min ? 1 : 0);
    setActiveFilters(count);
  }, [filters]);

  // Filter suggestions based on query
  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    return suggestions.filter(s => 
      s.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
  }, [query, suggestions]);

  const handleSearch = () => {
    if (query.trim()) {
      saveToHistory(query);
      onSearch(query, filters);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({
      sectors: [],
      regions: [],
      fundingStages: [],
      dateRange: {},
      amountRange: {}
    });
  };

  const removeFilter = (type: keyof SearchFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [type]: Array.isArray(prev[type]) 
        ? (prev[type] as any[]).filter(item => item !== value)
        : {}
    }));
  };

  const sectors: Sector[] = [
    "AI & ML", "Fintech", "Health Tech", "Climate Tech", "EdTech", 
    "SaaS", "E-commerce", "Crypto", "Hardware", "Consumer", "Enterprise", "Web3"
  ];

  const regions: Region[] = [
    "North America", "Europe", "Asia", "Africa", "South America", "Oceania", "Global"
  ];

  const fundingStages: FundingStage[] = [
    "Seed", "Series A", "Series B", "Series C+", "Growth", "IPO"
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search startups, companies, or keywords..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="pl-10 pr-12"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery("")}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && (filteredSuggestions.length > 0 || searchHistory.length > 0) && (
          <Card className="absolute top-full left-0 right-0 z-50 mt-1">
            <CardContent className="p-2">
              {filteredSuggestions.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                    <TrendingUp className="w-3 h-3" />
                    Suggestions
                  </div>
                  {filteredSuggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full justify-start text-left h-8"
                    >
                      <Search className="w-3 h-3 mr-2" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              )}

              {searchHistory.length > 0 && (
                <>
                  {filteredSuggestions.length > 0 && <Separator className="my-2" />}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-2 py-1">
                      <Clock className="w-3 h-3" />
                      Recent Searches
                    </div>
                    {searchHistory.slice(0, 5).map((item, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQuery(item);
                          setShowSuggestions(false);
                        }}
                        className="w-full justify-start text-left h-8"
                      >
                        <Clock className="w-3 h-3 mr-2" />
                        {item}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Search Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={handleSearch} disabled={isLoading}>
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Search Filters</h4>
                {activeFilters > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                )}
              </div>

              {/* Sectors Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Sectors
                </Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {sectors.map((sector) => (
                      <div key={sector} className="flex items-center space-x-2">
                        <Checkbox
                          id={`sector-${sector}`}
                          checked={filters.sectors.includes(sector)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              sectors: checked
                                ? [...prev.sectors, sector]
                                : prev.sectors.filter(s => s !== sector)
                            }));
                          }}
                        />
                        <Label htmlFor={`sector-${sector}`} className="text-sm">
                          {sector}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Regions Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Regions
                </Label>
                <ScrollArea className="h-32">
                  <div className="space-y-2">
                    {regions.map((region) => (
                      <div key={region} className="flex items-center space-x-2">
                        <Checkbox
                          id={`region-${region}`}
                          checked={filters.regions.includes(region)}
                          onCheckedChange={(checked) => {
                            setFilters(prev => ({
                              ...prev,
                              regions: checked
                                ? [...prev.regions, region]
                                : prev.regions.filter(r => r !== region)
                            }));
                          }}
                        />
                        <Label htmlFor={`region-${region}`} className="text-sm">
                          {region}
                        </Label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              {/* Funding Stages Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Funding Stages
                </Label>
                <div className="space-y-2">
                  {fundingStages.map((stage) => (
                    <div key={stage} className="flex items-center space-x-2">
                      <Checkbox
                        id={`stage-${stage}`}
                        checked={filters.fundingStages.includes(stage)}
                        onCheckedChange={(checked) => {
                          setFilters(prev => ({
                            ...prev,
                            fundingStages: checked
                              ? [...prev.fundingStages, stage]
                              : prev.fundingStages.filter(s => s !== stage)
                          }));
                        }}
                      />
                      <Label htmlFor={`stage-${stage}`} className="text-sm">
                        {stage}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFilters > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.sectors.map((sector) => (
            <Badge key={sector} variant="secondary" className="gap-1">
              <Building className="w-3 h-3" />
              {sector}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter("sectors", sector)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {filters.regions.map((region) => (
            <Badge key={region} variant="secondary" className="gap-1">
              <MapPin className="w-3 h-3" />
              {region}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter("regions", region)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
          {filters.fundingStages.map((stage) => (
            <Badge key={stage} variant="secondary" className="gap-1">
              <DollarSign className="w-3 h-3" />
              {stage}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter("fundingStages", stage)}
                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
              >
                <X className="w-3 h-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;