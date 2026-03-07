import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Tag, RefreshCw, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export interface ArticleGridProps {
  queryKey: string[];
  queryFn: () => Promise<any[]>;
  emptyMessage?: string;
}

function ArticleCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export const ArticleGrid: React.FC<ArticleGridProps> = ({
  queryKey,
  queryFn,
  emptyMessage = "Fresh intelligence incoming — check back in a few minutes",
}) => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    retry: 2,
  });

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array(6).fill(0).map((_, i) => <ArticleCardSkeleton key={i} />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-muted-foreground">Failed to load articles.</p>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <Clock className="w-5 h-5 text-muted-foreground/40" />
        </div>
        <p className="text-muted-foreground max-w-xs">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {data.map((article: any) => {
        const tags: string[] = Array.isArray(article.tags) ? article.tags : [];
        return (
          <Link
            key={article.id}
            to={`/article/${article.id}`}
            className="group rounded-lg border bg-card p-5 space-y-3 hover:border-primary/40 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              {article.category && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  {article.category}
                </Badge>
              )}
              {article.read_time_minutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {article.read_time_minutes}m
                </span>
              )}
            </div>
            <h3 className="font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-3">
              {article.headline ?? "Untitled"}
            </h3>
            {article.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2">{article.summary}</p>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tags.slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground/60">
              {formatDate(article.created_at)}
            </p>
          </Link>
        );
      })}
    </div>
  );
};

export default ArticleGrid;
