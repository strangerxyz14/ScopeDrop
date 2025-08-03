import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Mic } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { smartSearchService, SearchSuggestion } from '@/services/smartSearchService';
import { headerPerformanceService } from '@/services/headerPerformanceService';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Smart search suggestions with Supabase integration
  const fetchSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    if (searchQuery.length < 2) return [];
    
    try {
      return await smartSearchService.getSearchSuggestions(searchQuery);
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
        setQuery(suggestions[selectedIndex].text);
        setIsExpanded(false);
        setSelectedIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      setSelectedIndex(-1);
    }
  };

  const handleSuggestionClick = async (suggestion: SearchSuggestion) => {
    const startTime = performance.now();
    setQuery(suggestion.text);
    setIsExpanded(false);
    setSelectedIndex(-1);
    
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

  return (
    <div className="relative">
      <div className={`
        flex items-center bg-white/10 rounded-lg border border-white/20
        transition-all duration-200 ease-in-out
        ${isExpanded ? 'w-80' : 'w-64'}
        hover:border-parrot/50 focus-within:border-parrot/50
      `}>
        <Search className="w-4 h-4 text-white/60 ml-3" />
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Search funding, AI, acquisitions..."
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

      {/* Suggestions Dropdown */}
      {isExpanded && (query || suggestions.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-oxford-800 rounded-lg shadow-xl border border-oxford-600 z-50">
          {isLoading ? (
            <div className="p-4 text-white/60 text-sm">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <div className="py-2">
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
                    <span className="text-sm">{suggestion.text}</span>
                    <span className={`text-xs ${getTypeColor(suggestion.type)}`}>
                      {suggestion.type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : query.length > 2 ? (
            <div className="p-4 text-white/60 text-sm">No suggestions found</div>
          ) : null}
        </div>
      )}
    </div>
  );
};