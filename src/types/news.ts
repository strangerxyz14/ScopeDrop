
export interface NewsArticle {
  id?: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  image?: string;
  publishedAt: string;
  source?: {
    name: string;
    url: string;
  };
  category?: string;
  tags?: string[];
  processedByAI?: boolean;
}

export interface FundingRound {
  id?: string;
  companyName: string;
  amount: string;
  stage: "Seed" | "Series A" | "Series B" | "Series C+" | "Growth" | "IPO";
  investors: string[];
  sector: string;
  region: string;
  date: string;
  logoUrl?: string;
  description?: string;
  url?: string;
}

export interface Event {
  id?: string;
  name: string;
  organizer: string;
  date: string;
  location: string;
  type: "Demo Day" | "Conference" | "Pitch Competition" | "Hackathon" | "Other";
  url?: string;
  description?: string;
  imageUrl?: string;
}

export interface MarketMap {
  id?: string;
  title: string;
  sector: string;
  companyCount: number;
  imageUrl?: string;
  description?: string;
  url?: string;
}

export type FundingStage = "Seed" | "Series A" | "Series B" | "Series C+" | "Growth" | "IPO";
export type NewsType = "Success" | "Funding" | "Acquisition" | "Failure" | "Launch";
export type Region = "North America" | "Europe" | "Asia" | "Africa" | "South America" | "Oceania" | "Global";
export type Sector = 
  | "AI & ML" 
  | "Fintech" 
  | "Health Tech" 
  | "Climate Tech" 
  | "EdTech" 
  | "SaaS" 
  | "E-commerce" 
  | "Crypto" 
  | "Hardware" 
  | "Consumer" 
  | "Enterprise" 
  | "Web3"
  | "Other";

export interface CompanyProfile {
  id: string;
  name: string;
  sector: string;
  region: string;
  description: string;
  foundedYear: number;
  employeeCount: string;
  fundingStage: string;
  totalFunding: string;
  logoUrl: string;
  website: string;
  founders: string[];
  investors: string[];
  url: string;
}
