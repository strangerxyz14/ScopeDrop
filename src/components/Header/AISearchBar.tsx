import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Mic, Sparkles, TrendingUp, Brain } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { smartSearchService, SearchSuggestion } from '@/services/smartSearchService';
import { headerAIService, AISearchInsight } from '@/services/headerAIService';
import { headerPerformanceService } from '@/services/headerPerformanceService';
import { Badge } from '@/components/ui/badge';

export const AISearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [aiInsight, setAiInsight] = useState<AISearchInsight | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Smart search suggestions with AI insights
  const fetchSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    if (searchQuery.length < 2) return [];
    
    try {
      const results = await smartSearchService.getSearchSuggestions(searchQuery);
      
      // Generate AI insights for the query
      if (searchQuery.length > 3) {
        const insight = await headerAIService.generateSearchInsights(searchQuery);
        setAiInsight(insight);
        setShowAIInsights(true);
      }
      
      return results;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  };

  // Auto-suggestions
  useEffect(() => {
    if (debouncedQuery.length > 2) {
      setIsLoading(true);
      fetchSuggestions(debouncedQuery).then((results) => {
        setSuggestions(results);
        setIsLoading(false);
      });
    } else {
      setSuggestions([]);
      setAiInsight(null);
      setShowAIInsights(false);
    }
  }, [debouncedQuery]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSuggestionClick(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setSelectedIndex(-1);
      setShowAIInsights(false);
    }
  };

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    const startTime = performance.now();
    setQuery(suggestion.text);
    setIsExpanded(false);
    setSelectedIndex(-1);
    setShowAIInsights(false);
    
    // Track search performance
    await headerPerformanceService.trackSearchPerformance(
      suggestion.text,
      performance.now() - startTime,
      suggestions.length
    );
    
    // Here you would navigate to search results
    console.log('Searching for:', suggestion.text);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'funding': return 'text-green-500';
      case 'ai': return 'text-blue-500';
      case 'acquisition': return 'text-orange-500';
      case 'founder': return 'text-purple-500';
      case 'tech': return 'text-cyan-500';
      default: return 'text-gray-500';
    }
  };

  const getMarketTrendIcon = (trend: string) => {
    switch (trend) {
      case 'rising': return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'falling': return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
      default: return <div className="w-3 h-3" />;
    }
  };

  return (
    <div className="relative">
      <div className={`
        flex items-center bg-white/10 rounded-lg border border-white/20
        transition-all duration-200 ease-in-out
        ${isExpanded ? 'w-96' : 'w-64'}
        hover:border-parrot/50 focus-within:border-parrot/50
      `}>
        <Search className="w-4 h-4 text-white/60 ml-3" />
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Search with AI insights..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsExpanded(true)}
          onKeyDown={handleKeyDown}
          className="
            flex-1 bg-transparent text-white placeholder-white/60
            px-3 py-2 outline-none text-sm
          "
        />
        
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setAiInsight(null);
              setShowAIInsights(false);
            }}
            className="p-1 text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        <button className="p-2 text-white/60 hover:text-white transition-colors">
          <Mic className="w-4 h-4" />
        </button>
      </div>

      {/* AI Insights and Suggestions Dropdown */}
      {isExpanded && (query || suggestions.length > 0 || aiInsight) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-oxford-800 rounded-lg shadow-xl border border-oxford-600 z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-white/60 text-sm flex items-center">
              <div className="w-4 h-4 border-2 border-parrot/60 border-t-transparent rounded-full animate-spin mr-2" />
              Analyzing with AI...
            </div>
          ) : (
            <div className="py-2">
              {/* AI Insights Section */}
              {showAIInsights && aiInsight && (
                <div className="px-4 py-3 border-b border-oxford-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-parrot" />
                    <span className="text-sm font-medium text-white">AI Insights</span>
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(aiInsight.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/60">Category:</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {aiInsight.category}
                      </Badge>
                      {getMarketTrendIcon(aiInsight.marketTrend)}
                    </div>
                    
                    {aiInsight.relatedTopics.length > 0 && (
                      <div>
                        <span className="text-xs text-white/60">Related:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {aiInsight.relatedTopics.slice(0, 3).map((topic, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search Suggestions */}
              {suggestions.length > 0 && (
                <div>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id}
                      className={`
                        w-full px-4 py-3 text-left transition-colors
                        ${index === selectedIndex 
                          ? 'bg-parrot/20 text-parrot' 
                          : 'text-white hover:bg-parrot/10'
                        }
                      `}
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-3 h-3 text-parrot/60" />
                          <span className="text-sm">{suggestion.text}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${getTypeColor(suggestion.type)}`}>
                            {suggestion.type}
                          </span>
                          {suggestion.source === 'trending' && (
                            <Badge variant="secondary" className="text-xs">
                              Trending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* AI Suggested Filters */}
              {aiInsight && aiInsight.suggestedFilters.length > 0 && (
                <div className="px-4 py-3 border-t border-oxford-600">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 text-parrot" />
                    <span className="text-xs text-white/60">Suggested Filters:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {aiInsight.suggestedFilters.map((filter, index) => (
                      <button
                        key={index}
                        className="px-2 py-1 text-xs bg-parrot/20 text-parrot rounded hover:bg-parrot/30 transition-colors"
                        onClick={() => setQuery(`${query} ${filter}`)}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};