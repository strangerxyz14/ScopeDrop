import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Search, Clock, Activity } from 'lucide-react';
import { headerPerformanceService } from '@/services/headerPerformanceService';
import type { HeaderAnalytics as HeaderAnalyticsType } from '@/services/headerPerformanceService';
import { headerSEOService } from '@/services/headerSEOService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const HeaderAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<HeaderAnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await headerPerformanceService.getHeaderAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSEO = async () => {
    try {
      await headerSEOService.updateNavigationSEO();
    } catch (error) {
      console.error('Error updating SEO:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  if (isLoading || !analytics) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Header Analytics</h2>
        <Button variant="outline" size="sm" onClick={updateSEO}>Update SEO</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{analytics.totalInteractions}</div><p className="text-sm text-muted-foreground">Total Interactions</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{analytics.searchUsage}</div><p className="text-sm text-muted-foreground">Search Usage</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{analytics.navigationUsage}</div><p className="text-sm text-muted-foreground">Nav Usage</p></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{analytics.averageLoadTime.toFixed(0)}ms</div><p className="text-sm text-muted-foreground">Avg Load Time</p></CardContent></Card>
      </div>
    </div>
  );
};
