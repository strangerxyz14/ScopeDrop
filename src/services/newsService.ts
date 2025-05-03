import { toast } from "@/components/ui/use-toast";

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: NewsArticle[];
}

interface NewsError {
  status: string;
  code: string;
  message: string;
}

// Error tracking
class ErrorTracker {
  private static errors: {timestamp: Date, error: any, source: string}[] = [];
  private static maxErrors = 100;
  
  static trackError(error: any, source: string) {
    const errorObj = {
      timestamp: new Date(),
      error,
      source
    };
    
    console.error(`[${source}] Error:`, error);
    this.errors.unshift(errorObj);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
    
    // Show toast notification
    toast({
      title: "Error fetching news",
      description: `Failed to load content from ${source}: ${error.message || 'Unknown error'}`,
      variant: "destructive",
    });
  }
  
  static getErrors() {
    return this.errors;
  }
  
  static clearErrors() {
    this.errors = [];
  }
}

const API_KEY = "90e92cf05deecdbbb043dcc040b97c5e"; // GNews API key
const MAX_RETRIES = 3;

async function fetchWithRetry<T>(url: string, options: RequestInit = {}, retries = 0): Promise<T> {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error: any) {
    if (retries < MAX_RETRIES) {
      console.log(`Retry attempt ${retries + 1} for ${url}`);
      // Exponential backoff: wait 1s, 2s, 4s between retries
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      return fetchWithRetry<T>(url, options, retries + 1);
    }
    throw error;
  }
}

export async function getStartupNews(count = 10): Promise<NewsArticle[]> {
  try {
    const sources = ["techcrunch.com", "businessinsider.com", "forbes.com"].join(",");
    const query = encodeURIComponent("startup OR funding OR acquisition OR IPO OR Series A OR Series B OR unicorn");
    
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=us&max=${count}&apikey=${API_KEY}&in=title&sortby=publishedAt&sources=${sources}`;
    
    const data = await fetchWithRetry<GNewsResponse>(url);
    return data.articles;
  } catch (error: any) {
    ErrorTracker.trackError(error, "GNews API");
    return [];
  }
}

export async function getFundingNews(count = 6): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("funding OR Series A OR Series B OR venture capital OR startup investment");
    
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=us&max=${count}&apikey=${API_KEY}&sortby=publishedAt`;
    
    const data = await fetchWithRetry<GNewsResponse>(url);
    return data.articles;
  } catch (error: any) {
    ErrorTracker.trackError(error, "GNews API - Funding");
    return [];
  }
}

export async function getIPONews(count = 6): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("IPO OR initial public offering OR stock market debut OR Nasdaq OR NYSE");
    
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&country=us&max=${count}&apikey=${API_KEY}&sortby=publishedAt`;
    
    const data = await fetchWithRetry<GNewsResponse>(url);
    return data.articles;
  } catch (error: any) {
    ErrorTracker.trackError(error, "GNews API - IPO");
    return [];
  }
}

export function getErrorLog() {
  return ErrorTracker.getErrors();
}

export function clearErrorLog() {
  ErrorTracker.clearErrors();
}
