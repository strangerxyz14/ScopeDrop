import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Building, Users, Calendar } from "lucide-react";
import { FundingRound, Sector } from "@/types/news";

interface DataVisualizationProps {
  fundingData?: FundingRound[];
  className?: string;
}

interface ChartData {
  name: string;
  value: number;
  amount?: number;
  count?: number;
  date?: string;
  sector?: string;
  stage?: string;
}

const COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1",
  "#d084d0", "#87ceeb", "#dda0dd", "#98fb98", "#f0e68c"
];

const DataVisualization: React.FC<DataVisualizationProps> = ({
  fundingData = [],
  className
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState("6months");
  const [selectedMetric, setSelectedMetric] = useState("amount");

  // Process funding data for various visualizations
  const processedData = useMemo(() => {
    if (!fundingData.length) return {
      monthlyTrends: [],
      sectorDistribution: [],
      stageDistribution: [],
      regionalData: [],
      topCompanies: []
    };

    // Monthly trends
    const monthlyMap = new Map<string, { amount: number; count: number }>();
    fundingData.forEach(funding => {
      const month = new Date(funding.date).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      const amount = parseFloat(funding.amount.replace(/[^0-9.]/g, '')) || 0;
      
      if (monthlyMap.has(month)) {
        const existing = monthlyMap.get(month)!;
        monthlyMap.set(month, {
          amount: existing.amount + amount,
          count: existing.count + 1
        });
      } else {
        monthlyMap.set(month, { amount, count: 1 });
      }
    });

    const monthlyTrends = Array.from(monthlyMap.entries()).map(([month, data]) => ({
      name: month,
      amount: data.amount,
      count: data.count,
      value: selectedMetric === 'amount' ? data.amount : data.count
    })).sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());

    // Sector distribution
    const sectorMap = new Map<string, { amount: number; count: number }>();
    fundingData.forEach(funding => {
      const amount = parseFloat(funding.amount.replace(/[^0-9.]/g, '')) || 0;
      
      if (sectorMap.has(funding.sector)) {
        const existing = sectorMap.get(funding.sector)!;
        sectorMap.set(funding.sector, {
          amount: existing.amount + amount,
          count: existing.count + 1
        });
      } else {
        sectorMap.set(funding.sector, { amount, count: 1 });
      }
    });

    const sectorDistribution = Array.from(sectorMap.entries()).map(([sector, data]) => ({
      name: sector,
      value: selectedMetric === 'amount' ? data.amount : data.count,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.value - a.value).slice(0, 10);

    // Stage distribution
    const stageMap = new Map<string, { amount: number; count: number }>();
    fundingData.forEach(funding => {
      const amount = parseFloat(funding.amount.replace(/[^0-9.]/g, '')) || 0;
      
      if (stageMap.has(funding.stage)) {
        const existing = stageMap.get(funding.stage)!;
        stageMap.set(funding.stage, {
          amount: existing.amount + amount,
          count: existing.count + 1
        });
      } else {
        stageMap.set(funding.stage, { amount, count: 1 });
      }
    });

    const stageDistribution = Array.from(stageMap.entries()).map(([stage, data]) => ({
      name: stage,
      value: selectedMetric === 'amount' ? data.amount : data.count,
      amount: data.amount,
      count: data.count
    }));

    // Regional data
    const regionMap = new Map<string, { amount: number; count: number }>();
    fundingData.forEach(funding => {
      const amount = parseFloat(funding.amount.replace(/[^0-9.]/g, '')) || 0;
      
      if (regionMap.has(funding.region)) {
        const existing = regionMap.get(funding.region)!;
        regionMap.set(funding.region, {
          amount: existing.amount + amount,
          count: existing.count + 1
        });
      } else {
        regionMap.set(funding.region, { amount, count: 1 });
      }
    });

    const regionalData = Array.from(regionMap.entries()).map(([region, data]) => ({
      name: region,
      value: selectedMetric === 'amount' ? data.amount : data.count,
      amount: data.amount,
      count: data.count
    })).sort((a, b) => b.value - a.value);

    // Top companies by funding
    const topCompanies = fundingData
      .map(funding => ({
        name: funding.companyName,
        value: parseFloat(funding.amount.replace(/[^0-9.]/g, '')) || 0,
        stage: funding.stage,
        sector: funding.sector,
        date: funding.date
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      monthlyTrends,
      sectorDistribution,
      stageDistribution,
      regionalData,
      topCompanies
    };
  }, [fundingData, selectedMetric]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'amount' ? 'Total Amount' : 
               entry.dataKey === 'count' ? 'Deal Count' : entry.dataKey}: {' '}
              {entry.dataKey === 'amount' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const calculateTrend = (data: ChartData[]) => {
    if (data.length < 2) return { trend: 0, isPositive: true };
    const recent = data.slice(-3).reduce((sum, item) => sum + item.value, 0);
    const previous = data.slice(-6, -3).reduce((sum, item) => sum + item.value, 0);
    const trend = previous > 0 ? ((recent - previous) / previous) * 100 : 0;
    return { trend: Math.abs(trend), isPositive: trend >= 0 };
  };

  const monthlyTrend = calculateTrend(processedData.monthlyTrends);

  return (
    <div className={className}>
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Funding Analytics</h2>
            <p className="text-muted-foreground">
              Interactive visualizations of startup funding trends and market insights
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="amount">Total Amount</SelectItem>
                <SelectItem value="count">Deal Count</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3months">3M</SelectItem>
                <SelectItem value="6months">6M</SelectItem>
                <SelectItem value="1year">1Y</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(processedData.monthlyTrends.reduce((sum, item) => sum + item.amount, 0))}
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                {monthlyTrend.isPositive ? (
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                )}
                {monthlyTrend.trend.toFixed(1)}% from last period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {processedData.monthlyTrends.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground">
                Across {processedData.sectorDistribution.length} sectors
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  processedData.monthlyTrends.reduce((sum, item) => sum + item.amount, 0) /
                  Math.max(processedData.monthlyTrends.reduce((sum, item) => sum + item.count, 0), 1)
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Per funding round
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Months</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{processedData.monthlyTrends.length}</div>
              <div className="text-xs text-muted-foreground">
                With funding activity
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="sectors">Sectors</TabsTrigger>
            <TabsTrigger value="stages">Stages</TabsTrigger>
            <TabsTrigger value="regions">Regions</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Funding Trends Over Time</CardTitle>
                <CardDescription>
                  Monthly {selectedMetric === 'amount' ? 'funding amounts' : 'deal counts'} showing market activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={processedData.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={selectedMetric === 'amount' ? formatCurrency : undefined} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sectors" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sector Distribution</CardTitle>
                  <CardDescription>
                    {selectedMetric === 'amount' ? 'Funding amounts' : 'Deal counts'} by industry sector
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={processedData.sectorDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {processedData.sectorDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Sectors</CardTitle>
                  <CardDescription>
                    Leading sectors by {selectedMetric === 'amount' ? 'total funding' : 'number of deals'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={processedData.sectorDistribution.slice(0, 6)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={selectedMetric === 'amount' ? formatCurrency : undefined} />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Funding Stage Analysis</CardTitle>
                <CardDescription>
                  Distribution of {selectedMetric === 'amount' ? 'funding amounts' : 'deal counts'} across different funding stages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={processedData.stageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={selectedMetric === 'amount' ? formatCurrency : undefined} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="regions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Regional Distribution</CardTitle>
                <CardDescription>
                  Global distribution of {selectedMetric === 'amount' ? 'funding amounts' : 'deal counts'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={processedData.regionalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={selectedMetric === 'amount' ? formatCurrency : undefined} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" fill="#ff7c7c" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Top Companies */}
        {processedData.topCompanies.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Largest Funding Rounds</CardTitle>
              <CardDescription>Companies with the biggest recent funding rounds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {processedData.topCompanies.slice(0, 5).map((company, index) => (
                  <div key={company.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {company.stage}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {company.sector}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{formatCurrency(company.value)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(company.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DataVisualization;