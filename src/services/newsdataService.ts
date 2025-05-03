
import { toast } from "@/components/ui/use-toast";
import { NewsArticle } from "@/types/news";

interface NewsdataResponse {
  status: string;
  totalResults: number;
  results: NewsdataArticle[];
  nextPage: string;
}

interface NewsdataArticle {
  title: string;
  link: string;
  keywords: string[];
  creator: string[];
  video_url: string | null;
  description: string;
  content: string;
  pubDate: string;
  image_url: string;
  source_id: string;
  source_priority: number;
  country: string[];
  category: string[];
  language: string;
}

// Convert Newsdata.io format to our standard NewsArticle format
const convertToNewsArticle = (article: NewsdataArticle): NewsArticle => {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    url: article.link,
    image: article.image_url,
    publishedAt: article.pubDate,
    source: {
      name: article.source_id,
      url: article.link,
    },
    category: article.category?.[0] || undefined,
    tags: article.keywords,
  };
};

const API_KEY = "pub_841869f9422171931f9f38a5c4aa259c9724d"; // Newsdata.io API key
const MAX_RETRIES = 2;

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
      // Exponential backoff: wait 1s, 2s between retries
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
      return fetchWithRetry<T>(url, options, retries + 1);
    }
    throw error;
  }
}

export async function getStartupNewsBackup(count = 10): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("startup OR funding OR acquisition OR IPO OR Series A OR Series B OR unicorn");
    
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&q=${query}&language=en&size=${count}&category=business,technology&exclude_category=politics,entertainment,sports`;
    
    const data = await fetchWithRetry<NewsdataResponse>(url);
    return data.results.map(convertToNewsArticle);
  } catch (error: any) {
    console.error("Error fetching from Newsdata API:", error);
    toast({
      title: "Error fetching backup news",
      description: error.message || "Failed to load news from backup source",
      variant: "destructive",
    });
    return [];
  }
}

export async function getFundingNewsBackup(count = 6): Promise<NewsArticle[]> {
  try {
    const query = encodeURIComponent("funding OR Series A OR Series B OR venture capital OR startup investment");
    
    const url = `https://newsdata.io/api/1/news?apikey=${API_KEY}&q=${query}&language=en&size=${count}&category=business,technology`;
    
    const data = await fetchWithRetry<NewsdataResponse>(url);
    return data.results.map(convertToNewsArticle);
  } catch (error: any) {
    console.error("Error fetching from Newsdata API:", error);
    return [];
  }
}
