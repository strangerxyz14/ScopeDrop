import { toast } from "@/components/ui/use-toast";

// Error tracking
class ErrorTracker {
  private static errors: {timestamp: Date, error: any, source: string}[] = [];
  private static maxErrors = 100;
  
  static trackError(error: any, source: string) {
    const errorObj = {
      timestamp: new Date(),
      error,
      source
    };
    
    console.error(`[${source}] Error:`, error);
    this.errors.unshift(errorObj);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors.pop();
    }
    
    // Show toast notification
    toast({
      title: "Error fetching news",
      description: `Failed to load content from ${source}: ${error.message || 'Unknown error'}`,
      variant: "destructive",
    });
  }
  
  static getErrors() {
    return this.errors;
  }
  
  static clearErrors() {
    this.errors = [];
  }
}

export function getErrorLog() {
  return ErrorTracker.getErrors();
}

export function clearErrorLog() {
  ErrorTracker.clearErrors();
}

export function trackClientError(error: any, source: string) {
  ErrorTracker.trackError(error, source);
}
