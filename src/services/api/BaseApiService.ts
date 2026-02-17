import { CONFIG, getApiKey } from '@/config';
import { ApiServiceConfig, ApiServiceResponse, AppError } from '@/types';

export abstract class BaseApiService {
  protected config: ApiServiceConfig;
  protected serviceName: string;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(serviceName: string, config: Partial<ApiServiceConfig> = {}) {
    this.serviceName = serviceName;
    this.config = {
      baseUrl: '',
      timeout: 10000,
      retries: 3,
      rateLimit: {
        requests: 100,
        window: 60000, // 1 minute
      },
      ...config,
    };
  }

  protected async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiServiceResponse<T>> {
    const startTime = Date.now();
    const url = `${this.config.baseUrl}${endpoint}`;

    // Check rate limiting
    if (!this.checkRateLimit()) {
      throw this.createError('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded');
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ScopeDrop/1.0',
        ...options.headers,
      },
      ...options,
    };

    // Add API key if available
    const apiKey = this.getApiKey();
    if (apiKey) {
      requestOptions.headers = {
        ...requestOptions.headers,
        'Authorization': `Bearer ${apiKey}`,
      };
    }

    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Update rate limiting
        this.updateRateLimit();

        // Handle different response status codes
        if (!response.ok) {
          throw this.handleHttpError(response);
        }

        const data = await response.json();
        const endTime = Date.now();

        return {
          data,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: endTime,
        };
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error as Error)) {
          throw error;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.config.retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.delay(delay);
        }
      }
    }

    // All retries failed
    throw this.createError(
      'API_REQUEST_FAILED',
      `Request failed after ${this.config.retries} attempts: ${lastError?.message}`,
      lastError
    );
  }

  protected async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ApiServiceResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>(url, { method: 'GET' });
  }

  protected async post<T = any>(endpoint: string, data?: any): Promise<ApiServiceResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T = any>(endpoint: string, data?: any): Promise<ApiServiceResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T = any>(endpoint: string): Promise<ApiServiceResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    if (!params) return endpoint;

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });

    const queryString = searchParams.toString();
    return queryString ? `${endpoint}?${queryString}` : endpoint;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.window;

    // Remove old requests from count
    this.requestCount = Math.max(0, this.requestCount - Math.floor((now - this.lastRequestTime) / this.config.rateLimit.window));

    return this.requestCount < this.config.rateLimit.requests;
  }

  private updateRateLimit(): void {
    this.requestCount++;
    this.lastRequestTime = Date.now();
  }

  private shouldNotRetry(error: Error): boolean {
    // Don't retry on network errors, timeouts, or 4xx errors (except 429)
    if (error.name === 'AbortError') return true;
    if (error.message.includes('Failed to fetch')) return true;
    if (error.message.includes('NetworkError')) return true;
    
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleHttpError(response: Response): Error {
    const status = response.status;
    let message = `HTTP ${status}`;

    switch (status) {
      case 400:
        message = 'Bad request - Invalid parameters provided';
        break;
      case 401:
        message = 'Unauthorized - Invalid API key';
        break;
      case 403:
        message = 'Forbidden - Access denied';
        break;
      case 404:
        message = 'Not found - Resource not available';
        break;
      case 429:
        message = 'Rate limit exceeded - Too many requests';
        break;
      case 500:
        message = 'Internal server error - Service temporarily unavailable';
        break;
      case 502:
      case 503:
      case 504:
        message = 'Service unavailable - Please try again later';
        break;
      default:
        message = `HTTP ${status} - Unexpected error`;
    }

    return this.createError('HTTP_ERROR', message);
  }

  private createError(type: string, message: string, originalError?: Error): AppError & Error {
    const error = new Error(message) as AppError & Error;
    error.id = `api_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    error.type = 'API_ERROR';
    error.code = type;
    error.timestamp = new Date();
    error.context = {
      service: this.serviceName,
      originalError: originalError?.message,
      stack: originalError?.stack,
    };
    error.userAgent = navigator.userAgent;
    error.sessionId = sessionStorage.getItem('scopedrop_session_id') || 'unknown';
    return error;
  }

  protected getApiKey(): string | null {
    // Override in subclasses to provide specific API key logic
    return null;
  }

  // Utility methods for subclasses
  protected logRequest(endpoint: string, params?: any): void {
    if (CONFIG.ENV === 'development') {
      console.log(`🌐 ${this.serviceName} API Request:`, { endpoint, params });
    }
  }

  protected logResponse<T>(data: T, duration: number): void {
    if (CONFIG.ENV === 'development') {
      console.log(`✅ ${this.serviceName} API Response:`, { data, duration: `${duration}ms` });
    }
  }

  protected logError(error: AppError): void {
    console.error(`❌ ${this.serviceName} API Error:`, error);
  }

  // Health check method
  public async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Get service status
  public getStatus(): {
    isHealthy: boolean;
    lastRequestTime: number;
    requestCount: number;
    rateLimitRemaining: number;
  } {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.window;
    const rateLimitRemaining = Math.max(0, this.config.rateLimit.requests - this.requestCount);

    return {
      isHealthy: now - this.lastRequestTime < 300000, // 5 minutes
      lastRequestTime: this.lastRequestTime,
      requestCount: this.requestCount,
      rateLimitRemaining,
    };
  }
}