
import { toast } from "@/components/ui/use-toast";
import { NewsArticle } from "@/types/news";

const API_KEY = "AIzaSyDfPJvFdqt8nQvPnCXHqvQ4wyMynV4FkfM"; // Google Gemini API key

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  promptFeedback: {
    safetyRatings: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// Process an article with Gemini API
export async function processArticleWithGemini(article: NewsArticle): Promise<string> {
  try {
    // Build the prompt
    const prompt = `
Rewrite the following article into a professional, plagiarism-free summary suitable for an elite startup business publication.

Maintain authenticity and facts. Write in a neutral, expert tone suitable for startup founders, VCs, and tech executives.

Avoid fluff. Keep paragraphs short and crisp. Mention key data points (e.g., funding amount, country, sector).

Always provide 1-2 *official source links* from the startup's website, press release, or a credible government/stat report.
Never link to competitors like Crunchbase, Pitchbook, Dealroom.

Format the output as markdown with clear sections: **Summary**, **Key Highlights**, **Official Sources**.

Original article:
Title: ${article.title}
Description: ${article.description}
Content: ${article.content || article.description}
Source: ${article.source?.name || "Unknown"}
URL: ${article.url || ""}
`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": API_KEY
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2000,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const data = await response.json() as GeminiResponse;
    const processedText = data.candidates[0]?.content?.parts[0]?.text || "";

    return processedText;
  } catch (error: any) {
    console.error("Error processing article with Gemini:", error);
    toast({
      title: "AI Processing Error",
      description: error.message || "Failed to process article with AI",
      variant: "destructive",
    });
    return "";
  }
}

// Process an array of articles in parallel with rate limiting
export async function batchProcessArticles(articles: NewsArticle[], batchSize = 3, delayMs = 1000): Promise<NewsArticle[]> {
  const processedArticles: NewsArticle[] = [];

  // Process articles in batches to respect rate limits
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (article) => {
      const processedContent = await processArticleWithGemini(article);
      
      if (processedContent) {
        return {
          ...article,
          content: processedContent,
          processedByAI: true
        };
      }
      
      return article;
    });
    
    const results = await Promise.all(batchPromises);
    processedArticles.push(...results);
    
    // Add delay between batches to avoid rate limits
    if (i + batchSize < articles.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return processedArticles;
}
