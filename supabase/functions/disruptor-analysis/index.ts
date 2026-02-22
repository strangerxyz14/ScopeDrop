import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.24.1";

const ALLOWED_ORIGINS = [
  "https://scopedrop.lovable.app",
  "https://id-preview--4acd3d99-4555-4448-bee8-897d547c57c0.lovable.app",
  ...(Deno.env.get("ENVIRONMENT") === "development" ? ["http://localhost:5173", "http://localhost:8080"] : []),
];

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function safeJsonParse<T>(value: string): T {
  const trimmed = value.trim();
  const cleaned = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()
    : trimmed;
  return JSON.parse(cleaned) as T;
}

function buildPrompt(category: string, headline: string, summary: string): string {
  const prompts = {
    "Funding": `
You are a cynical VC analyst. Format like Axios Pro. Focus on burn rate, valuation mechanics, and market reality.
Analyze this funding news:
Headline: ${headline}
Summary: ${summary}

Return JSON with EXACTLY this format:
{"confidence_score": number, "content_html": "semantic HTML with <h2> headers like 'The Money Trail', 'Valuation Reality Check'"}`,
    
    "Business": `
You are a forensic market analyst. Format like Bloomberg Terminal. Focus on macro impact and operational post-mortem.
Analyze this business news:
Headline: ${headline}
Summary: ${summary}

Return JSON with EXACTLY this format:
{"confidence_score": number, "content_html": "semantic HTML with <h2> headers like 'Macro Impact', 'Operational Post-Mortem'"}`,
    
    "Startup": `
You are an enterprise architect. Format like TechCrunch. Focus on market disruption and technical impact.
Analyze this startup news:
Headline: ${headline}
Summary: ${summary}

Return JSON with EXACTLY this format:
{"confidence_score": number, "content_html": "semantic HTML with <h2> headers like 'Market Disruption Alert', 'Technical Impact'"}`
  };

  return prompts[category as keyof typeof prompts] || prompts["Startup"];
}

async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const suffix = Math.abs(Math.random().toString(36).slice(2, 10)).slice(0, 8);
  return `${base}-${suffix}`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const CORS_HEADERS = getCorsHeaders(origin);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or GEMINI_API_KEY.",
        }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Query pending raw signals
    const { data: pendingSignals, error: fetchError } = await supabase
      .from("raw_signals")
      .select("*")
      .eq("status", "pending")
      .limit(2);

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    if (!pendingSignals || pendingSignals.length === 0) {
      return new Response(
        JSON.stringify({ message: "No work to do - queue is empty" }),
        { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const aiClient = new GoogleGenerativeAI(geminiApiKey);
    const model = aiClient.getGenerativeModel({
      model: "gemini-1.5-pro-latest",
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    });

    const processedArticles = [];

    // Process each pending signal
    for (const signal of pendingSignals) {
      try {
        const prompt = buildPrompt(signal.category, signal.headline, signal.summary);
        
        const result = await exponentialBackoff(async () => {
          const generated = await model.generateContent(prompt);
          return generated.response.text();
        });

        const parsed = safeJsonParse<{ confidence_score: number; content_html: string }>(result);
        
        const confidenceScore = Math.max(0, Math.min(1, parsed.confidence_score || 0.5));
        const contentHtml = parsed.content_html || "";

        // Insert into articles table
        const { data: articleData, error: insertError } = await supabase
          .from("articles")
          .insert({
            title: signal.headline,
            slug: slugify(signal.headline),
            content_html: contentHtml,
            summary: signal.summary,
            category: signal.category,
            status: "published",
            source_urls: [signal.source_url],
            ai_analysis_metadata: {
              disruptor: {
                analyzed_at: new Date().toISOString(),
                confidence_score: confidenceScore,
                model: "gemini-1.5-pro-latest",
                source: "worker-queue",
              },
            },
          })
          .select("id")
          .single();

        if (insertError) {
          console.error(`Failed to insert article for signal ${signal.id}:`, insertError);
          continue;
        }

        // Update raw signal status
        await supabase
          .from("raw_signals")
          .update({ status: "published" })
          .eq("id", signal.id);

        processedArticles.push({
          signalId: signal.id,
          articleId: articleData.id,
          confidence: confidenceScore,
        });

      } catch (error) {
        console.error(`Failed to process signal ${signal.id}:`, error);
        
        // Mark as failed to prevent infinite retries
        await supabase
          .from("raw_signals")
          .update({ status: "failed" })
          .eq("id", signal.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedArticles.length,
        articles: processedArticles,
      }),
      { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Worker queue failure",
      }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }
});
