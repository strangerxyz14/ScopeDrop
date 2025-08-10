import React, { useMemo } from "react";
import { Header } from "@/components/Header/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { 
  Home, 
  FileText, 
  Newspaper, 
  DollarSign, 
  Code, 
  TrendingUp, 
  Search, 
  Mail, 
  Calendar, 
  Monitor,
  User,
  Bookmark,
  Settings,
  Clock,
  LogOut,
  Sparkles,
  Cpu,
  Users,
  BookOpen,
  Lightbulb,
  Info,
  Shield,
  Send,
  Phone,
  Map,
  ChevronRight
} from "lucide-react";

interface RouteCategory {
  title: string;
  icon: React.ReactNode;
  routes: {
    path: string;
    label: string;
    description: string;
    icon?: React.ReactNode;
  }[];
}

const Sitemap = () => {
  // Dynamically organize all routes by category
  const routeCategories: RouteCategory[] = useMemo(() => [
    {
      title: "Main Pages",
      icon: <Home className="w-5 h-5" />,
      routes: [
        { 
          path: "/", 
          label: "Home", 
          description: "Main landing page with latest startup news and funding updates",
          icon: <Home className="w-4 h-4" />
        },
        { 
          path: "/search", 
          label: "Search", 
          description: "Search for startups, news, and funding information",
          icon: <Search className="w-4 h-4" />
        },
        { 
          path: "/newsletter", 
          label: "Newsletter", 
          description: "Subscribe to our weekly startup insights newsletter",
          icon: <Mail className="w-4 h-4" />
        },
        { 
          path: "/events", 
          label: "Events", 
          description: "Upcoming startup events, conferences, and meetups",
          icon: <Calendar className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Startup & Funding",
      icon: <DollarSign className="w-5 h-5" />,
      routes: [
        { 
          path: "/startups/news", 
          label: "Startup News", 
          description: "Latest news and updates from the startup ecosystem",
          icon: <Newspaper className="w-4 h-4" />
        },
        { 
          path: "/funding/rounds", 
          label: "Funding Rounds", 
          description: "Recent funding rounds and investment announcements",
          icon: <DollarSign className="w-4 h-4" />
        },
        { 
          path: "/funding/big-stories", 
          label: "Big Funding Stories", 
          description: "Major funding rounds and unicorn announcements",
          icon: <Sparkles className="w-4 h-4" />
        },
        { 
          path: "/founder-spotlights", 
          label: "Founder Spotlights", 
          description: "Interviews and profiles of successful founders",
          icon: <Users className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Technology & Growth",
      icon: <Code className="w-5 h-5" />,
      routes: [
        { 
          path: "/tech/tech-stacks", 
          label: "Tech Stacks", 
          description: "Technology stacks used by successful startups",
          icon: <Code className="w-4 h-4" />
        },
        { 
          path: "/tech/growth-hacking", 
          label: "Growth Hacking", 
          description: "Growth strategies and marketing tactics",
          icon: <TrendingUp className="w-4 h-4" />
        },
        { 
          path: "/tech/emerging", 
          label: "Emerging Tech", 
          description: "Latest emerging technologies and innovations",
          icon: <Cpu className="w-4 h-4" />
        },
        { 
          path: "/case-studies", 
          label: "Case Studies", 
          description: "In-depth analysis of successful startup strategies",
          icon: <BookOpen className="w-4 h-4" />
        },
        { 
          path: "/growth-strategies", 
          label: "Growth Strategies", 
          description: "Proven strategies for scaling your startup",
          icon: <Lightbulb className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Account Management",
      icon: <User className="w-5 h-5" />,
      routes: [
        { 
          path: "/account/dashboard", 
          label: "Dashboard", 
          description: "Your personalized startup tracking dashboard",
          icon: <Monitor className="w-4 h-4" />
        },
        { 
          path: "/account/saves", 
          label: "Saved Articles", 
          description: "Articles and content you've saved for later",
          icon: <Bookmark className="w-4 h-4" />
        },
        { 
          path: "/account/emails", 
          label: "Email Preferences", 
          description: "Manage your newsletter and notification settings",
          icon: <Mail className="w-4 h-4" />
        },
        { 
          path: "/account/recent", 
          label: "Recently Viewed", 
          description: "Your recently viewed articles and content",
          icon: <Clock className="w-4 h-4" />
        },
        { 
          path: "/account/settings", 
          label: "Settings", 
          description: "Account settings and preferences",
          icon: <Settings className="w-4 h-4" />
        },
        { 
          path: "/signout", 
          label: "Sign Out", 
          description: "Sign out of your account",
          icon: <LogOut className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Resources",
      icon: <FileText className="w-5 h-5" />,
      routes: [
        { 
          path: "/blog", 
          label: "Blog", 
          description: "Insights and articles from our team",
          icon: <FileText className="w-4 h-4" />
        },
        { 
          path: "/how-we-curate", 
          label: "How We Curate", 
          description: "Our content curation process and methodology",
          icon: <Info className="w-4 h-4" />
        },
        { 
          path: "/api-access", 
          label: "API Access", 
          description: "Developer API for accessing our startup data",
          icon: <Code className="w-4 h-4" />
        },
        { 
          path: "/startup-submission", 
          label: "Submit Your Startup", 
          description: "Submit your startup to be featured",
          icon: <Send className="w-4 h-4" />
        },
        { 
          path: "/contact", 
          label: "Contact Us", 
          description: "Get in touch with our team",
          icon: <Phone className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Legal & Policies",
      icon: <Shield className="w-5 h-5" />,
      routes: [
        { 
          path: "/privacy-policy", 
          label: "Privacy Policy", 
          description: "How we collect, use, and protect your data",
          icon: <Shield className="w-4 h-4" />
        },
        { 
          path: "/terms", 
          label: "Terms of Service", 
          description: "Terms and conditions for using our service",
          icon: <FileText className="w-4 h-4" />
        },
        { 
          path: "/sitemap", 
          label: "Sitemap", 
          description: "Complete overview of all pages on our site",
          icon: <Map className="w-4 h-4" />
        },
      ]
    },
    {
      title: "Admin",
      icon: <Monitor className="w-5 h-5" />,
      routes: [
        { 
          path: "/admin/monitoring", 
          label: "Error Monitoring", 
          description: "System monitoring and error tracking dashboard",
          icon: <Monitor className="w-4 h-4" />
        },
      ]
    },
  ], []);

  // Calculate total number of pages
  const totalPages = useMemo(() => {
    return routeCategories.reduce((total, category) => total + category.routes.length, 0);
  }, [routeCategories]);

  return (
    <>
      <SEO
        title="Sitemap - ScopeDrop"
        description="Navigate through all pages and sections of ScopeDrop. Find startup news, funding rounds, tech stacks, growth strategies, and more."
        keywords={["sitemap", "site map", "navigation", "all pages", "site structure", "website map"]}
        canonical="/sitemap"
      />
      
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <Header />
        
        <main className="container mx-auto px-4 py-12 max-w-6xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Map className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Sitemap</h1>
            <p className="text-lg text-gray-600 mb-2">
              Explore all {totalPages} pages and sections of ScopeDrop
            </p>
            <p className="text-sm text-gray-500">
              Find the content you're looking for quickly and easily
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 text-center bg-blue-50 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{routeCategories[0].routes.length}</div>
              <div className="text-sm text-gray-600">Main Pages</div>
            </Card>
            <Card className="p-4 text-center bg-purple-50 border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{routeCategories[1].routes.length}</div>
              <div className="text-sm text-gray-600">Startup Pages</div>
            </Card>
            <Card className="p-4 text-center bg-green-50 border-green-200">
              <div className="text-2xl font-bold text-green-600">{routeCategories[2].routes.length}</div>
              <div className="text-sm text-gray-600">Tech Pages</div>
            </Card>
            <Card className="p-4 text-center bg-orange-50 border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{totalPages}</div>
              <div className="text-sm text-gray-600">Total Pages</div>
            </Card>
          </div>

          {/* Search Tip */}
          <Card className="mb-8 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center">
              <Search className="w-5 h-5 text-blue-600 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-700">
                  <strong>Tip:</strong> Use your browser's search function (Ctrl+F or Cmd+F) to quickly find specific pages or content.
                </p>
              </div>
            </div>
          </Card>

          {/* Route Categories */}
          <div className="space-y-8">
            {routeCategories.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{category.title}</h2>
                    <p className="text-sm text-gray-500">{category.routes.length} pages</p>
                  </div>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {category.routes.map((route, routeIndex) => (
                    <Link
                      key={routeIndex}
                      to={route.path}
                      className="group flex items-start p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                    >
                      <div className="flex-shrink-0 mr-3 mt-1">
                        {route.icon || <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />}
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {route.label}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          {route.description}
                        </div>
                        <div className="text-xs text-gray-400 mt-2 font-mono">
                          {route.path}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* XML Sitemap Notice */}
          <Card className="mt-8 p-6 bg-gray-50 border-gray-200">
            <div className="flex items-start">
              <Code className="w-5 h-5 text-gray-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">For Search Engines</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Looking for our XML sitemap for search engine crawlers? You can find it at:
                </p>
                <a 
                  href="/sitemap.xml" 
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /sitemap.xml
                  <ChevronRight className="w-3 h-3 ml-1" />
                </a>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <div className="mt-12 text-center">
            <h3 className="text-lg font-semibold mb-4">Can't Find What You're Looking For?</h3>
            <p className="text-gray-600 mb-6">
              If you're having trouble finding specific content, our search feature or contact page can help.
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="/search"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Search className="w-4 h-4 mr-2" />
                Go to Search
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                Contact Us
              </Link>
            </div>
          </div>

          {/* Last Updated */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>This sitemap is automatically generated and updated when new pages are added.</p>
            <p className="mt-1">Last updated: {new Date().toLocaleDateString()}</p>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default Sitemap;