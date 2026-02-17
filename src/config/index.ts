// Centralized Configuration for ScopeDrop
// TODO: Replace placeholder values with actual API keys in production

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const CONFIG = {
  // Environment
  ENV: import.meta.env.NODE_ENV || 'development',
  IS_PRODUCTION: import.meta.env.NODE_ENV === 'production',
  IS_STAGING: import.meta.env.NODE_ENV === 'staging',

  // API keys
  API_KEYS: {
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
    SUPABASE_FUNCTIONS: SUPABASE_URL ? `${SUPABASE_URL}/functions/v1` : '',
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
  if (!getApiKey('SUPABASE_ANON_KEY')) errors.push('Supabase anon key not configured');

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