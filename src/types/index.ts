// Centralized TypeScript type definitions for ScopeDrop

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// News Article Types
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date;
  sourceName: string;
  category: string;
  tags: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevance: number;
  views?: number;
  shares?: number;
}

// Funding Round Types
export interface FundingRound {
  id: string;
  companyName: string;
  amount: string;
  currency: string;
  stage: string;
  investors: string[];
  date: Date;
  description: string;
  sourceUrl: string;
  category: string;
  location?: string;
  valuation?: string;
}

// Event Types
export interface Event {
  id: string;
  name: string;
  description: string;
  date: Date;
  location: string;
  organizer: string;
  url: string;
  category: string;
  attendees?: number;
  price?: string;
  virtual?: boolean;
}

// Market Map Types
export interface MarketMap {
  id: string;
  title: string;
  description: string;
  category: string;
  companies: string[];
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Search Types
export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'funding' | 'ai' | 'acquisition' | 'founder' | 'tech';
  relevance: number;
  source: string;
  timestamp: Date;
}

export interface SearchResult {
  query: string;
  results: NewsArticle[];
  totalResults: number;
  searchTime: number;
  suggestions: SearchSuggestion[];
}

// AI Types
export interface AISearchInsight {
  id: string;
  query: string;
  category: string;
  confidence: number;
  relatedTopics: string[];
  suggestedFilters: string[];
  marketTrend: 'rising' | 'falling' | 'stable';
  timestamp: Date;
}

export interface AINavigationSuggestion {
  id: string;
  path: string;
  reason: string;
  confidence: number;
  userBehavior: string[];
  marketContext: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AIContentCategorization {
  id: string;
  content: string;
  category: string;
  subcategory: string;
  tags: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  relevance: number;
  aiConfidence: number;
}

// Cache Types
export interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number;
  source: string;
  metadata?: {
    apiCalls: number;
    lastRefreshed: number;
    quality: number;
    priority: 'high' | 'medium' | 'low';
  };
}

export interface QuotaInfo {
  dailyLimit: number;
  hourlyLimit: number;
  dailyUsed: number;
  hourlyUsed: number;
  resetTime: Date;
  isActive: boolean;
}

// Performance Types
export interface HeaderInteraction {
  id: string;
  type: 'navigation' | 'search' | 'dark_mode' | 'user_menu';
  target: string;
  timestamp: Date;
  sessionId: string;
  userAgent: string;
  performance: {
    loadTime: number;
    interactionTime: number;
  };
}

export interface HeaderAnalytics {
  totalInteractions: number;
  searchUsage: number;
  navigationUsage: number;
  darkModeUsage: number;
  averageLoadTime: number;
  topSearches: string[];
  topNavigationItems: string[];
}

// Navigation Types
export interface NavigationItem {
  label: string;
  path: string;
  icon: React.ComponentType<any>;
  badge?: string;
  priority: 'high' | 'medium' | 'low';
  submenu?: NavigationSubItem[];
}

export interface NavigationSubItem {
  label: string;
  path: string;
  description?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  darkMode: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: string;
  timezone: string;
  savedArticles: string[];
  favoriteCategories: string[];
}

// Error Types
export interface AppError {
  id: string;
  type: 'API_ERROR' | 'NETWORK_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  code?: string;
  timestamp: Date;
  context?: any;
  userAgent?: string;
  sessionId?: string;
}

// Loading States
export interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  error: AppError | null;
  retryCount: number;
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  onClick?: () => void;
  variant?: 'default' | 'outlined' | 'elevated';
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

// API Service Types
export interface ApiServiceConfig {
  baseUrl: string;
  apiKey?: string;
  timeout: number;
  retries: number;
  rateLimit: {
    requests: number;
    window: number;
  };
}

export interface ApiServiceResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  timestamp: number;
}

// Hook Types
export interface UseApiOptions {
  enabled?: boolean;
  refetchInterval?: number;
  retry?: boolean;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
}

export interface UseCacheOptions {
  ttl?: number;
  priority?: 'high' | 'medium' | 'low';
  forceRefresh?: boolean;
}

// Theme Types
export interface Theme {
  name: 'light' | 'dark' | 'system';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
    border: string;
  };
}

// Configuration Types
export interface AppConfig {
  env: 'development' | 'staging' | 'production';
  apiKeys: Record<string, string>;
  endpoints: Record<string, string>;
  features: Record<string, boolean>;
  performance: Record<string, number>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event Types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
}

// Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

// SEO Types
export interface SEOMetadata {
  title: string;
  description: string;
  keywords: string[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  canonicalUrl?: string;
  structuredData?: any;
}

// Export all types
export * from './news';
export * from './api';
export * from './components';