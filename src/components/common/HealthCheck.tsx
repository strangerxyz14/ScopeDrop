import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      return { name: serviceName, isHealthy, lastCheck: new Date(), responseTime: Date.now() - startTime };
    } catch (error) {
      return { name: serviceName, isHealthy: false, lastCheck: new Date(), responseTime: Date.now() - startTime, error: (error as Error).message };
    }
  };

  const performHealthCheck = async () => {
    setIsChecking(true);
    try {
      const services = await Promise.all([
        checkServiceHealth('GNews API', () => gnewsService.healthCheck()),
        checkServiceHealth('Cache Service', () => cacheService.healthCheck()),
      ]);

      const healthyServices = services.filter(s => s.isHealthy).length;
      const totalServices = services.length;
      const overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 
        healthyServices === totalServices ? 'healthy' : healthyServices > totalServices / 2 ? 'degraded' : 'unhealthy';

      setHealth({ services, overallHealth, lastUpdated: new Date() });
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    performHealthCheck();
    const interval = setInterval(performHealthCheck, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button variant="outline" size="sm" onClick={() => setIsVisible(!isVisible)} className="bg-background/90 backdrop-blur-sm">
          <Activity className="w-4 h-4 mr-2" />System Health
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isVisible && (
        <Card className="w-80 mb-2 bg-background/95 backdrop-blur-sm border shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">System Health</CardTitle>
              <Badge variant={health.overallHealth === 'healthy' ? 'default' : 'secondary'}>{health.overallHealth}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {health.services.map((service) => (
              <div key={service.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  {service.isHealthy ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="font-medium">{service.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{service.responseTime}ms</span>
              </div>
            ))}
            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <span>Last: {health.lastUpdated.toLocaleTimeString()}</span>
              <Button variant="ghost" size="sm" onClick={performHealthCheck} disabled={isChecking} className="h-6 px-2">
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Button variant="outline" size="sm" onClick={() => setIsVisible(!isVisible)} className="bg-background/90 backdrop-blur-sm">
        <Activity className="w-4 h-4 mr-2" />System Health
      </Button>
    </div>
  );
};

export default HealthCheck;
