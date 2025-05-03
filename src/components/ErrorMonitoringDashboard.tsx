
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";
import { getErrorLog, clearErrorLog } from "@/services/newsService";

interface ErrorLog {
  timestamp: Date;
  error: any;
  source: string;
}

const ErrorMonitoringDashboard = () => {
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadErrorLogs();
  }, []);

  const loadErrorLogs = () => {
    const logs = getErrorLog();
    setErrorLogs(logs);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    setTimeout(() => {
      loadErrorLogs();
      setIsRefreshing(false);
    }, 500);
  };

  const handleClearLogs = () => {
    clearErrorLog();
    setErrorLogs([]);
  };

  const filterLogsBySource = (source: string) => {
    if (source === "all") return errorLogs;
    return errorLogs.filter(log => log.source.includes(source));
  };

  const getStatusColor = (source: string) => {
    const hasErrors = errorLogs.some(log => log.source.includes(source));
    return hasErrors ? "text-red-500" : "text-green-500";
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-display font-bold text-oxford">Error Monitoring Dashboard</h1>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
          >
            <RefreshCw size={16} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearLogs}
            disabled={errorLogs.length === 0}
          >
            Clear Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">GNews API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {getStatusColor("GNews").includes("green") 
                ? <CheckCircle className="text-green-500 mr-2" /> 
                : <AlertTriangle className="text-red-500 mr-2" />}
              <span className={`text-2xl font-bold ${getStatusColor("GNews")}`}>
                {getStatusColor("GNews").includes("green") ? "Operational" : "Issues Detected"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Newsdata API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {getStatusColor("Newsdata").includes("green") 
                ? <CheckCircle className="text-green-500 mr-2" /> 
                : <AlertTriangle className="text-red-500 mr-2" />}
              <span className={`text-2xl font-bold ${getStatusColor("Newsdata")}`}>
                {getStatusColor("Newsdata").includes("green") ? "Operational" : "Issues Detected"}
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gemini API Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              {getStatusColor("Gemini").includes("green") 
                ? <CheckCircle className="text-green-500 mr-2" /> 
                : <AlertTriangle className="text-red-500 mr-2" />}
              <span className={`text-2xl font-bold ${getStatusColor("Gemini")}`}>
                {getStatusColor("Gemini").includes("green") ? "Operational" : "Issues Detected"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
          <CardDescription>View and manage system error logs</CardDescription>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="all">All Logs</TabsTrigger>
              <TabsTrigger value="GNews">GNews API</TabsTrigger>
              <TabsTrigger value="Newsdata">Newsdata API</TabsTrigger>
              <TabsTrigger value="Gemini">Gemini API</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filterLogsBySource(activeTab).length > 0 ? (
            <div className="space-y-4">
              {filterLogsBySource(activeTab).map((log, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center mb-2">
                          <Badge variant="destructive" className="mr-2">Error</Badge>
                          <span className="font-medium">{log.source}</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{formatTimestamp(log.timestamp)}</p>
                        <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                          {log.error?.message || JSON.stringify(log.error, null, 2)}
                        </pre>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-500">
                        <X size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {errorLogs.length === 0 
                ? "No errors recorded. System is running smoothly." 
                : `No errors in ${activeTab === 'all' ? 'any category' : activeTab} category.`}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ErrorMonitoringDashboard;
