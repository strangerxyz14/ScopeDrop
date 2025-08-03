import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Search, Clock, Activity } from 'lucide-react';
import { headerPerformanceService, HeaderAnalytics } from '@/services/headerPerformanceService';
import { headerSEOService } from '@/services/headerSEOService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const HeaderAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<HeaderAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Fetch analytics data
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

  // Update SEO data
  const updateSEO = async () => {
    try {
      await headerSEOService.updateNavigationSEO();
      console.log('SEO data updated successfully');
    } catch (error) {
      console.error('Error updating SEO:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [timeRange]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-oxford-600 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-oxford-600 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center text-white/60">
        <BarChart3 className="w-8 h-8 mx-auto mb-2" />
        <p>No analytics data available</p>
      </div>
    );
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value >= threshold * 0.8) return 'text-green-500';
    if (value >= threshold * 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getPerformanceIcon = (value: number, threshold: number) => {
    if (value >= threshold * 0.8) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value >= threshold * 0.6) return <Activity className="w-4 h-4 text-yellow-500" />;
    return <Clock className="w-4 h-4 text-red-500" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Header Analytics</h2>
          <p className="text-white/60">Performance metrics and user behavior</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={updateSEO}
            className="text-white border-oxford-400 hover:bg-oxford-600"
          >
            Update SEO
          </Button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-oxford-700 text-white border-oxford-600 rounded px-3 py-1 text-sm"
          >
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics.totalInteractions.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              Across all header elements
            </p>
          </CardContent>
        </Card>

        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics.searchUsage.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              {((analytics.searchUsage / analytics.totalInteractions) * 100).toFixed(1)}% of interactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Navigation Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {analytics.navigationUsage.toLocaleString()}
            </div>
            <p className="text-xs text-white/60 mt-1">
              {((analytics.navigationUsage / analytics.totalInteractions) * 100).toFixed(1)}% of interactions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/80 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Load Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getPerformanceColor(analytics.averageLoadTime, 100)}`}>
              {analytics.averageLoadTime.toFixed(0)}ms
            </div>
            <div className="flex items-center gap-1 mt-1">
              {getPerformanceIcon(analytics.averageLoadTime, 100)}
              <p className="text-xs text-white/60">
                {analytics.averageLoadTime < 100 ? 'Excellent' : analytics.averageLoadTime < 200 ? 'Good' : 'Needs improvement'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Searches */}
      {analytics.topSearches.length > 0 && (
        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="w-4 h-4" />
              Top Searches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analytics.topSearches.map((search, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {search}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Navigation Items */}
      {analytics.topNavigationItems.length > 0 && (
        <Card className="bg-oxford-800 border-oxford-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Top Navigation Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.topNavigationItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{item}</span>
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      <Card className="bg-oxford-800 border-oxford-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-white/80 mb-2">Search Performance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Usage Rate</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(analytics.searchUsage, analytics.totalInteractions)}`}>
                    {((analytics.searchUsage / analytics.totalInteractions) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Avg Results</span>
                  <span className="text-sm font-medium text-white">
                    {analytics.topSearches.length} suggestions
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-white/80 mb-2">Navigation Performance</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Usage Rate</span>
                  <span className={`text-sm font-medium ${getPerformanceColor(analytics.navigationUsage, analytics.totalInteractions)}`}>
                    {((analytics.navigationUsage / analytics.totalInteractions) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Popular Items</span>
                  <span className="text-sm font-medium text-white">
                    {analytics.topNavigationItems.length} items
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-oxford-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Overall Performance</span>
              <Badge 
                variant={analytics.averageLoadTime < 100 ? "default" : "secondary"}
                className={analytics.averageLoadTime < 100 ? "bg-green-500" : "bg-yellow-500"}
              >
                {analytics.averageLoadTime < 100 ? 'Excellent' : analytics.averageLoadTime < 200 ? 'Good' : 'Needs Improvement'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};