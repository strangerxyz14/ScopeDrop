import { 
  TrendingUp, 
  Brain, 
  Merge, 
  User, 
  Code, 
  Calendar, 
  BarChart3, 
  Building2 
} from 'lucide-react';

export const PRIMARY_NAV = [
  {
    label: "Funding",
    path: "/funding",
    icon: TrendingUp,
    badge: "Hot", // Real-time funding alerts
    priority: "high"
  },
  {
    label: "AI Trends", 
    path: "/ai-trends",
    icon: Brain,
    badge: "Live", // AI market movements
    priority: "high"
  },
  {
    label: "Acquisitions",
    path: "/acquisitions",
    icon: Merge,
    badge: "New", // Recent deals
    priority: "high"
  },
  {
    label: "Founder Stories",
    path: "/founders",
    icon: User,
    priority: "medium"
  },
  {
    label: "Tech Stacks",
    path: "/tech-stacks", 
    icon: Code,
    priority: "medium"
  }
];

export const SECONDARY_NAV = [
  {
    label: "Events",
    path: "/events",
    icon: Calendar,
    submenu: [
      { label: "Upcoming", path: "/events/upcoming" },
      { label: "Past Events", path: "/events/past" },
      { label: "Submit Event", path: "/events/submit" }
    ]
  },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    submenu: [
      { label: "Market Analysis", path: "/reports/market" },
      { label: "Funding Reports", path: "/reports/funding" },
      { label: "AI Index", path: "/reports/ai-index" }
    ]
  },
  {
    label: "Directory",
    path: "/directory",
    icon: Building2,
    submenu: [
      { label: "Startups", path: "/directory/startups" },
      { label: "Investors", path: "/directory/investors" },
      { label: "Companies", path: "/directory/companies" }
    ]
  }
];

export const MOBILE_MENU = {
  sections: [
    {
      title: "Primary",
      items: PRIMARY_NAV
    },
    {
      title: "Resources", 
      items: SECONDARY_NAV
    },
    {
      title: "Quick Actions",
      items: [
        { label: "Search", icon: "Search", path: "/search" },
        { label: "Dark Mode", icon: "Moon", path: "/settings" },
        { label: "Profile", icon: "User", path: "/profile" }
      ]
    }
  ]
};