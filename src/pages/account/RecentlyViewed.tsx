
import React from "react";
import AccountPageTemplate from "@/components/AccountPageTemplate";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { fetchLatestArticles, mapDbArticleToNewsArticle } from "@/services/articlesService";

const RecentlyViewed = () => {
  const { data: articles, isLoading } = useQuery({
    queryKey: ['recentArticles'],
    queryFn: async () => {
      const rows = await fetchLatestArticles(8);
      return rows.map(mapDbArticleToNewsArticle);
    },
  });

  return (
    <AccountPageTemplate
      title="Recently Viewed"
      description="Articles you've recently read or viewed"
    >
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {articles?.map((article, index) => {
            // Generate a random date within the past week
            const randomDate = new Date();
            randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 7));
            
            const isInternal = typeof article.url === "string" && article.url.startsWith("/article/");

            return (
              <div key={article.id ?? article.slug ?? index} className="border-b pb-4 last:border-b-0">
                {isInternal ? (
                  <Link to={article.url} className="block hover:bg-gray-50 -mx-6 px-6 py-2 rounded-md transition-colors">
                    <h3 className="font-bold text-lg mb-1">{article.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Viewed {formatDistanceToNow(randomDate, { addSuffix: true })}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {article.category || "Startup News"}
                      </span>
                    </div>
                  </Link>
                ) : (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-gray-50 -mx-6 px-6 py-2 rounded-md transition-colors"
                  >
                    <h3 className="font-bold text-lg mb-1">{article.title}</h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Viewed {formatDistanceToNow(randomDate, { addSuffix: true })}
                      </span>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {article.category || "Startup News"}
                      </span>
                    </div>
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AccountPageTemplate>
  );
};

export default RecentlyViewed;
