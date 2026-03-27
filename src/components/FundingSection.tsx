import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, DollarSign, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface FundingSectionProps {
  limit?: number;
}

const FundingSection: React.FC<FundingSectionProps> = ({ limit = 6 }) => {
  const { data: fundingArticles, isLoading } = useQuery({
    queryKey: ["funding-articles", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("articles")
        .select("*")
        .eq("category", "funding")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Recently";
    }
  };

  return (
    <section className="py-16 bg-background relative scroll-reveal">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-8 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-parrot/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-parrot" />
            </div>
            <div>
              <h2 className="font-serif text-3xl md:text-4xl tracking-tight">Latest Funding</h2>
              <p className="text-muted-foreground mt-1">Rounds, raises, and runway updates</p>
            </div>
          </div>
          <Button variant="ghost" asChild className="text-sm">
            <Link to="/funding">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {isLoading ? (
            <div className="divide-y divide-border">
              {Array(limit).fill(0).map((_, i) => (
                <div key={i} className="px-6 py-4 animate-pulse flex items-center gap-4">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-4 bg-muted rounded flex-1" />
                  <div className="h-3 bg-muted rounded w-24" />
                </div>
              ))}
            </div>
          ) : fundingArticles && fundingArticles.length > 0 ? (
            <div className="divide-y divide-border">
              {fundingArticles.map((article: any) => (
                <Link
                  key={article.id}
                  to={`/article/${article.id}`}
                  className="px-6 py-4 hover:bg-muted/50 transition-colors group flex items-start gap-4 block"
                >
                  <Badge 
                    variant="outline" 
                    className="text-xs font-mono shrink-0 mt-0.5 min-w-[80px] justify-center bg-parrot/5 border-parrot/20 text-parrot"
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    Funding
                  </Badge>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-parrot transition-colors text-sm md:text-base line-clamp-2">
                      {article.headline}
                    </h3>
                    {article.summary && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-1 hidden md:block">
                        {article.summary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(article.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p>No funding articles yet. Check back soon!</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FundingSection;
