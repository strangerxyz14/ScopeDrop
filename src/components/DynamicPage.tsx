import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSmartContent } from '@/hooks/useSmartContent';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Clock, Database, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import SEO from '@/components/SEO';

interface DynamicPageProps {
  pageType: 'news' | 'funding' | 'events' | 'ai_summary';
  keywords: string[];
  title: string;
  description: string;
  count?: number;
  priority?: 'high' | 'medium' | 'low';
  autoRefresh?: boolean;
  refreshInterval?: number;
  children?: (data: any, state: any) => React.ReactNode;
}

export const DynamicPage: React.FC<DynamicPageProps> = ({
  pageType,
  keywords,
  title,
  description,
  count = 10,
  priority = 'medium',
  autoRefresh = true,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
  children
}) => {
  const params = useParams();
  const location = useLocation();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Smart content hook
  const {
    data,
    isLoading,
    isRefreshing,
    isStale,
    lastUpdated,
    error,
    cacheStatus,
    refresh,
    cacheKey
  } = useSmartContent({
    type: pageType,
    keywords,
    count,
    priority,
    autoRefresh,
    refreshInterval
  });

  // Update last refresh time
  useEffect(() => {
    if (data && !isLoading) {
      setLastRefresh(new Date());
    }
  }, [data, isLoading]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(`Failed to load ${pageType} content: ${error.message}`);
    }
  }, [error, pageType]);

  // Generate dynamic SEO metadata
  const generateSEOMetadata = () => {
    const baseTitle = `${title} - ScopeDrop`;
    const baseDescription = description;
    
    if (data && Array.isArray(data) && data.length > 0) {
      // Dynamic title based on content
      const latestItem = data[0];
      const dynamicTitle = `${latestItem.title || 'Latest'} - ${title} | ScopeDrop`;
      
      // Dynamic description based on content
      const contentSummary = data
        .slice(0, 3)
        .map(item => item.title || item.name)
        .join(', ');
      const dynamicDescription = `${description} Latest: ${contentSummary}`;
      
      return {
        title: dynamicTitle,
        description: dynamicDescription,
        keywords: [...keywords, 'startup', 'news', 'funding', 'tech'].join(', '),
        ogImage: data[0]?.image || '/og-default.jpg',
        ogType: 'article',
        twitterCard: 'summary_large_image'
      };
    }
    
    return {
      title: baseTitle,
      description: baseDescription,
      keywords: keywords.join(', '),
      ogImage: '/og-default.jpg',
      ogType: 'website',
      twitterCard: 'summary'
    };
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  );

  // Error state
  const ErrorState = () => (
    <div className="text-center py-12">
      <div className="text-red-500 mb-4">
        <WifiOff className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Failed to load content</h3>
      <p className="text-muted-foreground mb-4">
        {error?.message || 'Unable to fetch content at this time'}
      </p>
      <Button onClick={() => refresh()} variant="outline">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );

  // Status indicator
  const StatusIndicator = () => (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {cacheStatus === 'hit' && (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Database className="w-3 h-3" />
          Cached
        </Badge>
      )}
      {isStale && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Stale
        </Badge>
      )}
      {isRefreshing && (
        <Badge variant="default" className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Refreshing
        </Badge>
      )}
      {lastUpdated && (
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(lastUpdated).toLocaleTimeString()}
        </span>
      )}
    </div>
  );

  // SEO metadata
  const seoMetadata = generateSEOMetadata();

  return (
    <div className="min-h-screen bg-background">
      {/* Dynamic SEO */}
      <SEO 
        title={seoMetadata.title}
        description={seoMetadata.description}
        keywords={seoMetadata.keywords}
        ogImage={seoMetadata.ogImage}
        ogType={seoMetadata.ogType}
        twitterCard={seoMetadata.twitterCard}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground mt-2">{description}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusIndicator />
              <Button
                onClick={() => refresh()}
                disabled={isRefreshing}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Keywords */}
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <Badge key={index} variant="outline">
                {keyword}
              </Badge>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {isLoading && !data ? (
            <LoadingSkeleton />
          ) : error && !data ? (
            <ErrorState />
          ) : (
            <>
              {/* Content from children function */}
              {children && children(data, {
                isLoading,
                isRefreshing,
                isStale,
                lastUpdated,
                error,
                cacheStatus,
                refresh
              })}
              
              {/* Auto-refresh indicator */}
              {autoRefresh && (
                <div className="text-center text-sm text-muted-foreground mt-8">
                  <div className="flex items-center justify-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Auto-refreshing every {Math.round(refreshInterval / 60000)} minutes
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Predefined page configurations
export const NewsPage: React.FC<{ keywords?: string[]; count?: number }> = ({ 
  keywords = ['startup', 'tech'], 
  count = 20 
}) => (
  <DynamicPage
    pageType="news"
    keywords={keywords}
    title="Startup News"
    description="Latest startup news and insights from the tech ecosystem"
    count={count}
    priority="high"
    autoRefresh={true}
    refreshInterval={5 * 60 * 1000} // 5 minutes
  >
    {(data, state) => (
      <div className="grid gap-6">
        {data?.map((article: any, index: number) => (
          <div key={article.id || index} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
            <p className="text-muted-foreground mb-4">{article.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              <span className="text-blue-600">{article.source?.name}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </DynamicPage>
);

export const FundingPage: React.FC<{ keywords?: string[]; count?: number }> = ({ 
  keywords = ['funding', 'venture capital'], 
  count = 15 
}) => (
  <DynamicPage
    pageType="funding"
    keywords={keywords}
    title="Funding Rounds"
    description="Latest startup funding rounds and investment news"
    count={count}
    priority="high"
    autoRefresh={true}
    refreshInterval={2 * 60 * 60 * 1000} // 2 hours
  >
    {(data, state) => (
      <div className="grid gap-6">
        {data?.map((article: any, index: number) => (
          <div key={article.id || index} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold">{article.title}</h3>
              <Badge variant="default">Funding</Badge>
            </div>
            <p className="text-muted-foreground mb-4">{article.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
              <span className="text-green-600 font-medium">{article.source?.name}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </DynamicPage>
);

export const EventsPage: React.FC<{ keywords?: string[]; count?: number }> = ({ 
  keywords = ['startup events', 'tech conferences'], 
  count = 10 
}) => (
  <DynamicPage
    pageType="events"
    keywords={keywords}
    title="Startup Events"
    description="Upcoming startup events, conferences, and meetups"
    count={count}
    priority="medium"
    autoRefresh={true}
    refreshInterval={12 * 60 * 60 * 1000} // 12 hours
  >
    {(data, state) => (
      <div className="grid gap-6">
        {data?.map((event: any, index: number) => (
          <div key={event.id || index} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-semibold">{event.name}</h3>
              <Badge variant="outline">{event.source}</Badge>
            </div>
            <p className="text-muted-foreground mb-4">{event.location}</p>
            <div className="flex items-center justify-between text-sm">
              <span>{new Date(event.date).toLocaleDateString()}</span>
              <a href={event.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Learn More
              </a>
            </div>
          </div>
        ))}
      </div>
    )}
  </DynamicPage>
);

export const AISummaryPage: React.FC<{ keywords?: string[]; count?: number }> = ({ 
  keywords = ['startup trends', 'tech analysis'], 
  count = 10 
}) => (
  <DynamicPage
    pageType="ai_summary"
    keywords={keywords}
    title="AI-Powered Analysis"
    description="AI-generated insights and analysis of startup trends"
    count={count}
    priority="low"
    autoRefresh={true}
    refreshInterval={24 * 60 * 60 * 1000} // 24 hours
  >
    {(data, state) => (
      <div className="prose prose-lg max-w-none">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">AI Analysis</h3>
          <div className="whitespace-pre-wrap text-muted-foreground">
            {data || 'No analysis available'}
          </div>
        </div>
      </div>
    )}
  </DynamicPage>
);