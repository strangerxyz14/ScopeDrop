import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import NewsCard from "@/components/NewsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { mapDbArticleToNewsArticle } from "@/services/articlesService";
import type { NewsArticle } from "@/types/news";

type TopicFeedPageProps = {
  title: string;
  description: string;
  /**
   * Used for fuzzy matching against category/title/summary.
   * If omitted, shows latest articles.
   */
  queryTerm?: string;
  heroImage?: string;
};

function matchesTerm(article: NewsArticle, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  const haystack = [
    article.title,
    article.description,
    article.category ?? "",
    ...(article.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(t);
}

const TopicFeedPage = ({ title, description, queryTerm, heroImage }: TopicFeedPageProps) => {
  const term = (queryTerm ?? "").trim();

  const { data, isLoading, error } = useQuery({
    queryKey: ["topic-feed", term],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const mapped = (rows ?? []).map((row: any) => mapDbArticleToNewsArticle(row));
      const filtered = term ? mapped.filter((a) => matchesTerm(a, term)) : mapped;
      return { articles: filtered.slice(0, 30) };
    },
    staleTime: 60_000,
  });

  const articles = (data as any)?.articles ?? [];
  const isEmpty = !isLoading && articles.length === 0;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <SEO
        title={`${title} - ScopeDrop`}
        description={description}
        keywords={[title, "ScopeDrop", "startup intelligence", "venture capital", "business analysis"]}
      />

      <Header />

      <main className="flex-grow">
        <div
          className="bg-gradient-to-r from-oxford to-oxford-400 text-white py-12"
          style={
            heroImage
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(0, 33, 71, 0.92), rgba(0, 33, 71, 0.82)), url(${heroImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{title}</h1>
            <p className="text-blue-100 max-w-2xl">{description}</p>
            {error && (
              <p className="mt-4 text-sm text-red-100">
                Feed error: {(error as any)?.message ?? "failed to load"}
              </p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(9)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full rounded-lg" />
                ))}
            </div>
          ) : isEmpty ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No articles yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <NewsCard
                  key={article.id ?? article.slug ?? index}
                  article={article}
                  articleId={(article.slug ?? article.id ?? `ext-${index}`).toString()}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TopicFeedPage;

