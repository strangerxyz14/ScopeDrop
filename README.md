# 🚀 **ScopeDrop - Developer Handbook**

## **📋 Overview**

ScopeDrop is a modern, production-grade startup news and analytics platform built with React, TypeScript, and a modular architecture. This handbook provides comprehensive documentation for developers working on the codebase.

## **🏗️ Architecture Overview**

### **Core Principles**
- **Modular Design**: Clear separation of concerns with dedicated services
- **Type Safety**: Full TypeScript coverage with strict typing
- **Error Resilience**: Comprehensive error boundaries and fallback mechanisms
- **Performance First**: Caching, lazy loading, and optimized API calls
- **Scalable**: Production-ready architecture for high-scale applications

### **Technology Stack**
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **API Integration**: GNews, Gemini, Supabase
- **Caching**: Custom cache service with localStorage
- **Error Handling**: Custom error boundaries and monitoring

---

## **📁 Folder Structure**

```
src/
├── components/          # UI Components
│   ├── ui/            # Base UI components (shadcn)
│   ├── common/        # Reusable components (ErrorBoundary, HealthCheck)
│   ├── layout/        # Layout components
│   └── features/      # Feature-specific components
├── pages/             # Route pages
├── services/          # Business logic and API services
│   ├── api/          # External API services (GNews, Gemini)
│   ├── cache/        # Caching services
│   └── analytics/    # Analytics services
├── hooks/            # Custom React hooks
├── utils/            # Helper functions
├── types/            # TypeScript definitions
├── config/           # Configuration files
├── context/          # React context providers
└── constants/        # Application constants
```

---

## **🔧 Core Services**

### **1. Configuration System (`src/config/index.ts`)**
Centralized configuration management with environment-specific settings.

```typescript
import { CONFIG, getApiKey, validateConfig } from '@/config';

// Access configuration
const apiKey = getApiKey('GNEWS');
const isProduction = CONFIG.IS_PRODUCTION;

// Validate configuration
validateConfig();
```

**Key Features:**
- Environment-specific settings
- API key management
- Rate limiting configuration
- Feature flags
- Performance settings

### **2. Base API Service (`src/services/api/BaseApiService.ts`)**
Abstract base class for all API services with built-in error handling, retry logic, and rate limiting.

```typescript
import { BaseApiService } from '@/services/api/BaseApiService';

class MyApiService extends BaseApiService {
  constructor() {
    super('MyService', {
      baseUrl: 'https://api.example.com',
      timeout: 10000,
      retries: 3,
    });
  }

  async getData(): Promise<any> {
    return this.get('/data');
  }
}
```

**Features:**
- Automatic retry with exponential backoff
- Rate limiting protection
- Request/response logging
- Health check methods
- Error transformation

### **3. GNews Service (`src/services/api/GNewsService.ts`)**
Specialized service for GNews API integration with content categorization and sentiment analysis.

```typescript
import { gnewsService } from '@/services/api/GNewsService';

// Get startup news
const startupNews = await gnewsService.getStartupNews(20);

// Get AI-related news
const aiNews = await gnewsService.getAINews(20);

// Search articles
const articles = await gnewsService.searchArticles({
  q: 'startup funding',
  max: 10,
  sortby: 'publishedAt'
});
```

**Features:**
- Content categorization (funding, AI, acquisition, etc.)
- Sentiment analysis
- Relevance scoring
- Duplicate removal
- Error handling

### **4. Cache Service (`src/services/cache/CacheService.ts`)**
Comprehensive caching system with memory and localStorage support.

```typescript
import { cacheService } from '@/services/cache/CacheService';

// Set cache with TTL
await cacheService.set('key', data, 30 * 60 * 1000); // 30 minutes

// Get cached data
const data = await cacheService.get('key');

// Set with priority
await cacheService.setWithPriority('important', data, 'high');

// Get cache statistics
const stats = cacheService.getStats();
```

**Features:**
- Memory and localStorage caching
- TTL management
- Priority-based caching
- Automatic cleanup
- Cache statistics

---

## **🎣 Custom Hooks**

### **1. useApi Hook (`src/hooks/useApi.ts`)**
Comprehensive API hook with caching, error handling, and loading states.

```typescript
import { useApi } from '@/hooks/useApi';

const MyComponent = () => {
  const { data, isLoading, error, refetch } = useApi(
    'my-data',
    () => fetchData(),
    {
      refetchInterval: 5 * 60 * 1000, // 5 minutes
      onSuccess: (data) => console.log('Success:', data),
      onError: (error) => console.error('Error:', error),
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data}</div>;
};
```

**Available Hooks:**
- `useApi`: Basic API calls with caching
- `useApiWithRetry`: Automatic retry logic
- `useOptimisticApi`: Optimistic updates
- `usePaginatedApi`: Pagination support
- `useInfiniteApi`: Infinite scroll support

---

## **🛡️ Error Handling**

### **1. Error Boundary (`src/components/common/ErrorBoundary.tsx`)**
Global error boundary for catching React component crashes.

```typescript
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

<ErrorBoundary
  fallback={<CustomErrorUI />}
  onError={(error, errorInfo) => {
    // Log to monitoring service
    console.error('Error caught:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

**Features:**
- Graceful error recovery
- Error logging and monitoring
- Custom fallback UI
- Session tracking
- Debug information (development)

### **2. Health Check Component (`src/components/common/HealthCheck.tsx`)**
Real-time system health monitoring.

```typescript
import { HealthCheck } from '@/components/common/HealthCheck';

// Automatically included in App.tsx
// Shows system health in bottom-right corner
```

**Features:**
- API health monitoring
- Service status tracking
- Response time measurement
- Visual health indicators
- Manual refresh capability

---

## **🔑 Configuration Management**

### **Environment Variables**
Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Environment
NODE_ENV=development
```

Backend-only secrets live in Supabase Edge Function secrets (not `VITE_*`):
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- Your scout/news provider key (if applicable)

### **Configuration Validation**
The system automatically validates configuration on startup:

```typescript
import { validateConfig } from '@/config';

// This will log warnings for missing API keys
validateConfig();
```

---

## **🚀 Development Workflow**

### **1. Setting Up Development Environment**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

### **2. Adding New API Services**

1. **Create Service Class:**
```typescript
// src/services/api/MyService.ts
import { BaseApiService } from './BaseApiService';
import { CONFIG, getApiKey } from '@/config';

export class MyService extends BaseApiService {
  constructor() {
    super('MyService', {
      baseUrl: 'https://api.example.com',
      timeout: 10000,
    });
  }

  protected getApiKey(): string | null {
    return getApiKey('MY_SERVICE');
  }

  async getData(): Promise<any> {
    return this.get('/data');
  }
}

export const myService = MyService.getInstance();
```

2. **Add Configuration:**
```typescript
// src/config/index.ts
API_KEYS: {
  // ... existing keys
  MY_SERVICE: process.env.VITE_MY_SERVICE_API_KEY || 'your-api-key-here',
},
```

3. **Create Custom Hook:**
```typescript
// src/hooks/useMyService.ts
import { useApi } from './useApi';
import { myService } from '@/services/api/MyService';

export const useMyService = () => {
  return useApi('my-service-data', () => myService.getData());
};
```

### **3. Adding New Components**

1. **Create Component:**
```typescript
// src/components/features/MyFeature/MyComponent.tsx
import React from 'react';
import { BaseComponentProps } from '@/types';

interface MyComponentProps extends BaseComponentProps {
  title: string;
  data?: any;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, data, className }) => {
  return (
    <div className={className}>
      <h2>{title}</h2>
      {/* Component content */}
    </div>
  );
};
```

2. **Add to Index:**
```typescript
// src/components/features/MyFeature/index.ts
export { MyComponent } from './MyComponent';
```

### **4. Error Handling Best Practices**

1. **Use Error Boundaries:**
```typescript
import { withErrorBoundary } from '@/components/common/ErrorBoundary';

const MyComponentWithErrorBoundary = withErrorBoundary(MyComponent);
```

2. **Handle API Errors:**
```typescript
const { data, error, isLoading } = useApi('key', fetcher, {
  onError: (error) => {
    // Handle specific error types
    if (error.type === 'API_ERROR') {
      // Show user-friendly message
    }
  },
});
```

3. **Use Error Handler Hook:**
```typescript
import { useErrorHandler } from '@/components/common/ErrorBoundary';

const MyComponent = () => {
  const { handleError } = useErrorHandler();

  const handleClick = () => {
    try {
      // Risky operation
    } catch (error) {
      handleError(error as Error, { context: 'button-click' });
    }
  };
};
```

---

## **📊 Performance Optimization**

### **1. Caching Strategy**
- **Browser Cache**: 30 minutes TTL for most content
- **Database Cache**: 6 hours TTL for heavy operations
- **Priority Caching**: High-priority content cached longer
- **Automatic Cleanup**: Expired entries removed automatically

### **2. API Optimization**
- **Debouncing**: Search inputs debounced by 300ms
- **Rate Limiting**: Built-in protection against API limits
- **Retry Logic**: Exponential backoff for failed requests
- **Request Cancellation**: AbortController for cleanup

### **3. Code Splitting**
- **Lazy Loading**: Route-based code splitting
- **Component Splitting**: Large components split into smaller units
- **Bundle Optimization**: Tree shaking and dead code elimination

---

## **🔍 Monitoring & Debugging**

### **1. Health Check**
The health check component monitors:
- API service availability
- Cache service health
- Configuration validation
- Response times

### **2. Error Tracking**
- Automatic error logging
- Session tracking
- User agent information
- Stack trace preservation

### **3. Performance Monitoring**
- API response times
- Cache hit rates
- Memory usage
- Bundle size tracking

---

## **🔄 Deployment**

### **1. Environment Setup**
```bash
# Production build
npm run build

# Preview build
npm run preview

# Type checking
npm run type-check
```

### **2. Environment Variables**
Ensure all required environment variables are set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### **3. Health Checks**
The application includes built-in health checks that should be monitored in production.

---

## **📝 TODO & Future Improvements**

### **High Priority**
- [ ] Add comprehensive unit tests
- [ ] Implement E2E testing with Playwright
- [ ] Add performance monitoring dashboard
- [ ] Implement user authentication system
- [ ] Add real-time notifications

### **Medium Priority**
- [ ] Add more API integrations (Crunchbase, PitchBook)
- [ ] Implement advanced search filters
- [ ] Add data visualization components
- [ ] Create admin dashboard
- [ ] Add export functionality

### **Low Priority**
- [ ] Add PWA capabilities
- [ ] Implement offline mode
- [ ] Add internationalization
- [ ] Create mobile app
- [ ] Add social features

---

## **🤝 Contributing**

### **Code Standards**
- Use TypeScript for all new code
- Follow existing naming conventions
- Add proper error handling
- Include JSDoc comments for complex functions
- Write unit tests for new features

### **Pull Request Process**
1. Create feature branch from `main`
2. Implement changes with proper error handling
3. Add tests if applicable
4. Update documentation
5. Submit PR with detailed description

### **Code Review Checklist**
- [ ] TypeScript types are correct
- [ ] Error handling is implemented
- [ ] Performance considerations addressed
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No console.log statements in production code

---

## **📞 Support**

For questions or issues:
1. Check the health check component for system status
2. Review error logs in browser console
3. Check configuration validation
4. Contact the development team

---

**🎉 Happy Coding!**

This modular, production-ready architecture provides a solid foundation for building scalable applications with excellent developer experience and robust error handling.
