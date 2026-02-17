// Centralized Configuration for ScopeDrop
// TODO: Replace placeholder values with actual API keys in production

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
const GNEWS_API_KEY = (import.meta.env.VITE_GNEWS_API_KEY || '').trim();

export const CONFIG = {
  // Environment
  ENV: import.meta.env.NODE_ENV || 'development',
  IS_PRODUCTION: import.meta.env.NODE_ENV === 'production',
  IS_STAGING: import.meta.env.NODE_ENV === 'staging',

  // API keys
  API_KEYS: {
    GNEWS: GNEWS_API_KEY,
    GEMINI: GEMINI_API_KEY,
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  },

  // Supabase Configuration
  SUPABASE: {
    URL: SUPABASE_URL,
    ANON_KEY: SUPABASE_ANON_KEY,
    PROJECT_ID: 'scopedrop-optimized',
  },

  // API Endpoints
  ENDPOINTS: {
    GNEWS_BASE: 'https://gnews.io/api/v4',
    GEMINI_BASE: 'https://generativelanguage.googleapis.com/v1beta/models',
    SUPABASE_FUNCTIONS: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '',
  },

  // API Rate Limits (Staging has reduced limits)
  RATE_LIMITS: {
    STAGING: {
      GNEWS: { dailyLimit: 100, hourlyLimit: 10, cooldown: 60 * 1000 },
      GEMINI: { dailyLimit: 1500, hourlyLimit: 150, cooldown: 2 * 1000 },
      REDDIT: { dailyLimit: 100, hourlyLimit: 6, cooldown: 60 * 1000 },
      HN: { dailyLimit: 100, hourlyLimit: 3, cooldown: 60 * 1000 },
      RSS: { dailyLimit: 1000, hourlyLimit: 100, cooldown: 10 * 1000 },
      MEETUP: { dailyLimit: 100, hourlyLimit: 20, cooldown: 60 * 1000 },
    },
    PRODUCTION: {
      GNEWS: { dailyLimit: 1000, hourlyLimit: 100, cooldown: 60 * 1000 },
      GEMINI: { dailyLimit: 15000, hourlyLimit: 1500, cooldown: 2 * 1000 },
      REDDIT: { dailyLimit: 1000, hourlyLimit: 60, cooldown: 60 * 1000 },
      HN: { dailyLimit: 1000, hourlyLimit: 30, cooldown: 60 * 1000 },
      RSS: { dailyLimit: 10000, hourlyLimit: 1000, cooldown: 10 * 1000 },
      MEETUP: { dailyLimit: 1000, hourlyLimit: 200, cooldown: 60 * 1000 },
    },
  },

  // Cache Configuration
  CACHE: {
    BROWSER_TTL: 30 * 60 * 1000, // 30 minutes
    DATABASE_TTL: 6 * 60 * 60 * 1000, // 6 hours
    MAX_SIZE: 10 * 1024 * 1024, // 10MB
    PREFIX: 'scopedrop_cache_',
  },

  // Content Refresh Intervals
  REFRESH_INTERVALS: {
    HIGH: 2 * 60 * 60 * 1000, // 2 hours (funding)
    MEDIUM: 4 * 60 * 60 * 1000, // 4 hours (news)
    LOW: 12 * 60 * 60 * 1000, // 12 hours (events)
  },

  // Performance Settings
  PERFORMANCE: {
    DEBOUNCE_DELAY: 300,
    SEARCH_DELAY: 500,
    LAZY_LOAD_THRESHOLD: 0.1,
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },

  // Feature Flags
  FEATURES: {
    AI_SEARCH: true,
    REAL_TIME_BADGES: true,
    DARK_MODE: true,
    ANALYTICS: true,
    EDGE_FUNCTIONS: true,
    CACHING: true,
  },

  // UI Configuration
  UI: {
    THEME: {
      PRIMARY: '#10b981', // parrot
      SECONDARY: '#0f172a', // oxford
      ACCENT: '#3b82f6', // blue
    },
    ANIMATIONS: {
      DURATION: 200,
      EASING: 'ease-in-out',
    },
    BREAKPOINTS: {
      MOBILE: 640,
      TABLET: 1024,
      DESKTOP: 1280,
    },
  },

  // Error Messages
  ERRORS: {
    API_UNAVAILABLE: 'Service temporarily unavailable. Please try again later.',
    QUOTA_EXCEEDED: 'API quota exceeded. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    VALIDATION_ERROR: 'Invalid input. Please check your request.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },

  // Success Messages
  SUCCESS: {
    CONTENT_LOADED: 'Content loaded successfully',
    CACHE_UPDATED: 'Cache updated successfully',
    SETTINGS_SAVED: 'Settings saved successfully',
  },
};

// Helper function to get current rate limits based on environment
export const getRateLimits = () => {
  return CONFIG.IS_PRODUCTION ? CONFIG.RATE_LIMITS.PRODUCTION : CONFIG.RATE_LIMITS.STAGING;
};

// Helper function to check if feature is enabled
export const isFeatureEnabled = (feature: keyof typeof CONFIG.FEATURES) => {
  return CONFIG.FEATURES[feature];
};

// Helper function to get API key safely
export const getApiKey = (service: keyof typeof CONFIG.API_KEYS) => {
  const key = CONFIG.API_KEYS[service];
  if (!key) {
    console.warn(`⚠️ ${service} API key not configured.`);
    return null;
  }
  return key;
};

// Helper function to validate configuration
export const validateConfig = () => {
  const errors: string[] = [];

  // Check required API keys
  if (!getApiKey('GNEWS')) {
    errors.push('GNews API key not configured');
  }
  if (!getApiKey('GEMINI')) {
    errors.push('Gemini API key not configured');
  }
  if (!getApiKey('SUPABASE_ANON_KEY')) {
    errors.push('Supabase API key not configured');
  }

  // Check required URLs
  if (!CONFIG.SUPABASE.URL) {
    errors.push('Supabase URL not configured');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration validation failed:', errors);
    return false;
  }

  console.log('✅ Configuration validated successfully');
  return true;
};

export default CONFIG;