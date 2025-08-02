import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAPIConfiguration, useContentSchedulerStatus } from '@/hooks/useRealTimeContent';
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  RefreshCw, 
  Settings, 
  Clock,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

const APIConfigurationStatus: React.FC = () => {
  const { 
    configStatus, 
    configuredCount, 
    totalCount, 
    configurationPercentage, 
    isFullyConfigured, 
    hasMinimumConfig,
    missingAPIs 
  } = useAPIConfiguration();
  
  const { status, manualRefresh } = useContentSchedulerStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apiDetails = {
    newsapi: {
      name: 'NewsAPI',
      description: '1,000 requests/day - Latest startup news',
      url: 'https://newsapi.org/register',
      free: true,
      priority: 'high'
    },
    github: {
      name: 'GitHub API',
      description: '5,000 requests/hour - Trending repositories',
      url: 'https://github.com/settings/tokens',
      free: true,
      priority: 'high'
    },
    huggingface: {
      name: 'Hugging Face',
      description: '30,000 chars/month - AI content enhancement',
      url: 'https://huggingface.co/settings/tokens',
      free: true,
      priority: 'medium'
    },
    producthunt: {
      name: 'Product Hunt',
      description: '1,000 requests/day - Product launches',
      url: 'https://api.producthunt.com/v2/oauth/applications',
      free: true,
      priority: 'medium'
    },
    alphavantage: {
      name: 'Alpha Vantage',
      description: '500 requests/day - Market data',
      url: 'https://www.alphavantage.co/support/#api-key',
      free: true,
      priority: 'low'
    },
    eventbrite: {
      name: 'Eventbrite',
      description: '1,000 requests/hour - Tech events',
      url: 'https://www.eventbrite.com/platform/api-keys',
      free: true,
      priority: 'low'
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await manualRefresh('all');
      toast.success('Content refreshed successfully!');
    } catch (error) {
      toast.error('Failed to refresh content');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                API Configuration Status
              </CardTitle>
              <CardDescription>
                {isFullyConfigured 
                  ? 'All APIs configured - your site has unlimited fresh content!'
                  : hasMinimumConfig 
                    ? 'Minimum APIs configured - your site is getting fresh content!'
                    : 'No APIs configured - using mock data only'
                }
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh} 
              disabled={isRefreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh Content
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Configuration Progress</span>
                <span className="text-sm text-muted-foreground">
                  {configuredCount}/{totalCount} APIs configured
                </span>
              </div>
              <Progress value={configurationPercentage} className="w-full" />
            </div>

            {!isFullyConfigured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {hasMinimumConfig 
                    ? `Great start! You have ${configuredCount} APIs working. Configure ${missingAPIs.length} more for maximum content variety.`
                    : 'Configure at least NewsAPI or GitHub API to start getting real-time content.'
                  }
                </AlertDescription>
              </Alert>
            )}

            {isFullyConfigured && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Perfect! All APIs are configured. Your startup tracker now has unlimited fresh content from multiple sources.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(apiDetails).map(([key, details]) => {
          const isConfigured = configStatus[key as keyof typeof configStatus];
          
          return (
            <Card key={key} className={`transition-all duration-200 ${
              isConfigured ? 'border-green-200 bg-green-50/50' : 'border-gray-200'
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {isConfigured ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                      {details.name}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {details.description}
                    </CardDescription>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={getPriorityColor(details.priority)}
                  >
                    {details.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium text-green-600">
                      100% Free
                    </span>
                  </div>
                  {!isConfigured && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(details.url, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Get API Key
                    </Button>
                  )}
                </div>
                
                {isConfigured && (
                  <div className="mt-2 p-2 bg-green-100 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-green-800">
                      <CheckCircle className="w-4 h-4" />
                      Configured & Active
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content Scheduler Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Content Scheduler Status
          </CardTitle>
          <CardDescription>
            Automatic content refresh jobs running in the background
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {status.map((job) => (
              <div key={job.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{job.name}</h4>
                  <Badge variant={job.isRunning ? "default" : "secondary"}>
                    {job.isRunning ? 'Running' : 'Idle'}
                  </Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Interval: {job.interval} minutes</div>
                  {job.lastRun && (
                    <div>Last run: {job.lastRun.toLocaleTimeString()}</div>
                  )}
                  {job.nextRun && (
                    <div>Next run: {job.nextRun.toLocaleTimeString()}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      {!isFullyConfigured && (
        <Card>
          <CardHeader>
            <CardTitle>🚀 Quick Setup Guide</CardTitle>
            <CardDescription>
              Get your free API keys in 15 minutes and unlock unlimited content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">High Priority (Start Here)</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      NewsAPI - Latest startup funding news
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      GitHub API - Trending tech repositories
                    </li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Medium Priority</h4>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Hugging Face - AI content enhancement
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                      Product Hunt - Product launches
                    </li>
                  </ul>
                </div>
              </div>
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Pro Tip:</strong> Even with just NewsAPI and GitHub (5 minutes setup), 
                  you'll get 1,000+ fresh articles daily plus trending repositories!
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default APIConfigurationStatus;