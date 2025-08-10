import React, { useState, useEffect } from "react";
import AccountLayout from "@/components/AccountLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserData } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { 
  TrendingUp, 
  BookOpen, 
  Clock, 
  Target, 
  Award,
  BarChart3,
  Calendar,
  Bookmark,
  Eye,
  ArrowUp,
  ArrowDown,
  Flame,
  Star,
  ChevronRight,
  Download,
  RefreshCw,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const EnhancedDashboard = () => {
  const { user } = useAuth();
  const { 
    userStats, 
    savedArticles, 
    recentActivity, 
    preferences,
    loading,
    exportUserData 
  } = useUserData();

  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for charts (in production, this would come from real analytics)
  const readingTrendData = [
    { day: "Mon", articles: 4 },
    { day: "Tue", articles: 6 },
    { day: "Wed", articles: 3 },
    { day: "Thu", articles: 8 },
    { day: "Fri", articles: 5 },
    { day: "Sat", articles: 2 },
    { day: "Sun", articles: 3 },
  ];

  const categoryDistribution = [
    { name: "Startups", value: 35, color: "#3B82F6" },
    { name: "Funding", value: 25, color: "#8B5CF6" },
    { name: "Technology", value: 20, color: "#10B981" },
    { name: "Growth", value: 15, color: "#F59E0B" },
    { name: "Other", value: 5, color: "#6B7280" },
  ];

  const topStartups = [
    { name: "OpenAI", articles: 12, trend: "up", change: 23 },
    { name: "Stripe", articles: 8, trend: "up", change: 15 },
    { name: "SpaceX", articles: 7, trend: "down", change: -5 },
    { name: "Canva", articles: 6, trend: "up", change: 10 },
    { name: "Databricks", articles: 5, trend: "stable", change: 0 },
  ];

  const readingGoals = {
    daily: { target: 5, current: 3, percentage: 60 },
    weekly: { target: 30, current: userStats?.articlesThisWeek || 0, percentage: ((userStats?.articlesThisWeek || 0) / 30) * 100 },
    monthly: { target: 100, current: userStats?.articlesThisMonth || 0, percentage: ((userStats?.articlesThisMonth || 0) / 100) * 100 },
  };

  const achievements = [
    { id: 1, name: "Early Bird", description: "Read 5 articles before 9 AM", earned: true, icon: "🌅" },
    { id: 2, name: "Week Warrior", description: "Read every day for a week", earned: true, icon: "⚔️" },
    { id: 3, name: "Funding Expert", description: "Read 50 funding articles", earned: false, icon: "💰", progress: 35 },
    { id: 4, name: "Speed Reader", description: "Read 10 articles in one day", earned: false, icon: "⚡", progress: 7 },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  if (loading) {
    return (
      <AccountLayout title="Dashboard" description="Loading your personalized dashboard...">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-20 bg-gray-200" />
              <CardContent className="h-32 bg-gray-100" />
            </Card>
          ))}
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout 
      title="Dashboard" 
      description="Your personalized startup intelligence hub"
    >
      {/* Quick Actions Bar */}
      <div className="mb-6 flex flex-wrap gap-3">
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
        <Button variant="outline" size="sm" onClick={exportUserData}>
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
        <div className="ml-auto flex gap-2">
          <Button 
            variant={timeRange === "week" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("week")}
          >
            Week
          </Button>
          <Button 
            variant={timeRange === "month" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("month")}
          >
            Month
          </Button>
          <Button 
            variant={timeRange === "year" ? "default" : "outline"} 
            size="sm"
            onClick={() => setTimeRange("year")}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Articles Read</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{userStats?.totalArticlesRead || 0}</span>
              <Badge variant="secondary" className="ml-2">
                <ArrowUp className="w-3 h-3 mr-1" />
                12%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {userStats?.articlesThisWeek || 0} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Time Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{userStats?.totalTimeSpent || 0}m</span>
              <Badge variant="secondary" className="ml-2">
                <ArrowUp className="w-3 h-3 mr-1" />
                8%
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Avg 4.5 min/article
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Saved Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{userStats?.savedArticlesCount || 0}</span>
              <Link to="/account/saves">
                <Button variant="ghost" size="sm">
                  View
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {userStats?.collectionsCount || 0} collections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Reading Streak</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold flex items-center">
                {userStats?.readingStreak || 0}
                <Flame className="w-5 h-5 ml-1 text-orange-500" />
              </span>
              <Badge variant="secondary">Days</Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Personal best: 14 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Reading Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Reading Trend</CardTitle>
                <CardDescription>Your reading activity over the past week</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={readingTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="articles" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Reading Interests</CardTitle>
                <CardDescription>Distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Startups You Follow */}
          <Card>
            <CardHeader>
              <CardTitle>Top Startups You Follow</CardTitle>
              <CardDescription>Based on your reading activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStartups.map((startup, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <div>
                        <p className="font-medium">{startup.name}</p>
                        <p className="text-sm text-gray-500">{startup.articles} articles read</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {startup.trend === "up" && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          <ArrowUp className="w-3 h-3 mr-1" />
                          {startup.change}%
                        </Badge>
                      )}
                      {startup.trend === "down" && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          <ArrowDown className="w-3 h-3 mr-1" />
                          {Math.abs(startup.change)}%
                        </Badge>
                      )}
                      {startup.trend === "stable" && (
                        <Badge variant="secondary">Stable</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Reading Heatmap</CardTitle>
                <CardDescription>Your most active reading times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }, (_, i) => {
                    const intensity = Math.random();
                    return (
                      <div
                        key={i}
                        className="aspect-square rounded"
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                        }}
                        title={`${Math.round(intensity * 10)} articles`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>5 weeks ago</span>
                  <span>Today</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Reading Hours</CardTitle>
                <CardDescription>When you're most active</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { hour: "6AM", reads: 2 },
                    { hour: "9AM", reads: 8 },
                    { hour: "12PM", reads: 5 },
                    { hour: "3PM", reads: 7 },
                    { hour: "6PM", reads: 10 },
                    { hour: "9PM", reads: 6 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="reads" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Content Velocity</CardTitle>
              <CardDescription>How quickly you consume different types of content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">News Articles</span>
                    <span className="text-sm font-medium">3.2 min avg</span>
                  </div>
                  <Progress value={75} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Deep Dives</span>
                    <span className="text-sm font-medium">8.5 min avg</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Funding Reports</span>
                    <span className="text-sm font-medium">5.1 min avg</span>
                  </div>
                  <Progress value={60} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="w-5 h-5 mr-2" />
                  Daily Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {readingGoals.daily.current}/{readingGoals.daily.target}
                    </span>
                  </div>
                  <Progress value={readingGoals.daily.percentage} className="h-3" />
                  <p className="text-xs text-gray-500">
                    {readingGoals.daily.target - readingGoals.daily.current} more to go!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Weekly Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {readingGoals.weekly.current}/{readingGoals.weekly.target}
                    </span>
                  </div>
                  <Progress value={readingGoals.weekly.percentage} className="h-3" />
                  <p className="text-xs text-gray-500">
                    {Math.max(0, readingGoals.weekly.target - readingGoals.weekly.current)} more to go!
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Monthly Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">
                      {readingGoals.monthly.current}/{readingGoals.monthly.target}
                    </span>
                  </div>
                  <Progress value={readingGoals.monthly.percentage} className="h-3" />
                  <p className="text-xs text-gray-500">
                    On track for this month!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Custom Goals</CardTitle>
              <CardDescription>Set your own reading targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Create personalized reading goals</p>
                <Button>
                  <Target className="w-4 h-4 mr-2" />
                  Create New Goal
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Achievements Tab */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <Card 
                key={achievement.id} 
                className={achievement.earned ? "border-green-200 bg-green-50" : ""}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-4">
                    <div className="text-3xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold flex items-center">
                        {achievement.name}
                        {achievement.earned && (
                          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700">
                            Earned
                          </Badge>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{achievement.description}</p>
                      {!achievement.earned && achievement.progress && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}/50</span>
                          </div>
                          <Progress value={(achievement.progress / 50) * 100} className="h-2" />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard Position</CardTitle>
              <CardDescription>How you rank among other readers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-4xl font-bold mb-2">#42</div>
                <p className="text-gray-600">out of 1,234 active readers</p>
                <Badge className="mt-3">Top 5%</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Activity Quick View */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest reading history</CardDescription>
            </div>
            <Link to="/account/recent">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{activity.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.viewedAt).toLocaleDateString()} • {Math.round(activity.timeSpent / 60)} min read
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {activity.category}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </AccountLayout>
  );
};

export default EnhancedDashboard;