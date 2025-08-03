import { NewsArticle, FundingRound, Event, MarketMap, CompanyProfile } from "@/types/news";

// Realistic startup data pools
const COMPANY_NAMES = [
  "TechFlow", "DataVault", "CloudNinja", "AICore", "DevStream", "CodeCraft", "InnovateLab",
  "QuantumLeap", "NexusAI", "CyberForge", "SmartGrid", "BlockChain", "DeepMind", "RoboTech",
  "GreenTech", "BioInnovate", "HealthTech", "EduCore", "FinanceFlow", "RetailBot", "FoodTech",
  "TravelSmart", "LogiFlow", "SecureNet", "GameForge", "MediaStream", "SocialHub", "WorkFlow",
  "MobileFirst", "WebCraft", "AppForge", "DataMine", "CloudBridge", "TechNova", "InnoCore"
];

const SECTORS = [
  "AI & ML", "Fintech", "Health Tech", "Climate Tech", "EdTech", "SaaS", "E-commerce", 
  "Crypto", "Hardware", "Consumer", "Enterprise", "Web3", "Gaming", "Media", "Transportation"
];

const REGIONS = [
  "San Francisco", "New York", "London", "Berlin", "Singapore", "Toronto", "Austin", 
  "Boston", "Seattle", "Los Angeles", "Tel Aviv", "Amsterdam", "Stockholm", "Paris", "Tokyo"
];

const FUNDING_STAGES = ["Seed", "Series A", "Series B", "Series C+", "Growth", "IPO"];

const INVESTORS = [
  "Sequoia Capital", "Andreessen Horowitz", "Kleiner Perkins", "Accel Partners", "Index Ventures",
  "Greylock Partners", "Bessemer Venture Partners", "General Catalyst", "NEA", "Lightspeed Venture",
  "Founders Fund", "GV (Google Ventures)", "Intel Capital", "Microsoft Ventures", "Amazon Alexa Fund",
  "Y Combinator", "Techstars", "500 Startups", "First Round Capital", "Union Square Ventures"
];

const NEWS_CATEGORIES = [
  "Funding", "Product Launch", "Acquisition", "Partnership", "Expansion", "Leadership", 
  "Awards", "Research", "Market Analysis", "IPO", "Merger", "Pivot", "Shutdown"
];

const ARTICLE_TEMPLATES = {
  funding: [
    "{company} raises ${amount} in {stage} funding led by {investor}",
    "{company} secures ${amount} {stage} round to expand {sector} operations",
    "{investor} leads ${amount} {stage} investment in {company}",
    "{company} closes ${amount} funding round to accelerate growth in {region}"
  ],
  launch: [
    "{company} launches revolutionary {sector} platform",
    "{company} unveils new AI-powered solution for {sector}",
    "{company} introduces game-changing {sector} technology",
    "{company} debuts innovative platform targeting {sector} market"
  ],
  acquisition: [
    "{company} acquires {target} to strengthen {sector} offering",
    "Major {sector} acquisition: {company} buys {target} for ${amount}",
    "{company} expands through strategic acquisition of {target}",
    "{acquirer} announces ${amount} acquisition of {sector} startup {company}"
  ],
  partnership: [
    "{company} partners with {partner} to revolutionize {sector}",
    "Strategic partnership: {company} and {partner} join forces",
    "{company} announces major collaboration with {partner}",
    "{partner} integrates with {company} to enhance {sector} solutions"
  ]
};

const COMPANY_DESCRIPTIONS = [
  "Building the future of {sector} with cutting-edge AI technology",
  "Revolutionizing {sector} through innovative software solutions",
  "Empowering businesses with next-generation {sector} tools",
  "Creating seamless {sector} experiences for modern enterprises",
  "Transforming {sector} with data-driven insights and automation",
  "Developing breakthrough {sector} technology for global markets",
  "Pioneering sustainable {sector} solutions for tomorrow's challenges",
  "Connecting {sector} ecosystems through intelligent platforms"
];

class ContentGenerator {
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private getRandomAmount(): string {
    const amounts = [
      "1.2M", "2.5M", "5M", "8.3M", "12M", "15M", "25M", "40M", "75M", "100M", 
      "150M", "250M", "500M", "1B", "1.5B", "2.3B"
    ];
    return this.getRandomItem(amounts);
  }

  private getRandomDate(daysBack: number = 30): string {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * daysBack));
    return date.toISOString();
  }

  private generateCompanyName(): string {
    return this.getRandomItem(COMPANY_NAMES);
  }

  private generateArticleContent(template: string, data: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || match;
    });
  }

  // Generate News Articles
  generateNewsArticles(count: number = 10, category?: string): NewsArticle[] {
    const articles: NewsArticle[] = [];
    
    for (let i = 0; i < count; i++) {
      const articleCategory = category || this.getRandomItem(NEWS_CATEGORIES);
      const company = this.generateCompanyName();
      const sector = this.getRandomItem(SECTORS);
      const region = this.getRandomItem(REGIONS);
      const amount = this.getRandomAmount();
      const investor = this.getRandomItem(INVESTORS);
      const stage = this.getRandomItem(FUNDING_STAGES);
      
      let template: string;
      let title: string;
      
      switch (articleCategory.toLowerCase()) {
        case 'funding':
          template = this.getRandomItem(ARTICLE_TEMPLATES.funding);
          title = this.generateArticleContent(template, { company, amount, stage, investor, sector, region });
          break;
        case 'product launch':
          template = this.getRandomItem(ARTICLE_TEMPLATES.launch);
          title = this.generateArticleContent(template, { company, sector });
          break;
        case 'acquisition': {
          template = this.getRandomItem(ARTICLE_TEMPLATES.acquisition);
          const target = this.generateCompanyName();
          const acquirer = this.generateCompanyName();
          title = this.generateArticleContent(template, { company, target, acquirer, amount, sector });
          break;
        }
        case 'partnership': {
          template = this.getRandomItem(ARTICLE_TEMPLATES.partnership);
          const partner = this.generateCompanyName();
          title = this.generateArticleContent(template, { company, partner, sector });
          break;
        }
        default:
          title = `${company} makes significant breakthrough in ${sector} technology`;
      }

      const description = this.getRandomItem(COMPANY_DESCRIPTIONS).replace('{sector}', sector);
      
      articles.push({
        id: `article-${i + 1}`,
        title,
        description: `${description}. This development could reshape the ${sector} landscape and create new opportunities for innovation.`,
        content: this.generateFullArticleContent(title, company, sector, region),
        url: `/article/article-${i + 1}`,
        image: `https://picsum.photos/800/400?random=${i + 1}`,
        publishedAt: this.getRandomDate(30),
        source: {
          name: this.getRandomItem(["TechCrunch", "VentureBeat", "The Information", "Forbes", "Bloomberg"]),
          url: "https://example.com"
        },
        category: articleCategory,
        tags: [sector, region, "startup", "technology"],
        processedByAI: Math.random() > 0.3
      });
    }
    
    return articles;
  }

  // Generate Funding Rounds
  generateFundingRounds(count: number = 10, stage?: string): FundingRound[] {
    const rounds: FundingRound[] = [];
    
    for (let i = 0; i < count; i++) {
      const company = this.generateCompanyName();
      const sector = this.getRandomItem(SECTORS);
      const region = this.getRandomItem(REGIONS);
      const fundingStage = stage || this.getRandomItem(FUNDING_STAGES);
      const amount = this.getRandomAmount();
      const investorCount = Math.floor(Math.random() * 5) + 1;
      const selectedInvestors = [];
      
      for (let j = 0; j < investorCount; j++) {
        const investor = this.getRandomItem(INVESTORS);
        if (!selectedInvestors.includes(investor)) {
          selectedInvestors.push(investor);
        }
      }
      
      rounds.push({
        id: `funding-${i + 1}`,
        companyName: company,
        amount: `$${amount}`,
        stage: fundingStage as any,
        investors: selectedInvestors,
        sector,
        region,
        date: this.getRandomDate(60),
        logoUrl: `https://picsum.photos/100/100?random=${i + 100}`,
        description: this.getRandomItem(COMPANY_DESCRIPTIONS).replace('{sector}', sector),
        url: `/funding/funding-${i + 1}`
      });
    }
    
    return rounds;
  }

  // Generate Events
  generateEvents(count: number = 8): Event[] {
    const events: Event[] = [];
    const eventTypes = ["Demo Day", "Conference", "Pitch Competition", "Hackathon", "Other"];
    const eventNames = [
      "TechCrunch Disrupt", "Startup Grind", "Web Summit", "SXSW", "CES", "Y Combinator Demo Day",
      "Slush", "Rise Conference", "Collision", "TechStars Demo Day", "500 Startups Demo Day",
      "Startup Weekend", "AngelPad Demo Day", "Techstars Startup Week"
    ];
    
    for (let i = 0; i < count; i++) {
      const eventName = this.getRandomItem(eventNames);
      const region = this.getRandomItem(REGIONS);
      const type = this.getRandomItem(eventTypes);
      const organizer = this.getRandomItem(["TechCrunch", "Startup Grind", "Web Summit", "SXSW", "Techstars"]);
      
      // Generate future dates for events
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 90) + 1);
      
      events.push({
        id: `event-${i + 1}`,
        name: `${eventName} ${region} 2024`,
        organizer,
        date: futureDate.toISOString(),
        location: `${region}, ${this.getRandomItem(["Convention Center", "Tech Hub", "Innovation District", "Downtown Arena"])}`,
        type: type as any,
        url: `/events/event-${i + 1}`,
        description: `Join us for an exciting ${type.toLowerCase()} featuring the latest innovations in technology and startups. Network with entrepreneurs, investors, and industry leaders.`,
        imageUrl: `https://picsum.photos/600/300?random=${i + 200}`
      });
    }
    
    return events;
  }

  // Generate Market Maps
  generateMarketMaps(count: number = 6): MarketMap[] {
    const maps: MarketMap[] = [];
    
    for (let i = 0; i < count; i++) {
      const sector = this.getRandomItem(SECTORS);
      const companyCount = Math.floor(Math.random() * 150) + 50;
      
      maps.push({
        id: `market-${i + 1}`,
        title: `${sector} Landscape 2024`,
        sector,
        companyCount,
        imageUrl: `https://picsum.photos/800/600?random=${i + 300}`,
        description: `Comprehensive overview of the ${sector} ecosystem, featuring ${companyCount} companies across various stages and sub-sectors.`,
        url: `/market-maps/market-${i + 1}`
      });
    }
    
    return maps;
  }

  // Generate content for specific sectors
  generateSectorContent(sector: string, count: number = 10) {
    return {
      articles: this.generateNewsArticles(count).filter(article => 
        article.tags?.includes(sector) || article.category === sector
      ),
      funding: this.generateFundingRounds(count).filter(funding => 
        funding.sector === sector
      ),
      companies: this.generateCompanyProfiles(count, sector)
    };
  }

  // Generate company profiles
  generateCompanyProfiles(count: number = 10, sector?: string): CompanyProfile[] {
    const profiles = [];
    
    for (let i = 0; i < count; i++) {
      const company = this.generateCompanyName();
      const companySector = sector || this.getRandomItem(SECTORS);
      const region = this.getRandomItem(REGIONS);
      const foundedYear = 2015 + Math.floor(Math.random() * 9);
      const employeeCount = Math.floor(Math.random() * 500) + 10;
      const totalFunding = this.getRandomAmount();
      
      profiles.push({
        id: `company-${i + 1}`,
        name: company,
        sector: companySector,
        description: this.getRandomItem(COMPANY_DESCRIPTIONS).replace('{sector}', companySector),
        founded: foundedYear,
        location: region,
        employees: `${employeeCount}+`,
        totalFunding: `$${totalFunding}`,
        stage: this.getRandomItem(FUNDING_STAGES),
        logo: `https://picsum.photos/150/150?random=${i + 400}`,
        website: `https://${company.toLowerCase().replace(/\s+/g, '')}.com`,
        tags: [companySector, region, "B2B", "SaaS"],
        lastFunding: this.getRandomDate(180),
        investors: [this.getRandomItem(INVESTORS), this.getRandomItem(INVESTORS)]
      });
    }
    
    return profiles;
  }

  // Generate full article content
  private generateFullArticleContent(title: string, company: string, sector: string, region: string): string {
    return `
# ${title}

${company}, a leading ${sector} startup based in ${region}, has made significant strides in the industry with their innovative approach to solving complex challenges.

## Key Highlights

- **Innovation Focus**: The company specializes in cutting-edge ${sector} technology
- **Market Position**: Strong presence in the ${region} market with expansion plans
- **Technology Stack**: Leveraging AI, machine learning, and cloud infrastructure
- **Team Growth**: Rapidly expanding team of industry experts

## Market Impact

The ${sector} industry has seen tremendous growth in recent years, with companies like ${company} leading the charge in innovation. This development represents a significant milestone for the company and the broader ${sector} ecosystem.

## Future Outlook

Industry analysts predict continued growth in the ${sector} space, with ${company} well-positioned to capitalize on emerging opportunities. The company's focus on innovation and customer-centric solutions positions them for long-term success.

*This article was generated based on the latest industry trends and company developments.*
    `.trim();
  }

  // Generate trending topics
  generateTrendingTopics(): string[] {
    const topics = [
      "AI Startups", "Climate Tech", "Fintech Innovation", "Remote Work Tools",
      "Healthcare AI", "EdTech Growth", "Crypto Adoption", "SaaS Expansion",
      "Green Energy", "Food Tech", "PropTech", "Gaming Platforms",
      "Cybersecurity", "IoT Solutions", "Blockchain Apps", "AR/VR Tech"
    ];
    
    return topics.sort(() => Math.random() - 0.5).slice(0, 8);
  }

  // Generate search suggestions
  generateSearchSuggestions(query: string = ""): string[] {
    const allSuggestions = [
      ...COMPANY_NAMES,
      ...SECTORS,
      ...INVESTORS,
      "Series A funding", "Seed round", "IPO", "Acquisition", "Partnership",
      "AI startup", "SaaS company", "Fintech news", "Climate tech funding"
    ];
    
    if (!query) {
      return allSuggestions.slice(0, 10);
    }
    
    return allSuggestions
      .filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 8);
  }
}

// Export singleton instance
export const contentGenerator = new ContentGenerator();

// Export individual functions for specific use cases
export const generateNewsArticles = (count?: number, category?: string) => 
  contentGenerator.generateNewsArticles(count, category);

export const generateFundingRounds = (count?: number, stage?: string) => 
  contentGenerator.generateFundingRounds(count, stage);

export const generateEvents = (count?: number) => 
  contentGenerator.generateEvents(count);

export const generateMarketMaps = (count?: number) => 
  contentGenerator.generateMarketMaps(count);

export const generateSectorContent = (sector: string, count?: number) => 
  contentGenerator.generateSectorContent(sector, count);

export const generateCompanyProfiles = (count?: number, sector?: string) => 
  contentGenerator.generateCompanyProfiles(count, sector);

export const generateTrendingTopics = () => 
  contentGenerator.generateTrendingTopics();

export const generateSearchSuggestions = (query?: string) => 
  contentGenerator.generateSearchSuggestions(query);

export default contentGenerator;