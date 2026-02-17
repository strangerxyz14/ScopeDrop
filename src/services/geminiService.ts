
import { toast } from "@/components/ui/use-toast";
import { NewsArticle } from "@/types/news";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

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
    if (!API_KEY || API_KEY.trim().length === 0) {
      throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");
    }

    // Build the prompt
    const prompt = `
You are writing for ScopeDrop as a senior business analyst.

Task: Do NOT summarize passively. Perform a **Contrarian Business Analysis**.

Tone and style constraints:
- Elite, neutral, analytical, and data-driven.
- Prioritize strategic implications, unit economics, market structure, and execution risk.
- Avoid vague AI fluff words such as: "transformative", "revolutionizing", "game-changing", "disruptive", "groundbreaking", "paradigm shift".
- If evidence is weak, say so directly.

Output requirements (Markdown only):
- Use clear Markdown headings.
- Must include all sections below in this exact order:
  1) ## Contrarian Business Analysis
  2) ## Hidden Risks
  3) ## The Founder Playbook
  4) ## Official Sources
- "Hidden Risks" must contain concrete downside scenarios (competition, margin pressure, regulation, GTM failure, dependency risk, etc.).
- "The Founder Playbook" must contain exactly **3** numbered, actionable lessons for entrepreneurs.
- "Official Sources" must include 1-2 credible links, favoring primary sources (company site, official release, regulator/government/stat source). Avoid competitor databases.

Original article:
Title: ${article.title}
Description: ${article.description}
Content: ${article.content || article.description}
Source: ${article.source?.name || "Unknown"}
URL: ${article.url || ""}
`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent", {
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
