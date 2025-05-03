
import { FundingRound, Event, MarketMap, NewsArticle } from "@/types/news";

// Mock funding rounds data
export const mockFundingRounds: FundingRound[] = [
  {
    companyName: "DataFlow AI",
    amount: "$75M",
    stage: "Series B",
    investors: ["Sequoia Capital", "Andreessen Horowitz", "Y Combinator"],
    sector: "AI & ML",
    region: "North America",
    date: "2025-04-28",
    description: "DataFlow AI raises $75M to expand its machine learning operations platform globally."
  },
  {
    companyName: "GreenTech Solutions",
    amount: "$42M",
    stage: "Series A",
    investors: ["Breakthrough Energy", "Khosla Ventures"],
    sector: "Climate Tech",
    region: "Europe",
    date: "2025-04-26",
    description: "GreenTech Solutions secures funding to scale carbon capture technology."
  },
  {
    companyName: "MediSync",
    amount: "$120M",
    stage: "Series C+",
    investors: ["General Catalyst", "NEA", "GV"],
    sector: "Health Tech",
    region: "North America",
    date: "2025-04-25",
    description: "Healthcare AI platform MediSync raises Series C+ to revolutionize patient care."
  },
  {
    companyName: "FinLeap",
    amount: "$28M",
    stage: "Seed",
    investors: ["Accel", "Index Ventures"],
    sector: "Fintech",
    region: "Europe",
    date: "2025-04-24",
    description: "Banking-as-a-Service startup FinLeap secures seed funding to build next-gen financial infrastructure."
  },
  {
    companyName: "SpaceHarbor",
    amount: "$150M",
    stage: "Series C+",
    investors: ["SpaceX Ventures", "Founders Fund", "Lux Capital"],
    sector: "Hardware",
    region: "North America",
    date: "2025-04-23",
    description: "SpaceHarbor raises $150M to build commercial space stations for research and tourism."
  }
];

// Mock market maps data
export const mockMarketMaps: MarketMap[] = [
  {
    title: "50 AI Startups in Healthcare (2025)",
    sector: "Health Tech",
    companyCount: 50,
    imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "Mapping the companies using artificial intelligence to transform healthcare delivery, diagnostics, and treatment."
  },
  {
    title: "Europe's Top Climate Tech Companies",
    sector: "Climate Tech",
    companyCount: 37,
    imageUrl: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "The most promising European startups tackling climate change through innovative technology solutions."
  },
  {
    title: "Fintech Infrastructure Landscape",
    sector: "Fintech",
    companyCount: 64,
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "Mapping the companies building the backbone of modern financial services."
  },
  {
    title: "The SaaS Growth Stack",
    sector: "SaaS",
    companyCount: 42,
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "Tools and technologies powering the next generation of software companies."
  },
  {
    title: "Web3 & Crypto Infrastructure",
    sector: "Crypto",
    companyCount: 78,
    imageUrl: "https://images.unsplash.com/photo-1639322537504-6427a16b0a28?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "From L1 blockchains to DeFi protocols: mapping the future of decentralized technology."
  }
];

// Mock events data
export const mockEvents: Event[] = [
  {
    name: "Y Combinator Demo Day Spring 2025",
    organizer: "Y Combinator",
    date: "2025-06-15",
    location: "San Francisco, CA",
    type: "Demo Day",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "Presenting the latest batch of innovative startups from Y Combinator's accelerator program."
  },
  {
    name: "Slush 2025",
    organizer: "Slush",
    date: "2025-11-20",
    location: "Helsinki, Finland",
    type: "Conference",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "The world's leading startup event connecting founders with investors, executives, and media."
  },
  {
    name: "TechCrunch Disrupt",
    organizer: "TechCrunch",
    date: "2025-09-12",
    location: "New York, NY",
    type: "Conference",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "TechCrunch's flagship conference celebrating game-changing technologies and disruptive startups."
  },
  {
    name: "Global AI Summit 2025",
    organizer: "AI Alliance",
    date: "2025-07-25",
    location: "Dubai, UAE",
    type: "Conference",
    imageUrl: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    description: "Bringing together AI leaders, researchers, and policymakers to shape the future of artificial intelligence."
  }
];

// Mock news articles
export const mockArticles: NewsArticle[] = [
  {
    title: "How This AI Startup Reached $1B Valuation in Just 18 Months",
    description: "An inside look at the rapid rise of Anthropic and its innovative approach to AI safety.",
    url: "#",
    publishedAt: "2025-04-28T12:30:00Z",
    image: "https://images.unsplash.com/photo-1535378620166-273708d44e4c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2342&q=80",
    source: {
      name: "TechCrunch",
      url: "https://techcrunch.com"
    },
    category: "Success Stories"
  },
  {
    title: "Climate Tech Funding Reaches Record $40B in Q1 2025",
    description: "Investors are pouring unprecedented capital into technologies addressing climate change and sustainability.",
    url: "#",
    publishedAt: "2025-04-27T09:15:00Z",
    image: "https://images.unsplash.com/photo-1569097156542-9029e2aa9f3f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    source: {
      name: "Bloomberg",
      url: "https://bloomberg.com"
    },
    category: "Funding"
  },
  {
    title: "Microsoft Acquires Cybersecurity Startup for $3.5B",
    description: "The tech giant continues its acquisition spree with a major investment in enterprise security.",
    url: "#",
    publishedAt: "2025-04-26T14:45:00Z",
    image: "https://images.unsplash.com/photo-1563986768494-4dee9056b3c9?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    source: {
      name: "Forbes",
      url: "https://forbes.com"
    },
    category: "Acquisitions"
  },
  {
    title: "The Rise and Fall of Once-Promising Health Tech Unicorn",
    description: "How management challenges and regulatory hurdles led to the downfall of a former industry darling.",
    url: "#",
    publishedAt: "2025-04-25T10:20:00Z",
    image: "https://images.unsplash.com/photo-1535320903710-d993d3d77d29?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    source: {
      name: "Wall Street Journal",
      url: "https://wsj.com"
    },
    category: "Failures"
  },
  {
    title: "African Fintech Startups Attract $2B in Investment",
    description: "The continent's financial technology sector is experiencing unprecedented growth and attention from global investors.",
    url: "#",
    publishedAt: "2025-04-24T08:10:00Z",
    image: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    source: {
      name: "Financial Times",
      url: "https://ft.com"
    },
    category: "Global Markets"
  },
  {
    title: "Why VCs Are Betting Big on Enterprise AI Tools",
    description: "A deep dive into the surge of investments in artificial intelligence solutions for business operations.",
    url: "#",
    publishedAt: "2025-04-23T15:30:00Z",
    image: "https://images.unsplash.com/photo-1523961131990-5ea7c61b2107?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2344&q=80",
    source: {
      name: "Wired",
      url: "https://wired.com"
    },
    category: "Venture Capital"
  },
  {
    title: "Tech Giants Race to Acquire AI Startups: What It Means for Innovation",
    description: "As major companies buy up AI talent, questions arise about the impact on independent innovation and competition.",
    url: "#",
    publishedAt: "2025-04-22T13:40:00Z",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2342&q=80",
    source: {
      name: "MIT Technology Review",
      url: "https://technologyreview.com"
    },
    category: "Acquisitions"
  },
  {
    title: "Interview: How This Founder Built a $500M Business Without VC Funding",
    description: "The bootstrapped success story that's challenging conventional wisdom about startup growth trajectories.",
    url: "#",
    publishedAt: "2025-04-21T11:15:00Z",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2340&q=80",
    source: {
      name: "Business Insider",
      url: "https://businessinsider.com"
    },
    category: "Success Stories"
  }
];

// Service functions that simulate API calls
export const getFundingRounds = (count: number = 5): Promise<FundingRound[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockFundingRounds.slice(0, count));
    }, 800);
  });
};

export const getMarketMaps = (count: number = 3): Promise<MarketMap[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockMarketMaps.slice(0, count));
    }, 800);
  });
};

export const getEvents = (count: number = 4): Promise<Event[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockEvents.slice(0, count));
    }, 800);
  });
};

export const getNewsArticles = (count: number = 6): Promise<NewsArticle[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockArticles.slice(0, count));
    }, 800);
  });
};

// Additional helper functions can be added here as needed
