import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CONFIG } from '@/config';
import { gnewsService } from '@/services/api/GNewsService';
import { cacheService } from '@/services/cache/CacheService';

interface ServiceStatus {
  name: string;
  isHealthy: boolean;
  lastCheck: Date;
  responseTime: number;
  error?: string;
}

interface SystemHealth {
  services: ServiceStatus[];
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
  lastUpdated: Date;
}

export const HealthCheck: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const checkServiceHealth = async (serviceName: string, healthCheck: () => Promise<boolean>): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const isHealthy = await healthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        name: serviceName,
        isHealthy,
        lastCheck: new Date(),
        responseTime,
      };
    } catch (error) {
      return {
        name: serviceName,
        isHealthy: false,
        lastCheck: new Date(),
        responseTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  };

  const performHealthCheck = async () => {
    setIsChecking(true);
    
    try {
      const services = await Promise.all([
        checkServiceHealth('GNews API', () => gnewsService.healthCheck()),
        checkServiceHealth('Cache Service', () => cacheService.healthCheck()),
        checkServiceHealth('Configuration', () => Promise.resolve(CONFIG.validateConfig())),
      ]);

      const healthyServices = services.filter(s => s.isHealthy).length;
      const totalServices = services.length;
      
      let overallHealth: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyServices === totalServices) {
        overallHealth = 'healthy';
      } else if (healthyServices > totalServices / 2) {
        overallHealth = 'degraded';
      } else {
        overallHealth = 'unhealthy';
      }

      setHealth({
        services,
        overallHealth,
        lastUpdated: new Date(),
      });
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Perform initial health check
    performHealthCheck();

    // Set up periodic health checks
    const interval = setInterval(performHealthCheck, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getHealthColor = (status: 'healthy' | 'degraded' | 'unhealthy') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  if (!health) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVisible(!isVisible)}
          className="bg-white/90 backdrop-blur-sm"
        >
          <Activity className="w-4 h-4 mr-2" />
          System Health
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isVisible && (
        <Card className="w-80 mb-2 bg-white/95 backdrop-blur-sm border shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">System Health</CardTitle>
              <div className="flex items-center gap-2">
                {getHealthIcon(health.overallHealth)}
                <Badge className={getHealthColor(health.overallHealth)}>
                  {health.overallHealth}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {health.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {service.isHealthy ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {service.responseTime}ms
                  </span>
                  {service.error && (
                    <span className="text-xs text-red-500" title={service.error}>
                      Error
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Last updated: {health.lastUpdated.toLocaleTimeString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={performHealthCheck}
                  disabled={isChecking}
                  className="h-6 px-2"
                >
                  <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="bg-white/90 backdrop-blur-sm"
      >
        <Activity className="w-4 h-4 mr-2" />
        System Health
        {health.overallHealth !== 'healthy' && (
          <Badge className="ml-2 h-4 px-1 text-xs">
            {health.services.filter(s => !s.isHealthy).length}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default HealthCheck;