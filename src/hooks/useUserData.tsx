import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export const useUserData = () => {
  const { user } = useAuth();
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recentActivity, setRecentActivity] = useState<ReadingActivity[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch saved articles
  const fetchSavedArticles = useCallback(async () => {
    if (!user) return;

    try {
      // For now, using localStorage as a mock database
      const stored = localStorage.getItem(`saved_articles_${user.id}`);
      if (stored) {
        setSavedArticles(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error fetching saved articles:", error);
    }
  }, [user]);

  // Save article
  const saveArticle = useCallback(async (article: Omit<SavedArticle, "id" | "userId" | "savedAt">) => {
    if (!user) {
      toast.error("Please sign in to save articles");
      return false;
    }

    try {
      const newArticle: SavedArticle = {
        ...article,
        id: `article_${Date.now()}`,
        userId: user.id,
        savedAt: new Date().toISOString(),
      };

      const updated = [...savedArticles, newArticle];
      setSavedArticles(updated);
      localStorage.setItem(`saved_articles_${user.id}`, JSON.stringify(updated));
      
      toast.success("Article saved successfully");
      return true;
    } catch (error) {
      console.error("Error saving article:", error);
      toast.error("Failed to save article");
      return false;
    }
  }, [user, savedArticles]);

  // Remove saved article
  const removeSavedArticle = useCallback(async (articleId: string) => {
    if (!user) return false;

    try {
      const updated = savedArticles.filter(a => a.id !== articleId);
      setSavedArticles(updated);
      localStorage.setItem(`saved_articles_${user.id}`, JSON.stringify(updated));
      
      toast.success("Article removed");
      return true;
    } catch (error) {
      console.error("Error removing article:", error);
      toast.error("Failed to remove article");
      return false;
    }
  }, [user, savedArticles]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (articleId: string) => {
    if (!user) return false;

    try {
      const updated = savedArticles.map(article => 
        article.id === articleId 
          ? { ...article, isFavorite: !article.isFavorite }
          : article
      );
      setSavedArticles(updated);
      localStorage.setItem(`saved_articles_${user.id}`, JSON.stringify(updated));
      
      return true;
    } catch (error) {
      console.error("Error toggling favorite:", error);
      return false;
    }
  }, [user, savedArticles]);

  // Update article notes
  const updateArticleNotes = useCallback(async (articleId: string, notes: string) => {
    if (!user) return false;

    try {
      const updated = savedArticles.map(article => 
        article.id === articleId 
          ? { ...article, notes }
          : article
      );
      setSavedArticles(updated);
      localStorage.setItem(`saved_articles_${user.id}`, JSON.stringify(updated));
      
      toast.success("Notes updated");
      return true;
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error("Failed to update notes");
      return false;
    }
  }, [user, savedArticles]);

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!user) return;

    try {
      const stored = localStorage.getItem(`preferences_${user.id}`);
      if (stored) {
        setPreferences(JSON.parse(stored));
      } else {
        // Set default preferences
        const defaultPrefs: UserPreferences = {
          userId: user.id,
          emailFrequency: "weekly",
          newsletterTopics: ["startups", "funding", "technology"],
          notificationSettings: {
            newArticles: true,
            fundingAlerts: true,
            weeklyDigest: true,
            productUpdates: false,
          },
          displayPreferences: {
            theme: "light",
            compactView: false,
            showImages: true,
          },
        };
        setPreferences(defaultPrefs);
        localStorage.setItem(`preferences_${user.id}`, JSON.stringify(defaultPrefs));
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
    }
  }, [user]);

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!user || !preferences) return false;

    try {
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      localStorage.setItem(`preferences_${user.id}`, JSON.stringify(updated));
      
      toast.success("Preferences updated");
      return true;
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Failed to update preferences");
      return false;
    }
  }, [user, preferences]);

  // Track article view
  const trackArticleView = useCallback(async (activity: Omit<ReadingActivity, "viewedAt">) => {
    if (!user) return;

    try {
      const newActivity: ReadingActivity = {
        ...activity,
        viewedAt: new Date().toISOString(),
      };

      const stored = localStorage.getItem(`activity_${user.id}`);
      const activities = stored ? JSON.parse(stored) : [];
      const updated = [newActivity, ...activities].slice(0, 100); // Keep last 100
      
      setRecentActivity(updated);
      localStorage.setItem(`activity_${user.id}`, JSON.stringify(updated));
    } catch (error) {
      console.error("Error tracking activity:", error);
    }
  }, [user]);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    if (!user) return;

    try {
      const stored = localStorage.getItem(`activity_${user.id}`);
      if (stored) {
        setRecentActivity(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error fetching activity:", error);
    }
  }, [user]);

  // Calculate user stats
  const calculateStats = useCallback(() => {
    if (!user) return;

    try {
      const totalArticlesRead = recentActivity.length;
      const totalTimeSpent = Math.round(recentActivity.reduce((acc, a) => acc + a.timeSpent, 0) / 60);
      
      // Find favorite category
      const categoryCount: Record<string, number> = {};
      recentActivity.forEach(a => {
        categoryCount[a.category] = (categoryCount[a.category] || 0) + 1;
      });
      const favoriteCategory = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "None";

      // Calculate reading streak (simplified)
      const today = new Date();
      const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const articlesThisWeek = recentActivity.filter(a => 
        new Date(a.viewedAt) > oneWeekAgo
      ).length;

      const articlesThisMonth = recentActivity.filter(a => 
        new Date(a.viewedAt) > oneMonthAgo
      ).length;

      // Count unique collections
      const collections = new Set(savedArticles.map(a => a.collection).filter(Boolean));

      setUserStats({
        totalArticlesRead,
        totalTimeSpent,
        favoriteCategory,
        readingStreak: Math.min(7, articlesThisWeek), // Simplified streak
        articlesThisWeek,
        articlesThisMonth,
        savedArticlesCount: savedArticles.length,
        collectionsCount: collections.size,
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
    }
  }, [user, recentActivity, savedArticles]);

  // Clear all user data
  const clearAllData = useCallback(async () => {
    if (!user) return false;

    try {
      localStorage.removeItem(`saved_articles_${user.id}`);
      localStorage.removeItem(`preferences_${user.id}`);
      localStorage.removeItem(`activity_${user.id}`);
      
      setSavedArticles([]);
      setRecentActivity([]);
      setUserStats(null);
      
      toast.success("All data cleared");
      return true;
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Failed to clear data");
      return false;
    }
  }, [user]);

  // Export user data
  const exportUserData = useCallback(() => {
    if (!user) return null;

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
    a.download = `scopedrop_data_${user.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success("Data exported successfully");
    return data;
  }, [user, savedArticles, preferences, recentActivity, userStats]);

  // Initialize data on user change
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchSavedArticles(),
        fetchPreferences(),
        fetchRecentActivity(),
      ]).finally(() => setLoading(false));
    } else {
      setSavedArticles([]);
      setPreferences(null);
      setRecentActivity([]);
      setUserStats(null);
      setLoading(false);
    }
  }, [user, fetchSavedArticles, fetchPreferences, fetchRecentActivity]);

  // Recalculate stats when data changes
  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return {
    // Data
    savedArticles,
    preferences,
    recentActivity,
    userStats,
    loading,
    
    // Article methods
    saveArticle,
    removeSavedArticle,
    toggleFavorite,
    updateArticleNotes,
    
    // Preference methods
    updatePreferences,
    
    // Activity methods
    trackArticleView,
    
    // Utility methods
    clearAllData,
    exportUserData,
    
    // Computed values
    isArticleSaved: (articleId: string) => savedArticles.some(a => a.articleId === articleId),
    getSavedArticlesByCategory: (category: string) => 
      savedArticles.filter(a => a.category === category),
    getSavedArticlesByCollection: (collection: string) => 
      savedArticles.filter(a => a.collection === collection),
    getFavoriteArticles: () => savedArticles.filter(a => a.isFavorite),
  };
};