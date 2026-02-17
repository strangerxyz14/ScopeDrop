import { supabase } from '@/services/enhancedCacheManager';

export interface HeaderSEOData {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogType: string;
  twitterCard: string;
  structuredData: any;
  canonicalUrl: string;
}

export interface NavigationSEO {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  priority: number;
  lastModified: Date;
}

export class HeaderSEOService {
  private static instance: HeaderSEOService;
  private navigationSEO: Map<string, NavigationSEO> = new Map();

  static getInstance(): HeaderSEOService {
    if (!HeaderSEOService.instance) {
      HeaderSEOService.instance = new HeaderSEOService();
    }
    return HeaderSEOService.instance;
  }

  constructor() {
    this.initializeNavigationSEO();
  }

  // Generate SEO data for header
  async generateHeaderSEO(path: string, query?: string): Promise<HeaderSEOData> {
    const baseUrl = window.location.origin;
    const fullPath = query ? `${path}?q=${encodeURIComponent(query)}` : path;

    // Get navigation SEO data
    const navSEO = this.navigationSEO.get(path) || this.getDefaultNavigationSEO(path);

    // Generate dynamic title and description
    const title = query 
      ? `Search Results for "${query}" - ScopeDrop`
      : navSEO.title;

    const description = query
      ? `Find the latest ${query} news, funding rounds, and insights on ScopeDrop.`
      : navSEO.description;

    // Generate structured data
    const structuredData = this.generateStructuredData(path, query);

    return {
      title,
      description,
      keywords: query ? [...navSEO.keywords, query] : navSEO.keywords,
      ogImage: `${baseUrl}/og-image-${path.replace('/', '')}.jpg`,
      ogType: 'website',
      twitterCard: 'summary_large_image',
      structuredData,
      canonicalUrl: `${baseUrl}${fullPath}`
    };
  }

  // Update navigation SEO from Supabase
  async updateNavigationSEO(): Promise<void> {
    try {
      const { data: articles, error } = await supabase
        .from('articles')
        .select('category, title, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching articles for SEO:', error);
        return;
      }

      // Update SEO data based on recent content
      const categoryStats = this.analyzeCategoryStats(articles || []);
      this.updateCategorySEO(categoryStats);
    } catch (error) {
      console.error('Error updating navigation SEO:', error);
    }
  }

  // Generate structured data for search engines
  private generateStructuredData(path: string, query?: string): any {
    const baseUrl = window.location.origin;
    const currentUrl = `${baseUrl}${path}`;

    const baseStructuredData = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "ScopeDrop",
      "description": "Latest startup news, funding rounds, and tech insights",
      "url": baseUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${baseUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    };

    // Add specific structured data based on path
    switch (path) {
      case '/funding':
        return {
          ...baseStructuredData,
          "@type": "CollectionPage",
          "name": "Funding Rounds - ScopeDrop",
          "description": "Latest startup funding rounds, venture capital news, and investment insights",
          "url": currentUrl,
          "mainEntity": {
            "@type": "ItemList",
            "name": "Funding Rounds",
            "description": "Recent startup funding announcements"
          }
        };

      case '/ai-trends':
        return {
          ...baseStructuredData,
          "@type": "CollectionPage",
          "name": "AI Trends - ScopeDrop",
          "description": "Latest AI startup news, machine learning trends, and artificial intelligence insights",
          "url": currentUrl,
          "mainEntity": {
            "@type": "ItemList",
            "name": "AI Trends",
            "description": "Artificial intelligence and machine learning news"
          }
        };

      case '/acquisitions':
        return {
          ...baseStructuredData,
          "@type": "CollectionPage",
          "name": "Acquisitions & IPOs - ScopeDrop",
          "description": "Latest startup acquisitions, mergers, and IPO news",
          "url": currentUrl,
          "mainEntity": {
            "@type": "ItemList",
            "name": "Acquisitions",
            "description": "Startup acquisitions and exit news"
          }
        };

      default:
        return baseStructuredData;
    }
  }

  // Initialize navigation SEO data
  private initializeNavigationSEO(): void {
    this.navigationSEO.set('/funding', {
      path: '/funding',
      title: 'Funding Rounds - Latest Startup Investment News',
      description: 'Track the latest startup funding rounds, venture capital investments, and Series A, B, C funding news. Get insights into startup valuations and investment trends.',
      keywords: ['funding', 'startup funding', 'venture capital', 'series a', 'series b', 'investment', 'startup investment'],
      priority: 0.9,
      lastModified: new Date()
    });

    this.navigationSEO.set('/ai-trends', {
      path: '/ai-trends',
      title: 'AI Trends - Artificial Intelligence Startup News',
      description: 'Stay updated with the latest AI startup news, machine learning trends, and artificial intelligence innovations. Discover emerging AI companies and technologies.',
      keywords: ['ai', 'artificial intelligence', 'machine learning', 'ai startups', 'ml trends', 'ai innovation'],
      priority: 0.9,
      lastModified: new Date()
    });

    this.navigationSEO.set('/acquisitions', {
      path: '/acquisitions',
      title: 'Acquisitions & IPOs - Startup Exit News',
      description: 'Latest startup acquisitions, mergers, and IPO announcements. Track exit strategies and company valuations in the startup ecosystem.',
      keywords: ['acquisitions', 'mergers', 'ipos', 'startup exits', 'company sales', 'exit strategies'],
      priority: 0.8,
      lastModified: new Date()
    });

    this.navigationSEO.set('/founders', {
      path: '/founders',
      title: 'Founder Stories - Startup Leadership Insights',
      description: 'Read inspiring founder stories, CEO interviews, and startup leadership insights. Learn from successful entrepreneurs and their journeys.',
      keywords: ['founders', 'ceo', 'startup founders', 'entrepreneurs', 'leadership', 'founder stories'],
      priority: 0.7,
      lastModified: new Date()
    });

    this.navigationSEO.set('/tech-stacks', {
      path: '/tech-stacks',
      title: 'Tech Stacks - Startup Technology Analysis',
      description: 'Explore startup technology stacks, software choices, and development tools. Analyze what technologies successful startups are using.',
      keywords: ['tech stack', 'technology', 'software', 'development', 'startup tech', 'programming'],
      priority: 0.7,
      lastModified: new Date()
    });
  }

  // Get default navigation SEO for unknown paths
  private getDefaultNavigationSEO(path: string): NavigationSEO {
    return {
      path,
      title: 'ScopeDrop - Startup News & Insights',
      description: 'Latest startup news, funding rounds, and technology insights. Track your favorite companies and discover new opportunities.',
      keywords: ['startup', 'news', 'funding', 'technology', 'innovation'],
      priority: 0.5,
      lastModified: new Date()
    };
  }

  // Analyze category statistics from articles
  private analyzeCategoryStats(articles: any[]): Record<string, any> {
    const stats: Record<string, any> = {};

    articles.forEach(article => {
      const category = article.category || 'general';
      if (!stats[category]) {
        stats[category] = {
          count: 0,
          recentTitles: [],
          keywords: new Set()
        };
      }

      stats[category].count++;
      if (stats[category].recentTitles.length < 5) {
        stats[category].recentTitles.push(article.title);
      }

      if (article.summary) {
        article.summary
          .toLowerCase()
          .split(/\W+/)
          .filter((keyword: string) => keyword.length > 4)
          .slice(0, 12)
          .forEach((keyword: string) => stats[category].keywords.add(keyword));
      }
    });

    return stats;
  }

  // Update category SEO based on recent content
  private updateCategorySEO(categoryStats: Record<string, any>): void {
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const path = `/${category.toLowerCase()}`;
      const existingSEO = this.navigationSEO.get(path);

      if (existingSEO && stats.count > 10) {
        // Update description with recent content
        const recentTopics = stats.recentTitles.slice(0, 3).join(', ');
        const updatedDescription = `Latest ${category} news including: ${recentTopics}. Stay updated with the newest developments.`;

        this.navigationSEO.set(path, {
          ...existingSEO,
          description: updatedDescription,
          keywords: [...existingSEO.keywords, ...Array.from(stats.keywords as Set<string>)],
          lastModified: new Date()
        });
      }
    });
  }

  // Generate sitemap data for navigation
  generateSitemapData(): any[] {
    const sitemapData: any[] = [];

    this.navigationSEO.forEach((seo, path) => {
      sitemapData.push({
        url: `${window.location.origin}${path}`,
        lastModified: seo.lastModified.toISOString(),
        changeFrequency: 'daily',
        priority: seo.priority
      });
    });

    return sitemapData;
  }

  // Generate robots.txt content
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Sitemap
Sitemap: ${window.location.origin}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /private/
Disallow: /api/
`;
  }

  // Generate meta tags for header
  generateMetaTags(seoData: HeaderSEOData): string {
    return `
      <title>${seoData.title}</title>
      <meta name="description" content="${seoData.description}" />
      <meta name="keywords" content="${seoData.keywords.join(', ')}" />
      
      <!-- Open Graph -->
      <meta property="og:title" content="${seoData.title}" />
      <meta property="og:description" content="${seoData.description}" />
      <meta property="og:image" content="${seoData.ogImage}" />
      <meta property="og:type" content="${seoData.ogType}" />
      <meta property="og:url" content="${seoData.canonicalUrl}" />
      
      <!-- Twitter -->
      <meta name="twitter:card" content="${seoData.twitterCard}" />
      <meta name="twitter:title" content="${seoData.title}" />
      <meta name="twitter:description" content="${seoData.description}" />
      <meta name="twitter:image" content="${seoData.ogImage}" />
      
      <!-- Canonical -->
      <link rel="canonical" href="${seoData.canonicalUrl}" />
      
      <!-- Structured Data -->
      <script type="application/ld+json">
        ${JSON.stringify(seoData.structuredData, null, 2)}
      </script>
    `;
  }
}

export const headerSEOService = HeaderSEOService.getInstance();