# 🚀 Dynamic Content Generation System Guide

## Overview

Your startup tracker now has a powerful dynamic content generation system that creates realistic, relevant content for every button click and page navigation. This system generates:

- **News Articles** - Funding announcements, product launches, acquisitions, partnerships
- **Funding Rounds** - Series A/B/C rounds with realistic amounts and investors
- **Company Profiles** - Detailed startup information with sectors and metrics
- **Events** - Tech conferences, demo days, pitch competitions
- **Market Maps** - Industry landscape overviews
- **Analytics Data** - Charts and visualizations with real trends

## 🏗️ System Architecture

### 1. Content Generator (`src/services/contentGenerator.ts`)
- **Core Engine**: Generates realistic startup data using templates and pools
- **Smart Templates**: Context-aware content generation
- **Realistic Data**: Uses actual investor names, sectors, and funding amounts

### 2. Enhanced Data Service (`src/services/enhancedDataService.ts`)
- **Caching**: 5-minute cache for performance
- **Page-Specific Content**: Tailored content for each website section
- **Search & Analytics**: Dynamic search results and trend analysis

### 3. Content Hooks (`src/hooks/useContentData.tsx`)
- **React Integration**: Easy-to-use hooks for components
- **Real-time Updates**: Automatic content refresh
- **Error Handling**: Graceful fallbacks and user notifications

## 📋 How to Use in Your Components

### Basic Page Content
```tsx
import { usePageContent } from "@/hooks/useContentData";

const MyPage = () => {
  const { data: content, isLoading } = usePageContent('startups');
  
  return (
    <div>
      {content?.latestNews?.map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
    </div>
  );
};
```

### Search Functionality
```tsx
import { useSearch } from "@/hooks/useContentData";

const SearchPage = () => {
  const { 
    query, 
    results, 
    suggestions, 
    performSearch, 
    loadSuggestions 
  } = useSearch();

  return (
    <div>
      <input 
        onChange={(e) => loadSuggestions(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && performSearch(query)}
      />
      {/* Display results */}
    </div>
  );
};
```

### Sector-Specific Content
```tsx
import { useSectorContent } from "@/hooks/useContentData";

const SectorPage = ({ sector }: { sector: string }) => {
  const { data: content, isLoading } = useSectorContent(sector, 15);
  
  return (
    <div>
      <h1>{sector} Startups</h1>
      {content?.companies?.map(company => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
};
```

## 🎯 Content Types & Usage

### 1. **News Articles**
**Generated Content:**
- Funding announcements
- Product launches
- Acquisitions & partnerships
- Leadership changes
- Market analysis

**Usage:**
```tsx
// Get general news
const articles = await getNewsArticles(10);

// Get category-specific news
const fundingNews = await getNewsArticles(10, 'Funding');
const productLaunches = await getNewsArticles(5, 'Product Launch');
```

### 2. **Funding Rounds**
**Generated Content:**
- Series A/B/C/Seed rounds
- Realistic funding amounts ($1M - $2B+)
- Actual investor names (Sequoia, a16z, etc.)
- Sector and regional data

**Usage:**
```tsx
// Get all funding rounds
const rounds = await getFundingRounds(20);

// Get specific stage
const seriesA = await getFundingRounds(10, 'Series A');
```

### 3. **Company Profiles**
**Generated Content:**
- Company names and descriptions
- Founding year and team size
- Total funding and stage
- Technology sector and location

**Usage:**
```tsx
// Get companies in specific sector
const aiCompanies = await getCompanyProfiles(15, 'AI & ML');
```

### 4. **Events**
**Generated Content:**
- Tech conferences and demo days
- Future dates (next 90 days)
- Realistic venues and organizers
- Event descriptions

### 5. **Market Maps**
**Generated Content:**
- Sector landscape overviews
- Company counts per sector
- Visual market representations

## 🔄 Dynamic Content Features

### Real-Time Updates
```tsx
import { useRealTimeUpdates } from "@/hooks/useContentData";

const MyComponent = () => {
  const { lastUpdate } = useRealTimeUpdates(30000); // 30 seconds
  
  return <div>Last updated: {lastUpdate.toLocaleTimeString()}</div>;
};
```

### Content Refresh
```tsx
import { useContentRefresh } from "@/hooks/useContentData";

const RefreshButton = () => {
  const { refreshContent, isRefreshing } = useContentRefresh();
  
  return (
    <button onClick={() => refreshContent()} disabled={isRefreshing}>
      {isRefreshing ? 'Refreshing...' : 'Refresh Content'}
    </button>
  );
};
```

### Infinite Loading
```tsx
import { useInfiniteContent } from "@/hooks/useContentData";

const InfiniteList = () => {
  const { content, hasMore, loadMore, isLoading } = useInfiniteContent('articles', 10);
  
  return (
    <div>
      {content.map(item => <ItemCard key={item.id} item={item} />)}
      {hasMore && (
        <button onClick={loadMore} disabled={isLoading}>
          Load More
        </button>
      )}
    </div>
  );
};
```

## 📊 Analytics & Visualizations

### Get Analytics Data
```tsx
import { useAnalytics } from "@/hooks/useContentData";

const AnalyticsPage = () => {
  const { data: analytics, isLoading } = useAnalytics();
  
  return (
    <div>
      <DataVisualization fundingData={analytics?.fundingTrends} />
    </div>
  );
};
```

## 🎨 Page-Specific Content Mapping

### Home Page
- **Featured Articles**: Latest funding news
- **Recent Funding**: 8 most recent rounds
- **Upcoming Events**: Next 4 events
- **Market Maps**: 3 sector overviews
- **Trending Topics**: 8 hot topics

### Startups Section
- **Latest News**: Product launches and updates
- **Upcoming Startups**: AI & ML companies
- **Founder Stories**: Leadership articles
- **Exit Stories**: Acquisition news
- **Failures**: Shutdown analysis

### Funding Section
- **Recent Rounds**: 20 latest funding rounds
- **Big Stories**: Rounds >$50M
- **VC Insights**: Market analysis articles
- **Angel Deals**: Seed stage rounds

### Technology Section
- **Tech Stacks**: SaaS company profiles
- **Emerging Tech**: AI & ML developments
- **Growth Hacking**: Growth strategy articles
- **AI/ML**: Comprehensive AI sector content

## 🔧 Implementation Steps

### 1. **Update Existing Pages**
Replace static data calls with dynamic content:

```tsx
// OLD
const { data: articles } = useQuery(['articles'], getStaticArticles);

// NEW
const { data: content } = usePageContent('home');
const articles = content?.featuredArticles || [];
```

### 2. **Add SEO Integration**
```tsx
import SEO from "@/components/SEO";

const MyPage = () => {
  const { data: topics } = useTrendingTopics();
  
  return (
    <>
      <SEO 
        title="My Page Title"
        keywords={["startup", "funding", ...topics]}
      />
      {/* Page content */}
    </>
  );
};
```

### 3. **Implement Search**
```tsx
import AdvancedSearch from "@/components/AdvancedSearch";
import { useSearch } from "@/hooks/useContentData";

const SearchPage = () => {
  const search = useSearch();
  
  return (
    <AdvancedSearch
      onSearch={search.performSearch}
      suggestions={search.suggestions}
      isLoading={search.isLoading}
    />
  );
};
```

### 4. **Add Analytics Dashboard**
```tsx
import DataVisualization from "@/components/DataVisualization";
import { useAnalytics } from "@/hooks/useContentData";

const AnalyticsPage = () => {
  const { data: analytics } = useAnalytics();
  
  return (
    <DataVisualization 
      fundingData={analytics?.fundingTrends}
      className="container mx-auto py-8"
    />
  );
};
```

## 🎯 Button Click Content Examples

### Navigation Menu Items
- **Startups > Latest News**: 15 product launch articles
- **Funding > Recent Rounds**: 20 latest funding rounds
- **Technology > AI & ML**: 20 AI sector companies and articles
- **Events**: 15 upcoming tech events

### Filter Buttons
- **Sector Filters**: Content filtered by AI, Fintech, SaaS, etc.
- **Stage Filters**: Seed, Series A/B/C funding rounds
- **Region Filters**: Silicon Valley, NYC, London, Berlin, etc.

### Action Buttons  
- **"Load More"**: Additional content batches
- **"Refresh"**: Fresh content generation
- **"Search"**: Dynamic search results
- **"View All"**: Extended content lists

## 🚀 Performance Features

- **5-minute caching** for optimal performance
- **Lazy loading** for large content lists
- **Error boundaries** with graceful fallbacks
- **Real-time updates** every 30-60 seconds
- **Infinite scrolling** for seamless browsing

## 📈 Content Quality

All generated content includes:
- ✅ **Realistic company names** and descriptions
- ✅ **Actual investor names** (Sequoia, a16z, etc.)
- ✅ **Market-accurate funding amounts**
- ✅ **Current industry sectors** and trends
- ✅ **Proper dates** and timelines
- ✅ **SEO-optimized** titles and descriptions
- ✅ **Categorized and tagged** content

Your website now provides a rich, dynamic experience where every click reveals fresh, relevant startup ecosystem content! 🎉