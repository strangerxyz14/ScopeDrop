import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface SavedArticle {
  id: string;
  userId: string;
  articleId: string;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  savedAt: string;
  notes?: string;
  readingProgress?: number;
  isFavorite?: boolean;
  collection?: string;
}

export interface UserPreferences {
  userId: string;
  emailFrequency: "daily" | "weekly" | "monthly" | "never";
  newsletterTopics: string[];
  notificationSettings: {
    newArticles: boolean;
    fundingAlerts: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
  };
  displayPreferences: {
    theme: "light" | "dark" | "auto";
    compactView: boolean;
    showImages: boolean;
  };
}

export interface ReadingActivity {
  articleId: string;
  title: string;
  viewedAt: string;
  timeSpent: number; // in seconds
  scrollDepth: number; // percentage
  category: string;
}

export interface UserStats {
  totalArticlesRead: number;
  totalTimeSpent: number; // in minutes
  favoriteCategory: string;
  readingStreak: number;
  articlesThisWeek: number;
  articlesThisMonth: number;
  savedArticlesCount: number;
  collectionsCount: number;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function firstSourceUrl(sourceUrls: unknown): string | null {
  if (Array.isArray(sourceUrls)) {
    const first = sourceUrls.find((u) => typeof u === "string" && u.trim().length > 0);
    return typeof first === "string" ? first.trim() : null;
  }
  return null;
}

async function resolveArticleId(idOrSlug: string): Promise<string | null> {
  const trimmed = idOrSlug.trim();
  if (!trimmed) return null;
  if (isUuid(trimmed)) return trimmed;

  const { data, error } = await supabase
    .from("articles")
    .select("id")
    .eq("slug", trimmed)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.id ?? null;
}

function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    emailFrequency: "weekly",
    newsletterTopics: ["startups", "funding", "technology"],
    notificationSettings: {
      newArticles: true,
      fundingAlerts: true,
      weeklyDigest: true,
      productUpdates: false,
    },
    displayPreferences: {
      theme: "auto",
      compactView: false,
      showImages: true,
    },
  };
}

export const useUserData = () => {
  const { user } = useAuth();

  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recentActivity, setRecentActivity] = useState<ReadingActivity[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const userId = user?.id ?? null;

  const fetchSavedArticles = useCallback(async () => {
    if (!userId) return;

    const { data: savedRows, error } = await supabase
      .from("user_saved_articles")
      .select("id, article_id, notes, reading_progress, is_favorite, collection, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saved articles:", error);
      setSavedArticles([]);
      return;
    }

    const ids = (savedRows ?? [])
      .map((r: any) => r.article_id)
      .filter((id: any): id is string => typeof id === "string" && id.length > 0);

    const articlesById = new Map<string, any>();
    if (ids.length > 0) {
      const { data: articleRows, error: articleError } = await supabase
        .from("articles")
        .select("id, title, slug, summary, category, source_urls, tags, created_at")
        .in("id", ids);

      if (articleError) {
        console.error("Error fetching saved article details:", articleError);
      } else {
        (articleRows ?? []).forEach((row: any) => {
          if (row?.id) articlesById.set(String(row.id), row);
        });
      }
    }

    const mapped: SavedArticle[] = (savedRows ?? []).map((r: any) => {
      const a = articlesById.get(String(r.article_id)) ?? null;
      const internalPath = a?.slug ? `/article/${a.slug}` : a?.id ? `/article/${a.id}` : "#";
      const sourceUrl = firstSourceUrl(a?.source_urls);
      const tags = Array.isArray(a?.tags) ? a.tags.filter((t: any) => typeof t === "string") : [];

      return {
        id: String(r.id),
        userId,
        articleId: String(r.article_id),
        title: String(a?.title ?? "Untitled"),
        description: String(a?.summary ?? ""),
        url: internalPath || sourceUrl || "#",
        category: String(a?.category ?? "Business"),
        tags,
        savedAt: String(r.created_at ?? new Date().toISOString()),
        notes: typeof r.notes === "string" ? r.notes : undefined,
        readingProgress: typeof r.reading_progress === "number" ? r.reading_progress : undefined,
        isFavorite: Boolean(r.is_favorite),
        collection: typeof r.collection === "string" ? r.collection : undefined,
      };
    });

    setSavedArticles(mapped);
  }, [userId]);

  const saveArticle = useCallback(
    async (article: Omit<SavedArticle, "id" | "userId" | "savedAt">) => {
      if (!userId) {
        toast.error("Please sign in to save articles");
        return false;
      }

      try {
        const resolvedId = await resolveArticleId(article.articleId);
        if (!resolvedId) {
          toast.error("Unable to save: article not found");
          return false;
        }

        const { error } = await supabase
          .from("user_saved_articles")
          .upsert(
            {
              user_id: userId,
              article_id: resolvedId,
              notes: article.notes ?? null,
              reading_progress: article.readingProgress ?? null,
              is_favorite: Boolean(article.isFavorite),
              collection: article.collection ?? null,
            } as any,
            { onConflict: "user_id,article_id" },
          );

        if (error) throw error;
        await fetchSavedArticles();
        toast.success("Article saved");
        return true;
      } catch (e) {
        console.error("Error saving article:", e);
        toast.error("Failed to save article");
        return false;
      }
    },
    [userId, fetchSavedArticles],
  );

  const removeSavedArticle = useCallback(
    async (savedId: string) => {
      if (!userId) return false;
      try {
        const { error } = await supabase
          .from("user_saved_articles")
          .delete()
          .eq("id", savedId)
          .eq("user_id", userId);
        if (error) throw error;
        await fetchSavedArticles();
        toast.success("Saved article removed");
        return true;
      } catch (e) {
        console.error("Error removing saved article:", e);
        toast.error("Failed to remove saved article");
        return false;
      }
    },
    [userId, fetchSavedArticles],
  );

  const toggleFavorite = useCallback(
    async (savedId: string) => {
      if (!userId) return false;
      const current = savedArticles.find((a) => a.id === savedId);
      if (!current) return false;

      try {
        const { error } = await supabase
          .from("user_saved_articles")
          .update({ is_favorite: !Boolean(current.isFavorite) } as any)
          .eq("id", savedId)
          .eq("user_id", userId);
        if (error) throw error;
        await fetchSavedArticles();
        return true;
      } catch (e) {
        console.error("Error toggling favorite:", e);
        return false;
      }
    },
    [userId, savedArticles, fetchSavedArticles],
  );

  const updateArticleNotes = useCallback(
    async (savedId: string, notes: string) => {
      if (!userId) return false;
      try {
        const { error } = await supabase
          .from("user_saved_articles")
          .update({ notes } as any)
          .eq("id", savedId)
          .eq("user_id", userId);
        if (error) throw error;
        await fetchSavedArticles();
        toast.success("Notes updated");
        return true;
      } catch (e) {
        console.error("Error updating notes:", e);
        toast.error("Failed to update notes");
        return false;
      }
    },
    [userId, fetchSavedArticles],
  );

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const defaults = defaultPreferences(userId);
        const { error: insertError } = await supabase.from("user_preferences").insert({
          user_id: userId,
          email_frequency: defaults.emailFrequency,
          newsletter_topics: defaults.newsletterTopics,
          notification_settings: defaults.notificationSettings,
          display_preferences: defaults.displayPreferences,
        } as any);
        if (insertError) throw insertError;
        setPreferences(defaults);
        return;
      }

      setPreferences({
        userId,
        emailFrequency: (data as any).email_frequency ?? "weekly",
        newsletterTopics: Array.isArray((data as any).newsletter_topics) ? (data as any).newsletter_topics : [],
        notificationSettings: ((data as any).notification_settings ?? {}) as any,
        displayPreferences: ((data as any).display_preferences ?? {}) as any,
      });
    } catch (e) {
      console.error("Error fetching preferences:", e);
      setPreferences(defaultPreferences(userId));
    }
  }, [userId]);

  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!userId || !preferences) return false;
      try {
        const next: UserPreferences = {
          ...preferences,
          ...updates,
          notificationSettings: { ...preferences.notificationSettings, ...(updates.notificationSettings ?? {}) },
          displayPreferences: { ...preferences.displayPreferences, ...(updates.displayPreferences ?? {}) },
        };

        const { error } = await supabase
          .from("user_preferences")
          .upsert(
            {
              user_id: userId,
              email_frequency: next.emailFrequency,
              newsletter_topics: next.newsletterTopics,
              notification_settings: next.notificationSettings,
              display_preferences: next.displayPreferences,
            } as any,
            { onConflict: "user_id" },
          );
        if (error) throw error;
        setPreferences(next);
        toast.success("Preferences updated");
        return true;
      } catch (e) {
        console.error("Error updating preferences:", e);
        toast.error("Failed to update preferences");
        return false;
      }
    },
    [userId, preferences],
  );

  const fetchRecentActivity = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("user_reading_activity")
      .select("article_id, viewed_at, time_spent_seconds, scroll_depth")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error fetching reading activity:", error);
      setRecentActivity([]);
      return;
    }

    const activity: ReadingActivity[] = (data ?? []).map((r: any) => ({
      articleId: String(r.article_id ?? ""),
      title: "",
      viewedAt: String(r.viewed_at ?? new Date().toISOString()),
      timeSpent: Number(r.time_spent_seconds ?? 0),
      scrollDepth: Number(r.scroll_depth ?? 0),
      category: "",
    }));

    setRecentActivity(activity);
  }, [userId]);

  const trackArticleView = useCallback(
    async (activity: Omit<ReadingActivity, "viewedAt">) => {
      if (!userId) return;

      try {
        const resolvedId = activity.articleId ? await resolveArticleId(activity.articleId) : null;
        const { error } = await supabase.from("user_reading_activity").insert({
          user_id: userId,
          article_id: resolvedId,
          viewed_at: new Date().toISOString(),
          time_spent_seconds: Math.max(0, Math.floor(activity.timeSpent ?? 0)),
          scroll_depth: Math.max(0, Math.min(100, Math.floor(activity.scrollDepth ?? 0))),
        } as any);
        if (error) throw error;
      } catch (e) {
        console.error("Error tracking reading activity:", e);
      }
    },
    [userId],
  );

  const calculateStats = useCallback(() => {
    if (!userId) return;

    const totalArticlesRead = recentActivity.length;
    const totalTimeSpent = Math.round(recentActivity.reduce((acc, a) => acc + (a.timeSpent || 0), 0) / 60);

    const categoryCount: Record<string, number> = {};
    recentActivity.forEach((a) => {
      const c = a.category || "Unknown";
      categoryCount[c] = (categoryCount[c] || 0) + 1;
    });
    const favoriteCategory = Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0] || "None";

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const articlesThisWeek = recentActivity.filter((a) => new Date(a.viewedAt).getTime() > oneWeekAgo).length;
    const articlesThisMonth = recentActivity.filter((a) => new Date(a.viewedAt).getTime() > oneMonthAgo).length;

    const collections = new Set(savedArticles.map((a) => a.collection).filter(Boolean));

    setUserStats({
      totalArticlesRead,
      totalTimeSpent,
      favoriteCategory,
      readingStreak: Math.min(7, articlesThisWeek),
      articlesThisWeek,
      articlesThisMonth,
      savedArticlesCount: savedArticles.length,
      collectionsCount: collections.size,
    });
  }, [userId, recentActivity, savedArticles]);

  const clearAllData = useCallback(async () => {
    if (!userId) return false;

    try {
      await Promise.all([
        supabase.from("user_saved_articles").delete().eq("user_id", userId),
        supabase.from("user_reading_activity").delete().eq("user_id", userId),
        supabase.from("user_preferences").delete().eq("user_id", userId),
      ]);

      setSavedArticles([]);
      setRecentActivity([]);
      setPreferences(null);
      setUserStats(null);
      toast.success("Account data cleared");
      return true;
    } catch (e) {
      console.error("Error clearing data:", e);
      toast.error("Failed to clear data");
      return false;
    }
  }, [userId]);

  const exportUserData = useCallback(() => {
    if (!userId) return null;

    const data = {
      savedArticles,
      preferences,
      recentActivity,
      userStats,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scopedrop_data_${userId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Data exported");
    return data;
  }, [userId, savedArticles, preferences, recentActivity, userStats]);

  useEffect(() => {
    if (!userId) {
      setSavedArticles([]);
      setPreferences(null);
      setRecentActivity([]);
      setUserStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchSavedArticles(), fetchPreferences(), fetchRecentActivity()]).finally(() => setLoading(false));
  }, [userId, fetchSavedArticles, fetchPreferences, fetchRecentActivity]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  const helpers = useMemo(() => {
    return {
      isArticleSaved: (articleId: string) => savedArticles.some((a) => a.articleId === articleId),
      getSavedArticlesByCategory: (category: string) => savedArticles.filter((a) => a.category === category),
      getSavedArticlesByCollection: (collection: string) => savedArticles.filter((a) => a.collection === collection),
      getFavoriteArticles: () => savedArticles.filter((a) => a.isFavorite),
    };
  }, [savedArticles]);

  return {
    savedArticles,
    preferences,
    recentActivity,
    userStats,
    loading,

    saveArticle,
    removeSavedArticle,
    toggleFavorite,
    updateArticleNotes,
    updatePreferences,
    trackArticleView,
    clearAllData,
    exportUserData,

    ...helpers,
  };
};

