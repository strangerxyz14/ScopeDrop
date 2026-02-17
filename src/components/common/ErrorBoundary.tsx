import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppError } from '@/types';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      errorInfo,
    });

    // Log error to analytics or monitoring service
    this.logError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when resetKeys change
    if (prevProps.resetKeys !== this.props.resetKeys) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
      });
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo) => {
    const appError: AppError = {
      id: this.state.errorId,
      type: 'UNKNOWN_ERROR',
      message: error.message,
      code: error.name,
      timestamp: new Date(),
      context: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
      userAgent: navigator.userAgent,
      sessionId: this.getSessionId(),
    };

    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    console.error('📊 Error logged:', appError);

    // Store error in sessionStorage for debugging (avoid persistent localStorage)
    try {
      const errors = JSON.parse(sessionStorage.getItem('scopedrop_errors') || '[]');
      errors.push(appError);
      sessionStorage.setItem('scopedrop_errors', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
    } catch (e) {
      console.warn('Failed to store error in sessionStorage:', e);
    }
  };

  private getSessionId = (): string => {
    let sessionId = sessionStorage.getItem('scopedrop_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('scopedrop_session_id', sessionId);
    }
    return sessionId;
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleGoBack = () => {
    window.history.back();
  };

  private getErrorDetails = (): string => {
    if (!this.state.error) return 'Unknown error occurred';

    const error = this.state.error;
    const errorInfo = this.state.errorInfo;

    let details = `Error: ${error.message}\n`;
    details += `Type: ${error.name}\n`;
    details += `Time: ${new Date().toISOString()}\n`;
    details += `URL: ${window.location.href}\n`;
    details += `User Agent: ${navigator.userAgent}\n`;

    if (error.stack) {
      details += `\nStack Trace:\n${error.stack}\n`;
    }

    if (errorInfo?.componentStack) {
      details += `\nComponent Stack:\n${errorInfo.componentStack}\n`;
    }

    return details;
  };

  private copyErrorDetails = () => {
    const details = this.getErrorDetails();
    navigator.clipboard.writeText(details).then(() => {
      console.log('Error details copied to clipboard');
    }).catch(() => {
      console.warn('Failed to copy error details');
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl font-semibold text-gray-900">
                Something went wrong
              </CardTitle>
              <p className="text-gray-600 mt-2">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Error ID for debugging */}
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Error ID: {this.state.errorId}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={this.handleRetry}
                  className="w-full"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>

                <div className="flex gap-2">
                  <Button
                    onClick={this.handleGoBack}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>

                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </div>

                {/* Debug button (only in development) */}
                {import.meta.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={this.copyErrorDetails}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                  >
                    Copy Error Details
                  </Button>
                )}
              </div>

              {/* Additional Help */}
              <div className="text-xs text-gray-500 text-center">
                <p>If this problem persists, please contact support.</p>
                <p className="mt-1">
                  Reference: {this.state.errorId}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};

// Hook for functional components to handle errors
export const useErrorHandler = () => {
  const handleError = (error: Error, context?: any) => {
    console.error('🚨 Error caught by useErrorHandler:', error, context);
    
    // TODO: Send to error monitoring service
    const appError: AppError = {
      id: `hook_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'UNKNOWN_ERROR',
      message: error.message,
      code: error.name,
      timestamp: new Date(),
      context,
      userAgent: navigator.userAgent,
      sessionId: sessionStorage.getItem('scopedrop_session_id') || 'unknown',
    };

    console.error('📊 Hook error logged:', appError);
  };

  return { handleError };
};

export default ErrorBoundary;